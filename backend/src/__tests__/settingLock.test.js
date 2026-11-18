/*
 * @name settingLock Tests
 * @file /docman/backend/src/__tests__/settingLock.test.js
 * @description Cross-process lock used for the last-superadmin guard.
 * @version 3.0.0
 * @license UNLICENSED
 */
const mockRows = new Map();
jest.mock('../models/SystemSetting.js', () => ({ __esModule: true, default: {
    findOneAndUpdate: jest.fn(async (filter, update) => {
        const row = mockRows.get(filter.key);
        const free = !row || !row.value?.holder || row.value.expiresAt < filter.$or[1]['value.expiresAt'].$lt;
        if (!free) throw Object.assign(new Error('duplicate key'), { code: 11000 });
        const next = { key: filter.key, value: update.$set.value };
        mockRows.set(filter.key, next);
        return next;
    }),
    updateOne: jest.fn(async (filter, update) => {
        const row = mockRows.get(filter.key);
        if (row && row.value?.holder === filter['value.holder']) row.value = update.$set.value;
    }),
} }));

import { withSettingLock, LockBusyError } from '../lib/settingLock.js';

beforeEach(() => mockRows.clear());

test('serializes overlapping holders and releases afterwards', async () => {
    let release;
    const first = withSettingLock('k', () => new Promise(resolve => { release = resolve; }));
    await new Promise(setImmediate);
    await expect(withSettingLock('k', async () => 'second')).rejects.toBeInstanceOf(LockBusyError);
    release('first');
    await expect(first).resolves.toBe('first');
    await expect(withSettingLock('k', async () => 'third')).resolves.toBe('third');
});

test('releases the lock when the work throws', async () => {
    await expect(withSettingLock('k', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    await expect(withSettingLock('k', async () => 'ok')).resolves.toBe('ok');
});

test('an expired lock from a crashed holder can be taken over', async () => {
    mockRows.set('k', { key: 'k', value: { holder: 'dead', expiresAt: new Date(Date.now() - 1000) } });
    await expect(withSettingLock('k', async () => 'ok')).resolves.toBe('ok');
});
