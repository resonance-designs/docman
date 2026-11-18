/*
 * @name documentUpload Tests
 * @file /docman/backend/src/__tests__/documentUpload.test.js
 * @description Streaming upload engine: no plaintext on disk, checksums, size limit from settings, fail-closed.
 * @version 2.3.0
 * @license UNLICENSED
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import express from 'express';
import request from 'supertest';

// The global test setup mocks multer and parts of fs; this suite needs the real ones.
jest.unmock('multer');
jest.unmock('fs');

const mockSettings = { value: null };
jest.mock('../services/storageSettingsService.js', () => ({
    __esModule: true,
    getStorageSettings: jest.fn(async () => mockSettings.value),
}));

import { documentUpload } from '../middleware/documentUpload.js';
import { createDecryptStream } from '../lib/storageEncryption.js';

const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docman-upload-'));
const app = express();
app.post('/upload', documentUpload('file'), (req, res) => res.json(req.file));
const plain = crypto.randomBytes(300_000);
const plainHash = crypto.createHash('sha256').update(plain).digest('hex');

beforeEach(() => {
    process.env.UPLOAD_DIR = uploadDir;
    process.env.DOCUMENT_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    mockSettings.value = { encryptAtRest: true, encryptionReady: true, maxUploadMB: 1 };
});

test('encrypted upload: plaintext never on disk, checksums recorded, decrypts to the original', async () => {
    const res = await request(app).post('/upload').attach('file', plain, { filename: 'policy.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    const stored = fs.readFileSync(res.body.path);
    expect(res.body.encrypted).toBe(true);
    expect(res.body.size).toBe(plain.length);
    expect(stored.includes(plain.subarray(5000, 5064))).toBe(false);
    expect(res.body.contentSha256).toBe(plainHash);
    expect(res.body.sha256).toBe(crypto.createHash('sha256').update(stored).digest('hex'));
    expect(fs.statSync(res.body.path).mode & 0o777).toBe(0o600);
    const parts = [];
    await pipeline(fs.createReadStream(res.body.path), createDecryptStream(res.body.fileId, res.body.protection), new Writable({ write(c, e, cb) { parts.push(c); cb(); } }));
    expect(Buffer.concat(parts)).toEqual(plain);
});

test('encryption off stores the file as uploaded', async () => {
    mockSettings.value = { encryptAtRest: false, encryptionReady: true, maxUploadMB: 1 };
    const res = await request(app).post('/upload').attach('file', plain, { filename: 'policy.pdf', contentType: 'application/pdf' });
    expect(res.body.encrypted).toBe(false);
    expect(fs.readFileSync(res.body.path)).toEqual(plain);
    expect(res.body.sha256).toBe(plainHash);
});

test('the configured maximum size is enforced and the partial file removed', async () => {
    const before = fs.readdirSync(uploadDir).length;
    const res = await request(app).post('/upload').attach('file', crypto.randomBytes(1_200_000), { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/1 MB/);
    expect(fs.readdirSync(uploadDir).length).toBe(before);
});

test('fails closed when encryption is required but the key is missing', async () => {
    mockSettings.value = { encryptAtRest: true, encryptionReady: false, maxUploadMB: 1 };
    const res = await request(app).post('/upload').attach('file', plain, { filename: 'policy.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(503);
});
