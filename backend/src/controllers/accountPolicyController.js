import SystemSetting from '../models/SystemSetting.js';
import { getAccountPolicy, validatePolicy } from '../services/accountPolicyService.js';
import { record, AUDIT_ACTIONS } from '../services/auditService.js';
export async function readPolicy(req, res) {
    try { res.set('Cache-Control', 'no-store'); res.json(await getAccountPolicy()); }
    catch { res.status(503).json({ message: 'Account settings unavailable.' }); }
}
export async function savePolicy(req, res) {
    try {
        const value = validatePolicy(req.body);
        await SystemSetting.findOneAndUpdate({ key: 'accounts.policy' }, { $set: { value, updatedBy: req.user.id } }, { upsert: true });
        await record(req, { action: AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE, resourceType: 'systemSetting', resourceId: 'accounts.policy', summary: 'Updated account password and registration policy', metadata: value });
        res.json(value);
    } catch (error) { res.status(error.statusCode || 503).json({ message: error.statusCode ? error.message : 'Could not save account settings.' }); }
}
