import { notificationHooks } from '../lib/notificationHooks.js';
import Notification from '../models/Notification.js';
jest.mock('../models/Notification.js', () => ({ __esModule: true, default: { updateOne: jest.fn() } }));
function harness(kind = 'User') {
    const hooks = { pre: {}, post: {} };
    const schema = { pre: (op, ...args) => { hooks.pre[op] = args.at(-1); }, post: (op, ...args) => { hooks.post[op] = args.at(-1); } };
    notificationHooks(schema, { kind }); return hooks;
}
beforeEach(() => Notification.updateOne.mockResolvedValue({}));

test('saved review assignment queues generic notice without a document-access dependency', async () => {
    const hooks = harness('ReviewAssignment');
    const assignment = { _id: 'assignment', document: 'private-document', assignee: 'reviewer', assignedBy: 'owner', status: 'pending' };
    await hooks.post.save({ constructor: {}, $locals: { notificationBefore: null }, toObject: () => assignment });
    const notices = Notification.updateOne.mock.calls.map(call => call[1].$setOnInsert);
    expect(notices.map(notice => notice.recipient).sort()).toEqual(['owner', 'reviewer']);
    expect(notices.every(notice => notice.emailStatus === 'pending' && !Object.hasOwn(notice, 'relatedDoc'))).toBe(true);
});
test('post-save writes an email-pending in-app event with stable deduplication key', async () => {
    const hooks = harness();
    const doc = { constructor: {}, $locals: { notificationBefore: { _id: 'u', role: 'viewer' } }, toObject: () => ({ _id: 'u', role: 'editor', updatedAt: new Date(0) }) };
    await hooks.post.save(doc); await hooks.post.save(doc);
    expect(Notification.updateOne).toHaveBeenCalledTimes(2);
    expect(Notification.updateOne.mock.calls[0][0]).toEqual(Notification.updateOne.mock.calls[1][0]);
    expect(Notification.updateOne.mock.calls[0][1].$setOnInsert).toMatchObject({ recipient: 'u', emailStatus: 'pending' });
    expect(Notification.updateOne.mock.calls[0][2].upsert).toBe(true);
});
test('unsuccessful compare-and-set mutation does not enqueue', async () => {
    const hooks = harness();
    await hooks.post.findOneAndUpdate.call({ notificationBefore: { _id: 'u' } }, null);
    await hooks.post.updateOne.call({ notificationBefore: { _id: 'u' } }, { matchedCount: 0 });
    expect(Notification.updateOne).not.toHaveBeenCalled();
});
test('queue failure is logged without making a committed business write appear failed', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    Notification.updateOne.mockRejectedValueOnce(new Error('private diagnostic'));
    const hooks = harness();
    await expect(hooks.post.save({ constructor: {}, $locals: { notificationBefore: { _id: 'u', role: 'viewer' } }, toObject: () => ({ _id: 'u', role: 'editor' }) })).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled(); expect(JSON.stringify(log.mock.calls)).not.toContain('private diagnostic');
});
