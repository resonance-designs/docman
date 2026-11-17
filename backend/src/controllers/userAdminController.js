import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { record, diffFields, AUDIT_ACTIONS } from '../services/auditService.js';

const fields = ['firstname', 'lastname', 'email', 'username', 'role', 'department', 'title', 'isActive', 'identityProvider', 'createdAt', 'updatedAt'];
const roles = ['viewer', 'editor', 'admin', 'superadmin'];
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const publicUser = user => Object.fromEntries(['_id', ...fields].map(key => [key, key === 'isActive' ? user[key] !== false : user[key]]));

export function validateAccount(body, creating = false) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('Account details are required.');
    const data = {};
    for (const field of ['firstname', 'lastname', 'email', 'username', 'department', 'title']) {
        if (body[field] === undefined && !creating) continue;
        const value = body[field] ?? '';
        if (typeof value !== 'string' || value.length > 254 || /[\x00-\x1f\x7f]/.test(value)) throw fail(`Invalid ${field}.`);
        data[field] = value.trim();
        if (['firstname', 'lastname', 'email', 'username'].includes(field) && !data[field]) throw fail(`${field} is required.`);
    }
    if (data.email !== undefined) {
        data.email = data.email.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw fail('Enter a valid email address.');
    }
    if (data.username !== undefined && !/^[a-zA-Z0-9_.-]{3,50}$/.test(data.username)) throw fail('Username must be 3–50 letters, numbers, dots, underscores, or hyphens.');
    if (body.role !== undefined || creating) {
        data.role = body.role ?? 'viewer';
        if (!roles.includes(data.role)) throw fail('Select a valid role.');
    }
    if (body.isActive !== undefined) {
        if (typeof body.isActive !== 'boolean') throw fail('Account status must be true or false.');
        data.isActive = body.isActive;
    }
    if (creating || body.password !== undefined) {
        const password = body.password;
        if (typeof password !== 'string' || [...password].length < 18 || Buffer.byteLength(password, 'utf8') > 72 || /[\x00-\x1f\x7f]/.test(password)) {
            throw fail('Password must be at least 18 characters and at most 72 UTF-8 bytes, without control characters.');
        }
        data.password = password;
    }
    return data;
}

function respondError(res, error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email or username is already in use.' });
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Account operation failed. Reload the list before retrying.' });
}

async function checkDuplicates(data, id) {
    const alternatives = ['email', 'username'].filter(key => data[key]).map(key => ({ [key]: { $regex: `^${escapeRegex(data[key])}$`, $options: 'i' } }));
    if (alternatives.length && await User.exists({ ...(id ? { _id: { $ne: id } } : {}), $or: alternatives })) throw fail('Email or username is already in use.', 409);
}

export async function listAccounts(req, res) {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const filter = {};
        if (typeof req.query.search === 'string' && req.query.search.trim()) {
            const search = escapeRegex(req.query.search.trim().slice(0, 100));
            filter.$or = ['firstname', 'lastname', 'email', 'username'].map(key => ({ [key]: { $regex: search, $options: 'i' } }));
        }
        const [users, total] = await Promise.all([
            User.find(filter).select(fields.join(' ')).sort({ lastname: 1, firstname: 1, _id: 1 }).skip((page - 1) * 25).limit(25).lean(),
            User.countDocuments(filter),
        ]);
        res.set('Cache-Control', 'no-store');
        res.json({ users: users.map(publicUser), page, pages: Math.max(1, Math.ceil(total / 25)), total });
    } catch (error) { respondError(res, error); }
}

export async function createAccount(req, res) {
    try {
        const data = validateAccount(req.body, true);
        // Canonicalize new usernames so concurrent case variants hit the unique index.
        data.username = data.username.toLowerCase();
        await checkDuplicates(data);
        const user = await User.create({ ...data, identityProvider: 'local', lastUpdatedBy: req.user.id });
        await record(req, { action: AUDIT_ACTIONS.USER_CREATE, resourceType: 'user', resourceId: user._id, summary: `Created account ${user.username}`, metadata: { role: user.role } });
        res.status(201).json({ user: publicUser(user) });
    } catch (error) { respondError(res, error); }
}

export async function editAccount(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) throw fail('Invalid account identifier.');
        const data = validateAccount(req.body);
        const before = await User.findById(req.params.id).lean();
        if (!before) throw fail('Account not found.', 404);
        // Existing superadmins cannot be demoted/disabled here. This also prevents
        // concurrent administrators from removing each other's final access.
        if (before.role === 'superadmin' && ((data.role && data.role !== 'superadmin') || data.isActive === false)) {
            throw fail('Superadmin accounts cannot be demoted or disabled through user management.');
        }
        if (String(before._id) === String(req.user.id) && data.password !== undefined) throw fail('Use another superadmin to reset your password.');
        if ((before.identityProvider === 'authentik' || before.authentikSub) && data.password !== undefined) throw fail('Manage this account’s password in its identity provider.');
        if (data.username !== undefined && data.username !== before.username) data.username = data.username.toLowerCase();
        await checkDuplicates(data, before._id);
        const passwordChanged = data.password !== undefined;
        if (passwordChanged) data.password = await bcrypt.hash(data.password, 12);
        const revoke = passwordChanged || (data.isActive !== undefined && data.isActive !== (before.isActive !== false));
        const update = { $set: { ...data, lastUpdatedBy: req.user.id }, $inc: { __v: 1, ...(revoke ? { sessionVersion: 1 } : {}) } };
        if (revoke) update.$unset = { refreshTokenHash: 1, resetPasswordToken: 1, resetPasswordExpires: 1 };
        const user = await User.findOneAndUpdate({ _id: before._id, __v: before.__v ?? 0 }, update, { new: true, runValidators: true });
        if (!user) throw fail('This account changed while saving. Reload and try again.', 409);
        await record(req, { action: passwordChanged ? AUDIT_ACTIONS.USER_PASSWORD_RESET : (data.role && data.role !== before.role ? AUDIT_ACTIONS.USER_ROLE_CHANGE : AUDIT_ACTIONS.USER_UPDATE), resourceType: 'user', resourceId: user._id,
            summary: `Updated account ${user.username}`, changes: diffFields(publicUser(before), publicUser(user), fields.filter(key => !['createdAt', 'updatedAt'].includes(key))), metadata: { passwordChanged } });
        res.json({ user: publicUser(user) });
    } catch (error) { respondError(res, error); }
}
