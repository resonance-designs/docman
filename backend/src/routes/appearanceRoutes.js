import express from 'express';
import { verifyAccessToken } from '../lib/secretToken.js';
import { requireRole } from '../middleware/requireRole.js';
import { record, AUDIT_ACTIONS } from '../services/auditService.js';
import { APPEARANCE_KEY, AppearanceInputError, appearanceDefaults, getAppearance, saveAppearance } from '../services/appearanceSettingsService.js';

const router = express.Router();
// Branding must be available on login and anonymous sharing pages. No private settings are returned.
router.get('/', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try { return res.json({ settings: await getAppearance(), defaults: appearanceDefaults() }); }
    catch { return res.status(503).json({ message: 'Could not load UI customization.' }); }
});
router.put('/', verifyAccessToken, requireRole('admin', 'superadmin'), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    let settings;
    try { settings = await saveAppearance(req.body, req.user?._id || req.user?.id || null); }
    catch (error) {
        return res.status(error instanceof AppearanceInputError ? 400 : 503)
            .json({ message: error instanceof AppearanceInputError ? error.message : 'Could not save UI customization.' });
    }
    // Report committed writes accurately if audit storage is temporarily unavailable.
    let auditRecorded = false;
    try {
        auditRecorded = Boolean(await record(req, {
            action: AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE,
            resourceType: 'systemSetting', resourceId: APPEARANCE_KEY,
            summary: 'Changed application UI customization',
            metadata: { menuPosition: settings.menuPosition, logoPresent: Boolean(settings.logo.dataUrl), footerEnabled: settings.footer.enabled },
        }));
    } catch { /* The settings write has already committed. */ }
    return res.json({ settings, defaults: appearanceDefaults(), committed: true, auditRecorded,
        ...(!auditRecorded ? { warning: 'Settings saved, but the audit entry could not be recorded. Contact the server operator.' } : {}) });
});
export default router;
