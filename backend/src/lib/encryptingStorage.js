/*
 * @name encryptingStorage
 * @file /docman/backend/src/lib/encryptingStorage.js
 * @description Multer storage engine for document files. Streams the upload straight to disk, encrypting on the
 *              way when encryption at rest is on, so plaintext never touches the disk. Records the plaintext size
 *              and SHA-256 (what users downloaded/uploaded) and the SHA-256 of the stored bytes (for integrity checks).
 *              Each stored file gets its File record id up front because the ciphertext is bound to it.
 * @version 2.3.0
 * @license UNLICENSED
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import mongoose from "mongoose";
import { createEncryptStream } from "./storageEncryption.js";
import { getUploadDir } from "./fileIntegrity.js";

function storedName(originalname) {
    const extension = path.extname(originalname || "").toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 12);
    return `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${extension}`;
}

function hashingTap(hash, counter) {
    return new Transform({
        transform(chunk, encoding, callback) {
            hash.update(chunk);
            if (counter) counter.bytes += chunk.length;
            callback(null, chunk);
        },
    });
}

/**
 * @param {Object} options
 * @param {boolean} options.encrypt - Encrypt file contents at rest
 */
export function encryptingStorage({ encrypt }) {
    return {
        _handleFile(req, file, callback) {
            const directory = getUploadDir();
            fs.mkdirSync(directory, { recursive: true });
            const fileId = new mongoose.Types.ObjectId();
            const filename = storedName(file.originalname);
            const destination = path.join(directory, filename);
            const plainHash = crypto.createHash("sha256");
            const storedHash = crypto.createHash("sha256");
            const counter = { bytes: 0 };
            let encryption = null;
            try {
                encryption = encrypt ? createEncryptStream(fileId) : null;
            } catch (error) {
                file.stream.resume();
                return callback(error);
            }
            const stages = [
                file.stream,
                hashingTap(plainHash, counter),
                ...(encryption ? [encryption.stream] : []),
                hashingTap(storedHash),
                fs.createWriteStream(destination, { flags: "wx", mode: 0o600 }),
            ];
            pipeline(stages)
                .then(() => callback(null, {
                    destination: directory,
                    filename,
                    path: destination,
                    size: counter.bytes,
                    fileId: String(fileId),
                    encrypted: Boolean(encryption),
                    protection: encryption ? encryption.protection : null,
                    contentSha256: plainHash.digest("hex"),
                    sha256: storedHash.digest("hex"),
                }))
                .catch((error) => fs.unlink(destination, () => callback(error)));
            return undefined;
        },
        _removeFile(req, file, callback) {
            if (!file?.path) return callback(null);
            return fs.unlink(file.path, () => callback(null));
        },
    };
}

export default encryptingStorage;
