/*
 * @name storageSettings Tests
 * @file /docman/backend/src/__tests__/storageSettings.test.js
 * @description Validation and defaults for encryption at rest and maximum upload size.
 * @version 2.3.0
 * @license UNLICENSED
 */
import crypto from 'node:crypto';

const mockRow = { value: null };
jest.mock('../models/SystemSetting.js', () => ({ __esModule: true, default: {
    findOne: jest.fn(() => ({ lean: async () => mockRow.value })),
    findOneAndUpdate: jest.fn(async (filter, update) => { mockRow.value = { key: filter.key, value: update.$set.value }; }),
} }));

import { getStorageSettings, validateStorageInput, saveStorageSettings, resetStorageSettingsCache } from '../services/storageSettingsService.js';

beforeEach(() => {
    mockRow.value = null;
    resetStorageSettingsCache();
    delete process.env.MAX_UPLOAD_MB_CEILING;
    process.env.DOCUMENT_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
});

test('defaults: 50 MB, encryption on when a key exists', async () => {
    await expect(getStorageSettings()).resolves.toMatchObject({ maxUploadMB: 50, encryptAtRest: true, encryptionReady: true, maxUploadCeilingMB: 250 });
});

test('defaults: encryption off when no key is configured', async () => {
    delete process.env.DOCUMENT_ENCRYPTION_KEY;
    await expect(getStorageSettings()).resolves.toMatchObject({ encryptAtRest: false, encryptionReady: false });
});

test.each([
    [{ encryptAtRest: 'yes', maxUploadMB: 50 }, /true or false/],
    [{ encryptAtRest: true, maxUploadMB: 0 }, /between 1 and 250/],
    [{ encryptAtRest: true, maxUploadMB: 251 }, /between 1 and 250/],
    [{ encryptAtRest: true, maxUploadMB: 10.5 }, /whole number/],
])('rejects invalid input %o', (input, message) => {
    expect(() => validateStorageInput(input)).toThrow(message);
});

test('cannot require encryption without a key', () => {
    delete process.env.DOCUMENT_ENCRYPTION_KEY;
    expect(() => validateStorageInput({ encryptAtRest: true, maxUploadMB: 50 })).toThrow(/DOCUMENT_ENCRYPTION_KEY/);
});

test('the ceiling is configurable and saved values are applied', async () => {
    process.env.MAX_UPLOAD_MB_CEILING = '500';
    const saved = await saveStorageSettings({ encryptAtRest: true, maxUploadMB: 400 });
    expect(saved).toMatchObject({ maxUploadMB: 400, maxUploadCeilingMB: 500, saved: true });
});
