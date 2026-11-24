import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { getAccountPolicy, passwordError } from '../services/accountPolicyService.js';

const editable = ['firstname', 'lastname', 'telephone', 'title', 'department', 'bio'];
const publicFields = '_id firstname lastname username email telephone title department bio role identityProvider authentikSub';
const external = user => user.identityProvider === 'authentik' || Boolean(user.authentikSub);
const present = user => { const { authentikSub, ...profile } = user; return { ...profile, externallyManaged: external(user) }; };
export function validateProfile(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Profile details are required.');
    if (Object.keys(body).some(key => !editable.includes(key))) throw new Error('Only profile fields may be changed here.');
    const data = {};
    for (const [key, value] of Object.entries(body)) {
        const controls = key === 'bio' ? /[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/;
        if (typeof value !== 'string' || value.length > (key === 'bio' ? 500 : 254) || controls.test(value)) throw new Error(`Invalid ${key}.`);
        data[key] = value.trim();
        if (['firstname', 'lastname'].includes(key) && !data[key]) throw new Error('First and last name are required.');
    }
    return data;
}
export async function getAccount(req, res) {
    try {
        const user = await User.findById(req.user.id).select(publicFields).lean();
        if (!user) return res.status(404).json({ message: 'Account not found.' });
        return res.json({ user: present(user), policy: await getAccountPolicy() });
    } catch { return res.status(500).json({ message: 'Unable to load account.' }); }
}
export async function saveProfile(req, res) {
    let data;
    try { data = validateProfile(req.body); } catch (error) { return res.status(400).json({ message: error.message }); }
    try {
        const user = await User.findOneAndUpdate({ _id: req.user.id, isActive: { $ne: false }, identityProvider: { $ne: 'authentik' }, authentikSub: { $in: [null, ''] } },
            { $set: { ...data, lastUpdatedBy: req.user.id }, $inc: { __v: 1 } }, { new: true, runValidators: true }).select(publicFields).lean();
        if (!user) return res.status(403).json({ message: 'Manage an SSO profile in the identity provider.' });
        return res.json({ user: present(user) });
    } catch { return res.status(500).json({ message: 'Unable to save profile.' }); }
}
export async function changePassword(req, res) {
    try {
        const user = await User.findById(req.user.id).select('password identityProvider authentikSub isActive invitationPending').lean();
        if (!user || user.isActive === false || user.invitationPending || external(user)) return res.status(403).json({ message: 'Password changes are available only for active local accounts.' });
        if (typeof req.body.currentPassword !== 'string' || !await bcrypt.compare(req.body.currentPassword, user.password)) return res.status(400).json({ message: 'Current password is incorrect.' });
        const error = passwordError(req.body.password, await getAccountPolicy());
        if (error) return res.status(400).json({ message: error });
        const password = await bcrypt.hash(req.body.password, 12);
        const result = await User.updateOne({ _id: req.user.id, password: user.password, isActive: { $ne: false }, invitationPending: { $ne: true }, identityProvider: { $ne: 'authentik' }, authentikSub: { $in: [null, ''] } }, {
            $set: { password, lastUpdatedBy: req.user.id }, $inc: { sessionVersion: 1, __v: 1 },
            $unset: { refreshTokenHash: 1, resetPasswordToken: 1, resetPasswordExpires: 1 }
        });
        if (!result.matchedCount) return res.status(409).json({ message: 'Account changed. Sign in again before retrying.' });
        return res.json({ message: 'Password changed. Sign in again with your new password.' });
    } catch { return res.status(500).json({ message: 'Unable to change password.' }); }
}
