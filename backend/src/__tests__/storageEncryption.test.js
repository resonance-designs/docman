/*
 * @name storageEncryption Tests
 * @file /docman/backend/src/__tests__/storageEncryption.test.js
 * @description Chunked AES-256-GCM encryption at rest: round trips and tamper detection.
 * @version 3.0.0
 * @license UNLICENSED
 */
import crypto from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createEncryptStream, createDecryptStream, documentKeyReady, CHUNK_SIZE } from '../lib/storageEncryption.js';

const sink = () => { const parts = []; return { parts, stream: new Writable({ write(chunk, encoding, cb) { parts.push(Buffer.from(chunk)); cb(); } }) }; };

async function encrypt(plain, fileId = 'file1') {
    const { stream, protection } = createEncryptStream(fileId);
    const out = sink();
    const pieces = [];
    for (let i = 0; i < plain.length; i += 9999) pieces.push(plain.subarray(i, i + 9999));
    await pipeline(Readable.from(pieces.length ? pieces : [Buffer.alloc(0)]), stream, out.stream);
    return { cipher: Buffer.concat(out.parts), protection };
}

async function decrypt(cipher, protection, fileId = 'file1') {
    const out = sink();
    await pipeline(Readable.from([cipher]), createDecryptStream(fileId, protection), out.stream);
    return Buffer.concat(out.parts);
}

beforeEach(() => { process.env.DOCUMENT_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex'); });
afterAll(() => { delete process.env.DOCUMENT_ENCRYPTION_KEY; });

test('key readiness requires 64 hex characters', () => {
    expect(documentKeyReady()).toBe(true);
    process.env.DOCUMENT_ENCRYPTION_KEY = 'short';
    expect(documentKeyReady()).toBe(false);
});

test.each([0, 1, CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, 3 * CHUNK_SIZE, 1_000_003])('round trip of %i bytes', async (size) => {
    const plain = crypto.randomBytes(size);
    const { cipher, protection } = await encrypt(plain);
    expect(cipher.includes(plain.subarray(0, Math.min(64, size))) && size >= 64).toBe(false);
    await expect(decrypt(cipher, protection)).resolves.toEqual(plain);
    expect(protection).not.toHaveProperty('key');
});

describe('tampering is detected', () => {
    let cipher, protection;
    beforeEach(async () => { ({ cipher, protection } = await encrypt(crypto.randomBytes(200_000))); });

    test('bit flip', async () => {
        const bad = Buffer.from(cipher); bad[70_000] ^= 1;
        await expect(decrypt(bad, protection)).rejects.toThrow(/integrity/);
    });
    test('truncation at a chunk boundary', async () => {
        await expect(decrypt(cipher.subarray(0, 2 * (CHUNK_SIZE + 16)), protection)).rejects.toThrow(/integrity/);
    });
    test('truncation mid-chunk', async () => {
        await expect(decrypt(cipher.subarray(0, cipher.length - 5), protection)).rejects.toThrow(/integrity/);
    });
    test('extension', async () => {
        await expect(decrypt(Buffer.concat([cipher, cipher.subarray(0, 100)]), protection)).rejects.toThrow(/integrity/);
    });
    test('chunk reordering', async () => {
        const size = CHUNK_SIZE + 16;
        const swapped = Buffer.concat([cipher.subarray(size, 2 * size), cipher.subarray(0, size), cipher.subarray(2 * size)]);
        await expect(decrypt(swapped, protection)).rejects.toThrow(/integrity/);
    });
    test('ciphertext moved to another file record', async () => {
        await expect(decrypt(cipher, protection, 'file2')).rejects.toThrow(/unwrapped/);
    });
    test('wrong master key', async () => {
        process.env.DOCUMENT_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        await expect(decrypt(cipher, protection)).rejects.toThrow(/unwrapped/);
    });
});
