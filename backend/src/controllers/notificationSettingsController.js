import Notification from '../models/Notification.js';
import SystemSetting from '../models/SystemSetting.js';
import { notificationSettings } from '../services/notificationDeliveryService.js';
import { record, AUDIT_ACTIONS } from '../services/auditService.js';
export async function readNotificationSettings(req, res) {
    try {
        const counts = await Notification.aggregate([{ $match: { emailStatus: { $exists: true } } }, { $group: { _id: '$emailStatus', count: { $sum: 1 } } }]);
        res.set('Cache-Control', 'no-store').json({ ...await notificationSettings(), counts: Object.fromEntries(counts.map(row => [row._id, row.count])) });
    } catch { res.status(503).json({ message: 'Notification status unavailable.' }); }
}
export async function saveNotificationSettings(req, res) {
    if (typeof req.body?.enabled !== 'boolean' || Object.keys(req.body).some(k => k !== 'enabled')) return res.status(400).json({ message: 'Choose whether email notifications are enabled.' });
    let committed = false;
    try {
        await SystemSetting.findOneAndUpdate({ key: 'notifications.email' }, { $set: { value: { enabled: req.body.enabled }, updatedBy: req.user.id } }, { upsert: true });
        committed = true;
        await record(req, { action: AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE, resourceType: 'systemSetting', resourceId: 'notifications.email', summary: 'Changed activity email delivery', metadata: { enabled: req.body.enabled } });
        res.json({ enabled: req.body.enabled });
    } catch {
        if (committed) return res.status(200).json({ enabled: req.body.enabled, committed: true, auditRecorded: false, message: 'Settings saved, but the audit entry failed. Contact an administrator; do not retry the change.' });
        res.status(503).json({ message: 'Could not save notification settings.' });
    }
}
export async function retryNotifications(req, res) {
    let queuedCount = null;
    try {
        const result = await Notification.updateMany({ emailStatus: 'failed' }, { $set: { emailStatus: 'pending', emailAttempts: 0, emailNextAttempt: new Date(), emailLastError: '' } });
        queuedCount = result.modifiedCount;
        await record(req, { action: AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE, resourceType: 'notifications', summary: 'Retried failed activity emails', metadata: { count: result.modifiedCount } });
        res.json({ message: `${result.modifiedCount} failed emails queued for retry.` });
    } catch {
        if (queuedCount !== null) return res.status(200).json({ committed: true, auditRecorded: false, queuedCount, message: `${queuedCount} failed emails queued, but the audit entry failed. Contact an administrator; do not retry this operation.` });
        res.status(503).json({ message: 'Could not retry failed emails.' });
    }
}
