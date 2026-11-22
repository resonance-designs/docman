import SystemSetting from '../models/SystemSetting.js';
import { getPublicSharingPolicy, PUBLIC_SHARING_KEY } from '../services/publicSharingPolicy.js';
import { record, AUDIT_ACTIONS } from '../services/auditService.js';
export async function readPublicSharingPolicy(req, res) {
    try { res.set('Cache-Control', 'no-store').json(await getPublicSharingPolicy()); }
    catch { res.status(503).json({ message: 'Public sharing settings unavailable.' }); }
}
export async function savePublicSharingPolicy(req, res) {
    const body = req.body;
    if (!body || typeof body.enabled !== 'boolean' || typeof body.disableExistingLinks !== 'boolean' || Object.keys(body).some(k => !['enabled', 'disableExistingLinks'].includes(k))) return res.status(400).json({ message: 'Both public sharing switches must be set.' });
    try {
        const value = { enabled: body.enabled, disableExistingLinks: body.disableExistingLinks };
        await SystemSetting.findOneAndUpdate({ key: PUBLIC_SHARING_KEY }, { $set: { value, updatedBy: req.user.id } }, { upsert: true });
        await record(req, { action: AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE, resourceType: 'systemSetting', resourceId: PUBLIC_SHARING_KEY, summary: 'Changed public document sharing policy', metadata: value });
        res.json(value);
    } catch { res.status(503).json({ message: 'Could not save public sharing settings.' }); }
}
