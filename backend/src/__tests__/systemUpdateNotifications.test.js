import { queueCompletedUpdate, releaseDetails, resumeUpdateNotifications } from '../services/systemUpdateNotifications.js';
import Notification from '../models/Notification.js';
import SystemSetting from '../models/SystemSetting.js';
import User from '../models/User.js';
jest.mock('../models/Notification.js', () => ({ __esModule: true, default: { updateOne: jest.fn(), exists: jest.fn() } }));
jest.mock('../models/SystemSetting.js', () => ({ __esModule: true, default: { findOneAndUpdate: jest.fn(), findOne: jest.fn(), find: jest.fn(), updateOne: jest.fn() } }));
jest.mock('../models/User.js', () => ({ __esModule: true, default: { find: jest.fn() } }));
const installed = { commit: 'a'.repeat(40), version: '3.1.1', changelog: '# Changelog\n\n## [3.1.1] - 2026-11-25\n### Added\n- Profile notices\n\n## [3.1.0]\n- Older feature' };
const state = { status: 'complete', tag: 'v3.1.1', commit: installed.commit, report: { run_id: '20261125T203310Z-example', target_commit: installed.commit } };
let receipt, notices;
beforeEach(() => {
    receipt = null; notices = new Map();
    SystemSetting.findOneAndUpdate.mockImplementation((filter, update) => ({ lean: async () => {
        receipt ||= { key: filter.key, value: update.$setOnInsert.value }; return receipt;
    } }));
    SystemSetting.updateOne.mockImplementation(async () => { receipt.value.complete = true; });
    User.find.mockReturnValue({ select: () => ({ lean: () => ({ cursor: async function* () { yield { _id: 'viewer' }; yield { _id: 'admin' }; } }) }) });
    Notification.updateOne.mockImplementation(async (filter, update) => { if (!notices.has(filter.eventKey)) notices.set(filter.eventKey, update.$setOnInsert); });
});
test('successful update queues all eligible roles with release details and a durable deduplication receipt', async () => {
    expect(await queueCompletedUpdate(state, installed)).toBe(true);
    expect([...notices.values()].map(n => n.recipient)).toEqual(['viewer', 'admin']);
    expect([...notices.values()][0]).toMatchObject({ type: 'system_updated', emailStatus: 'pending' });
    expect([...notices.values()][0].message).toContain('Profile notices');
    expect([...notices.values()][0].message).not.toContain('Older feature');
    const filter = User.find.mock.calls[0][0];
    expect(filter).toMatchObject({ isActive: { $ne: false }, invitationPending: { $ne: true } });
    expect(filter.createdAt.$lte).toBeInstanceOf(Date);
    await queueCompletedUpdate(state, installed);
    expect(Notification.updateOne).toHaveBeenCalledTimes(2);
});
test.each(['running', 'waiting', 'failed', 'recovery-required', 'interrupted'])('%s does not announce an update', async status => {
    expect(await queueCompletedUpdate({ ...state, status }, installed)).toBe(false);
    expect(SystemSetting.findOneAndUpdate).not.toHaveBeenCalled();
});
test.each([
    { commit: 'b'.repeat(40) }, { version: '3.1.2' }, { version: '3.2.0-rc.1' },
])('stale or mismatched installed release is not announced: %j', async change => {
    expect(await queueCompletedUpdate(state, { ...installed, ...change })).toBe(false);
    expect(User.find).not.toHaveBeenCalled();
});
test('partial queue failure retries with the same cutoff and per-user keys', async () => {
    Notification.updateOne.mockImplementationOnce(async (filter, update) => { notices.set(filter.eventKey, update.$setOnInsert); })
        .mockRejectedValueOnce(new Error('database unavailable'));
    await expect(queueCompletedUpdate(state, installed)).rejects.toThrow('database unavailable');
    expect(receipt.value.complete).toBe(false);
    const cutoff = receipt.value.cutoff;
    await queueCompletedUpdate(state, installed);
    expect(notices.size).toBe(2); expect(receipt.value.cutoff).toBe(cutoff);
    expect(receipt.value.complete).toBe(true);
});
test('concurrent receipt insertion recovers its existing record', async () => {
    await queueCompletedUpdate(state, installed);
    SystemSetting.findOneAndUpdate.mockReturnValueOnce({ lean: async () => { throw { code: 11000 }; } });
    SystemSetting.findOne.mockReturnValue({ lean: async () => receipt });
    expect(await queueCompletedUpdate(state, installed)).toBe(true);
});
test('incomplete receipt resumes even after the updater has moved on to another run', async () => {
    Notification.updateOne.mockRejectedValueOnce(new Error('temporary queue outage'));
    await expect(queueCompletedUpdate(state, installed)).rejects.toThrow('temporary queue outage');
    SystemSetting.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean: async () => [receipt] }) }) });
    await resumeUpdateNotifications();
    expect(receipt.value.complete).toBe(true);
    expect(notices.size).toBe(2);
});
test('release details are bounded plain text with an explicit missing-notes fallback', () => {
    expect(releaseDetails('3.1.1', installed.changelog)).toContain('Profile notices');
    expect(releaseDetails('9.0.0', installed.changelog)).toContain('did not include');
    expect(releaseDetails('3.1.1', `## [3.1.1]\n${'x'.repeat(13000)}`)).toContain('truncated');
});
