import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Doc from '../models/Doc.js';
import SystemSetting from '../models/SystemSetting.js';
import { sendEmail } from '../lib/emailService.js';
import { deliverOne, activityUrl } from '../services/notificationDeliveryService.js';
import { changeEvents } from '../services/notificationEvents.js';
jest.mock('../models/Notification.js', () => ({ __esModule: true, default: { findOneAndUpdate: jest.fn(), updateOne: jest.fn() } }));
jest.mock('../models/User.js', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('../models/Doc.js', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('../models/SystemSetting.js', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../lib/emailService.js', () => ({ sendEmail: jest.fn() }));
const item = { _id: 'n', recipient: '507f1f77bcf86cd799439011', title: 'Document updated', message: 'Private message not emailed', emailAttempts: 1 };
function queue(overrides = {}) { Notification.findOneAndUpdate.mockReturnValue({ select: async () => ({ ...item, ...overrides }) }); }
beforeEach(() => {
    process.env.APP_BASE_URL = 'https://docman.example.org';
    SystemSetting.findOne.mockReturnValue({ lean: async () => null });
    User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ _id: item.recipient, email: 'test@example.org', role: 'viewer', isActive: true }) }) });
    Notification.updateOne.mockResolvedValue({ matchedCount: 1 });
    sendEmail.mockResolvedValue({}); queue();
});
test('claims atomically with a lease, sends generic email and acknowledges only its claim', async () => {
    expect(await deliverOne()).toBe(true);
    const [filter, update] = Notification.findOneAndUpdate.mock.calls[0];
    expect(filter.$or[1].emailStatus).toBe('sending');
    expect(update.$set.emailLeaseUntil).toBeInstanceOf(Date);
    expect(update.$inc.emailAttempts).toBe(1);
    expect(sendEmail.mock.calls[0][2]).toContain('https://docman.example.org/notifications');
    expect(sendEmail.mock.calls[0][2]).not.toContain(item.message);
    expect(Notification.updateOne.mock.calls[0][0].emailClaim).toBe(update.$set.emailClaim);
    expect(Notification.updateOne.mock.calls[0][1].$set.emailStatus).toBe('sent');
});
test('pause leaves pending mail unclaimed', async () => {
    SystemSetting.findOne.mockReturnValue({ lean: async () => ({ value: { enabled: false } }) });
    expect(await deliverOne()).toBe(false); expect(Notification.findOneAndUpdate).not.toHaveBeenCalled();
});
test.each([1, 5])('delivery failure retries then exhausts after attempt %s', async emailAttempts => {
    queue({ emailAttempts }); sendEmail.mockRejectedValueOnce(new Error('sensitive SMTP diagnostic'));
    await deliverOne(); const values = Notification.updateOne.mock.calls[0][1].$set;
    expect(values.emailStatus).toBe(emailAttempts === 5 ? 'failed' : 'pending');
    expect(values.emailLastError).not.toContain('sensitive');
});
test('inactive recipients are skipped unless the event is an account-state notice', async () => {
    User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ email: 'test@example.org', isActive: false }) }) });
    await deliverOne(); expect(sendEmail).not.toHaveBeenCalled();
    queue({ allowInactiveEmail: true }); await deliverOne(); expect(sendEmail).toHaveBeenCalledTimes(1);
});
test('removed document access suppresses delayed document mail', async () => {
    queue({ relatedDoc: 'doc' }); Doc.findById.mockReturnValue({ lean: async () => ({ author: 'someone-else' }) });
    await deliverOne(); expect(sendEmail).not.toHaveBeenCalled();
    expect(Notification.updateOne.mock.calls[0][1].$set.emailStatus).toBe('skipped');
});
test('application URL is not taken from request data', () => { expect(activityUrl()).toBe('https://docman.example.org/notifications'); });

test('new review assignment notice reaches a reviewer without document access', async () => {
    const events = changeEvents('ReviewAssignment', null, {
        _id: 'assignment', document: 'private-document', assignee: item.recipient,
        assignedBy: 'owner', status: 'pending', notes: 'confidential review notes',
    });
    queue(events.find(event => event.recipient === item.recipient));
    await deliverOne();
    expect(Doc.findById).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][2]).toContain('Review assignment updated');
    expect(sendEmail.mock.calls[0][2]).not.toContain('private-document');
    expect(sendEmail.mock.calls[0][2]).not.toContain('confidential review notes');
    expect(Notification.updateOne.mock.calls[0][1].$set.emailStatus).toBe('sent');
});

test('generic assignment notices still respect inactive-recipient safeguards', async () => {
    queue({ title: 'Review assignment updated' });
    User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ isActive: false }) }) });
    await deliverOne();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(Notification.updateOne.mock.calls[0][1].$set.emailStatus).toBe('skipped');
});

test.each(['profile_updated', 'system_updated'])('%s emails contain the notice details', async type => {
    queue({ type, title: 'Safe notice', message: 'Details and next steps.' });
    await deliverOne();
    expect(sendEmail.mock.calls[0]).toEqual(expect.arrayContaining(['test@example.org', 'DocMan: Safe notice']));
    expect(sendEmail.mock.calls[0][2]).toContain('Details and next steps.');
});
