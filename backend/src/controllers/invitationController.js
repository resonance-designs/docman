import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { sendEmail } from '../lib/emailService.js';
import { getAccountPolicy, passwordError } from '../services/accountPolicyService.js';
import { record, AUDIT_ACTIONS } from '../services/auditService.js';
export const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');
export function invitationUrl(token) {
    const base = process.env.APP_BASE_URL || process.env.FRONTEND_URL;
    const url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error('Configure APP_BASE_URL with the public HTTPS application URL.');
    url.pathname = `${url.pathname.replace(/\/$/, '')}/accept-invitation`;
    url.search = ''; url.hash = new URLSearchParams({ token }).toString();
    return url.toString();
}
export async function deliverInvitation(user, req) {
    const token = crypto.randomBytes(32).toString('hex');
    const link = invitationUrl(token);
    const result = await User.updateOne({ _id: user._id, invitationPending: true, isActive: false }, { $set: { invitationTokenHash: tokenHash(token), invitationExpires: new Date(Date.now() + 24 * 3600000) } });
    if (!result.matchedCount) throw new Error('Account is no longer pending invitation.');
    await sendEmail(user.email, 'Your DocMan invitation', `You have been invited to DocMan. Set your password using this single-use link within 24 hours:\n\n${link}\n\nIf you did not expect this invitation, ignore this email.`);
    await record(req, { action: AUDIT_ACTIONS.USER_UPDATE, resourceType: 'user', resourceId: user._id, summary: 'Sent account invitation' });
}
export async function resendInvitation(req, res) {
    try {
        const user = await User.findOne({ _id: req.params.id, invitationPending: true, isActive: false, identityProvider: 'local' });
        if (!user) return res.status(400).json({ message: 'Account is not awaiting an invitation.' });
        await deliverInvitation(user, req);
        res.json({ message: 'Invitation sent. Previous links are invalid.' });
    } catch { res.status(502).json({ message: 'Invitation could not be sent. Check outgoing email settings and retry.' }); }
}
export async function acceptInvitation(req, res) {
    let activated = false;
    try {
        const { token, password } = req.body;
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'Invalid or expired invitation.' });
        const error = passwordError(password, await getAccountPolicy());
        if (error) return res.status(400).json({ message: error });
        const hashed = await bcrypt.hash(password, 12);
        // Atomic consume: only one concurrent request can activate this invitation.
        const user = await User.findOneAndUpdate({ invitationTokenHash: tokenHash(token), invitationExpires: { $gt: new Date() }, invitationPending: true, isActive: false, identityProvider: 'local' }, {
            $set: { password: hashed, invitationPending: false, isActive: true, emailVerifiedAt: new Date() },
            $unset: { invitationTokenHash: '', invitationExpires: '', resetPasswordToken: '', resetPasswordExpires: '', refreshTokenHash: '' }, $inc: { sessionVersion: 1, __v: 1 },
        }, { new: true });
        if (!user) return res.status(400).json({ message: 'Invalid or expired invitation.' });
        activated = true;
        const auditEntry = await record(req, { actorUser: user, action: AUDIT_ACTIONS.USER_UPDATE, resourceType: 'user', resourceId: user._id, summary: 'Accepted account invitation' });
        if (auditEntry === null) throw new Error('Audit append failed after activation.');
        res.json({ message: 'Account activated. You can now sign in.' });
    } catch {
        if (activated) return res.status(200).json({ activated: true, auditRecorded: false, message: 'Account activated, but the audit entry failed. Sign in with your new password; do not reuse this invitation. Contact an administrator about the audit failure.' });
        res.status(503).json({ message: 'Could not activate account. Try again or request a new invitation.' });
    }
}
