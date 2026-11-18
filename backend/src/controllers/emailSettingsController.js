import { readEmailSetting, publicEmailSetting, prepareEmailSetting, persistEmailSetting, validEmail } from '../services/emailSettingsService.js';
import { sendEmail } from '../lib/emailService.js';
import { record, AUDIT_ACTIONS } from '../services/auditService.js';
import { createRateLimiter } from '../config/redis.js';

const testLimiter = createRateLimiter(3, '1m');
function fail(res, error) {
    return res.status(error.statusCode || 503).json({ message: error.statusCode ? error.message : 'Email settings are unavailable. Check the database and audit services.' });
}
async function audit(req, summary, action = AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE, outcome = 'success') {
    const entry = await record(req, { action, resourceType: 'emailSettings', resourceId: 'outbound', summary, outcome });
    if (!entry) throw Object.assign(new Error('Email operation stopped because its audit record could not be saved.'), { statusCode: 503 });
}
export async function getEmailSettings(req, res) {
    res.set('Cache-Control', 'no-store');
    try { return res.json(publicEmailSetting(await readEmailSetting())); }
    catch (error) { return fail(res, error); }
}
export async function updateEmailSettings(req, res) {
    res.set('Cache-Control', 'no-store');
    let saved = false;
    try {
        const previous = await readEmailSetting();
        prepareEmailSetting(req.body, previous); // Validate before recording an attempt; never audit secret payloads.
        await audit(req, `Requested outbound email configuration change to ${req.body.provider}`);
        const row = await persistEmailSetting(req.body, previous, req.user.id);
        saved = true;
        await audit(req, `Saved outbound email configuration revision ${row.revision} using ${row.config.provider}`);
        return res.json({ ...publicEmailSetting(row), message: 'Email settings saved. Send a test email to verify delivery.' });
    } catch (error) {
        if (saved) return res.status(503).json({ message: 'Settings were saved, but the completion audit failed. Reload settings before retrying.' });
        return fail(res, error);
    }
}
export async function testEmailSettings(req, res) {
    res.set('Cache-Control', 'no-store');
    let accepted = false, attempted = false;
    try {
        if (!validEmail(req.body?.recipient) || Object.keys(req.body).some(key => key !== 'recipient')) return res.status(400).json({ message: 'Enter one valid test recipient email address.' });
        const limit = await testLimiter.limit(`email-test:${req.user.id}`);
        if (!limit.success) { res.set('Retry-After', '60'); return res.status(429).json({ message: 'Only three test emails per minute are allowed. Wait a minute and try again.' }); }
        await audit(req, 'Requested an outbound test email using saved settings', AUDIT_ACTIONS.EMAIL_TEST);
        attempted = true;
        await sendEmail(req.body.recipient, 'DocMan email configuration test', 'This test message confirms that the saved DocMan email settings can submit email. Receiving it confirms delivery to this mailbox.', '<p>This test message confirms that the saved DocMan email settings can submit email. Receiving it confirms delivery to this mailbox.</p>');
        accepted = true;
        await audit(req, 'Mail provider accepted the outbound test email', AUDIT_ACTIONS.EMAIL_TEST);
        return res.json({ message: 'Mail provider accepted the test email. Check the recipient inbox and junk folder to confirm delivery.' });
    } catch (error) {
        if (accepted) return res.status(503).json({ message: 'Mail provider accepted the test, but the completion audit failed. Check the inbox before sending another.' });
        if (attempted) {
            try { await audit(req, 'Outbound test email failed before provider acceptance', AUDIT_ACTIONS.EMAIL_TEST, 'failure'); } catch { /* The operation already failed; do not expose audit internals. */ }
        }
        return fail(res, error);
    }
}
