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
        const free = !row || !row.value?.holder || (filter.$or[1] && row.value.expiresAt < filter.$or[1]['value.expiresAt'].$lt);
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
import SystemSetting from '../models/SystemSetting.js';

beforeEach(() => mockRows.clear());

test('release retries retain the holder match and unblock the next writer', async () => {
    SystemSetting.updateOne.mockRejectedValueOnce(new Error('transient'));
    await withSettingLock('retry', async () => 'saved', { ttlMs: null });
    const calls = SystemSetting.updateOne.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toEqual(calls[1][0]);
    expect(mockRows.get('retry').value).toEqual({});
});

test('exhausted release reports retained guard without claiming committed work failed', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    for (let i = 0; i < 3; i++) SystemSetting.updateOne.mockRejectedValueOnce(new Error('offline'));
    await expect(withSettingLock('retained', async () => 'saved', { ttlMs: null })).resolves.toBe('saved');
    expect(log).toHaveBeenCalled();
    expect(mockRows.get('retained').value.holder).toBeTruthy();
});

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

test('non-expiring guards cannot be taken over by another non-expiring writer', async () => {
    mockRows.set('category', { value: { holder: 'slow-writer', expiresAt: new Date(0) } });
    await expect(withSettingLock('category', async () => 'unsafe', { ttlMs: null })).rejects.toBeInstanceOf(LockBusyError);
});
