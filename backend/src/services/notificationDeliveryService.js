import crypto from 'node:crypto';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';
import Doc from '../models/Doc.js';
import { sendEmail } from '../lib/emailService.js';
import { canReadDocument } from '../middleware/documentAccess.js';
import { documentPeople } from './notificationEvents.js';
export async function notificationSettings() {
    const row = await SystemSetting.findOne({ key: 'notifications.email' }).lean();
    return { enabled: row?.value?.enabled !== false };
}
export function activityUrl() {
    const url = new URL(process.env.APP_BASE_URL || process.env.FRONTEND_URL);
    if (!['https:', 'http:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error('Invalid application URL');
    url.pathname = `${url.pathname.replace(/\/$/, '')}/notifications`; url.search = ''; url.hash = '';
    return url.toString();
}
export async function deliverOne() {
    if (!(await notificationSettings()).enabled) return false;
    const claim = crypto.randomUUID(), now = new Date();
    const item = await Notification.findOneAndUpdate({ $or: [
        { emailStatus: 'pending', emailNextAttempt: { $lte: now } },
        { emailStatus: 'sending', emailLeaseUntil: { $lte: now } },
    ] }, { $set: { emailStatus: 'sending', emailClaim: claim, emailLeaseUntil: new Date(Date.now() + 120000) }, $inc: { emailAttempts: 1 } }, { new: true, sort: { createdAt: 1 } })
        .select('+emailStatus +emailAttempts +allowInactiveEmail');
    if (!item) return false;
    const finish = values => Notification.updateOne({ _id: item._id, emailClaim: claim, emailStatus: 'sending' }, { $set: values, $unset: { emailClaim: '', emailLeaseUntil: '' } });
    try {
        const user = await User.findById(item.recipient).select('email isActive invitationPending role').lean();
        if (!user || user.invitationPending || (user.isActive === false && !item.allowInactiveEmail)) { await finish({ emailStatus: 'skipped', emailLastError: 'Recipient unavailable' }); return true; }
        // Recheck access before mailing any resource-specific alert. Removal notices remain generic.
        if (item.relatedDoc && item.title !== 'Document assignments changed' && item.title !== 'Document deleted') {
            const doc = await Doc.findById(item.relatedDoc).lean();
            if (!doc || !canReadDocument(doc, { ...user, id: user._id })) { await finish({ emailStatus: 'skipped', emailLastError: 'Document access no longer available' }); return true; }
        }
        const detailed = ['profile_updated', 'system_updated'].includes(item.type);
        const details = detailed ? `\n\n${item.message}` : '';
        await sendEmail(user.email, detailed ? `DocMan: ${item.title}` : 'DocMan activity notification', `There is new activity affecting your DocMan account: ${item.title}.${details}\n\nSign in to review it: ${activityUrl()}\n\nThis email contains no document files or passwords.`);
        await finish({ emailStatus: 'sent', emailSentAt: new Date(), emailLastError: '' });
    } catch {
        await finish({ emailStatus: item.emailAttempts >= 5 ? 'failed' : 'pending', emailNextAttempt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** item.emailAttempts)), emailLastError: 'Delivery failed; check outgoing email, application URL, and connectivity.' });
    }
    return true;
}
export async function queueDueReviews() {
    const day = new Date().toISOString().slice(0, 10);
    const docs = await Doc.find({ reviewCompleted: false, reviewDueDate: { $lte: new Date(Date.now() + 86400000) } }).select('author owners approvers stakeholders reviewAssignees reviewDueDate').lean();
    for (const doc of docs) for (const recipient of documentPeople(doc)) {
        const eventKey = `review-due:${doc._id}:${recipient}:${new Date(doc.reviewDueDate).toISOString()}:${day}`;
        await Notification.updateOne({ eventKey }, { $setOnInsert: { eventKey, recipient, relatedDoc: doc._id, type: 'document_review_due', title: 'Document review due', message: 'A document review is due or overdue. Open the document for details.', emailStatus: 'pending', emailNextAttempt: new Date() } }, { upsert: true, setDefaultsOnInsert: true });
    }
}
export function startNotificationWorker() {
    let running = false, nextReviewScan = 0;
    const tick = async () => {
        if (running) return;
        running = true;
        try {
            if (Date.now() >= nextReviewScan) { await queueDueReviews(); nextReviewScan = Date.now() + 3600000; }
            for (let count = 0; count < 10 && await deliverOne(); count++) { /* bounded batch */ }
        } catch (error) { console.error('Notification worker failed:', error?.name || 'Error'); }
        finally { running = false; }
    };
    const timer = setInterval(tick, 15000); timer.unref(); void tick();
    return () => clearInterval(timer);
}
