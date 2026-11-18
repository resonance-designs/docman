/*
 * @name storageEncryption
 * @file /docman/backend/src/lib/storageEncryption.js
 * @description Transparent encryption at rest for stored document files.
 *
 * Design
 *  - Every file gets its own random 256-bit data key. The data key is wrapped (AES-256-GCM) with the server's
 *    DOCUMENT_ENCRYPTION_KEY and stored in the FileProtection collection, never shown to users.
 *  - File bytes are encrypted while the upload streams to disk, so plaintext never touches the disk.
 *  - Chunked AEAD ("STREAM" construction): the file is split into 64 KiB chunks, each sealed with AES-256-GCM.
 *    Nonce = 8-byte random prefix || 4-byte chunk counter. AAD binds the file id, the chunk index, and whether the
 *    chunk is the last one, so chunks cannot be reordered, swapped between files, truncated, or extended.
 *  - Decryption streams too: a chunk is released only after its own tag verifies, so memory use is constant
 *    regardless of file size. A tampered chunk aborts the download at that point.
 *
 * Ciphertext layout: chunk_0 || tag_0 || chunk_1 || tag_1 || ... || chunk_last || tag_last
 * (every chunk except the last holds exactly CHUNK_SIZE plaintext bytes; the last holds 0..CHUNK_SIZE bytes).
 * @version 3.0.0
 * @license UNLICENSED
 */
import crypto from "node:crypto";
import { Transform } from "node:stream";

export const FORMAT = "chunked-aes-256-gcm-v1";
export const CHUNK_SIZE = 64 * 1024;
const TAG_LENGTH = 16;
const MAX_CHUNKS = 0xffffffff;

export class StorageEncryptionError extends Error {
    constructor(message, statusCode = 503) {
        super(message);
        this.name = "StorageEncryptionError";
        this.statusCode = statusCode;
    }
}

/** True when a valid 32-byte hex master key is configured. */
export function documentKeyReady() {
    return /^[a-fA-F0-9]{64}$/.test(process.env.DOCUMENT_ENCRYPTION_KEY || "");
}

function masterKey() {
    if (!documentKeyReady()) {
        throw new StorageEncryptionError("Document encryption key (DOCUMENT_ENCRYPTION_KEY) is not configured on the server.");
    }
    return Buffer.from(process.env.DOCUMENT_ENCRYPTION_KEY, "hex");
}

function keyAad(fileId) {
    return Buffer.from(`docman:data-key:${FORMAT}:${fileId}`);
}

function chunkAad(fileId, index, final) {
    return Buffer.from(`docman:chunk:${FORMAT}:${fileId}:${index}:${final ? 1 : 0}`);
}

function chunkNonce(prefix, index) {
    if (index > MAX_CHUNKS) throw new StorageEncryptionError("File too large to encrypt.", 413);
    const nonce = Buffer.alloc(12);
    prefix.copy(nonce, 0);
    nonce.writeUInt32BE(index, 8);
    return nonce;
}

export function wrapDataKey(fileId, dataKey) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
    cipher.setAAD(keyAad(fileId));
    const wrapped = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    return [iv, cipher.getAuthTag(), wrapped].map((part) => part.toString("base64")).join(".");
}

export function unwrapDataKey(fileId, wrappedKey) {
    const key = masterKey();
    try {
        const [iv, tag, wrapped] = String(wrappedKey).split(".").map((part) => Buffer.from(part, "base64"));
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAAD(keyAad(fileId));
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(wrapped), decipher.final()]);
    } catch {
        throw new StorageEncryptionError("The stored data key cannot be unwrapped. Check that DOCUMENT_ENCRYPTION_KEY is the original key.");
    }
}

function sealChunk(dataKey, prefix, fileId, index, plaintext, final) {
    const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, chunkNonce(prefix, index));
    cipher.setAAD(chunkAad(fileId, index, final));
    return Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
}

function openChunk(dataKey, prefix, fileId, index, sealed, final) {
    if (sealed.length < TAG_LENGTH) throw new StorageEncryptionError("Encrypted file is truncated.", 409);
    const decipher = crypto.createDecipheriv("aes-256-gcm", dataKey, chunkNonce(prefix, index));
    decipher.setAAD(chunkAad(fileId, index, final));
    decipher.setAuthTag(sealed.subarray(sealed.length - TAG_LENGTH));
    try {
        return Buffer.concat([decipher.update(sealed.subarray(0, sealed.length - TAG_LENGTH)), decipher.final()]);
    } catch {
        throw new StorageEncryptionError("Encrypted file failed its integrity check.", 409);
    }
}

/**
 * Create an encrypting stream for a new file.
 * @param {string} fileId - Id of the File record this ciphertext belongs to
 * @returns {{ stream: Transform, protection: { format, chunkSize, noncePrefix, wrappedKey } }}
 */
export function createEncryptStream(fileId) {
    const id = String(fileId);
    const dataKey = crypto.randomBytes(32);
    const prefix = crypto.randomBytes(8);
    const protection = {
        format: FORMAT,
        chunkSize: CHUNK_SIZE,
        noncePrefix: prefix.toString("base64"),
        wrappedKey: wrapDataKey(id, dataKey),
    };
    let pending = Buffer.alloc(0);
    let index = 0;
    const stream = new Transform({
        transform(chunk, encoding, callback) {
            try {
                pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
                // Keep at least one byte (or a full chunk) back so the final chunk is always sealed as final.
                while (pending.length > CHUNK_SIZE) {
                    this.push(sealChunk(dataKey, prefix, id, index, pending.subarray(0, CHUNK_SIZE), false));
                    pending = pending.subarray(CHUNK_SIZE);
                    index += 1;
                }
                callback();
            } catch (error) {
                callback(error);
            }
        },
        flush(callback) {
            try {
                this.push(sealChunk(dataKey, prefix, id, index, pending, true));
                dataKey.fill(0);
                callback();
            } catch (error) {
                callback(error);
            }
        },
        destroy(error, callback) {
            dataKey.fill(0);
            callback(error);
        },
    });
    return { stream, protection };
}

/**
 * Create a decrypting stream for a stored file.
 * @param {string} fileId
 * @param {{ format, chunkSize, noncePrefix, wrappedKey }} protection
 */
export function createDecryptStream(fileId, protection) {
    if (!protection || protection.format !== FORMAT) {
        throw new StorageEncryptionError("Unsupported encryption format for this file.", 409);
    }
    const id = String(fileId);
    const chunkSize = Number(protection.chunkSize) || CHUNK_SIZE;
    const sealedSize = chunkSize + TAG_LENGTH;
    const prefix = Buffer.from(protection.noncePrefix, "base64");
    const dataKey = unwrapDataKey(id, protection.wrappedKey);
    let pending = Buffer.alloc(0);
    let index = 0;
    return new Transform({
        transform(chunk, encoding, callback) {
            try {
                pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
                while (pending.length > sealedSize) {
                    this.push(openChunk(dataKey, prefix, id, index, pending.subarray(0, sealedSize), false));
                    pending = pending.subarray(sealedSize);
                    index += 1;
                }
                callback();
            } catch (error) {
                dataKey.fill(0);
                callback(error);
            }
        },
        flush(callback) {
            try {
                this.push(openChunk(dataKey, prefix, id, index, pending, true));
                callback();
            } catch (error) {
                callback(error);
            } finally {
                dataKey.fill(0);
            }
        },
        destroy(error, callback) {
            dataKey.fill(0);
            callback(error);
        },
    });
}
