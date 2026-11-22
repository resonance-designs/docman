jest.mock('../controllers/invitationController.js', () => ({ deliverInvitation: jest.fn(), invitationUrl: jest.fn(), resendInvitation: jest.fn((req, res) => res.sendStatus(200)) }));
jest.mock('../services/accountPolicyService.js', () => ({ ...jest.requireActual('../services/accountPolicyService.js'), getAccountPolicy: jest.fn(async () => ({ minLength: 18, selfRegistrationEnabled: false })) }));
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateAccount } from '../controllers/userAdminController.js';
import User from '../models/User.js';
import { record } from '../services/auditService.js';
import router from '../routes/usersRoutes.js';
import { resolveLocalTokenIdentity, normalizeRequestUser } from '../services/identityService.js';
import BlacklistedToken from '../models/BlacklistedToken.js';
import { withSettingLock } from '../lib/settingLock.js';

jest.mock('../models/User.js', () => ({ __esModule: true, default: {
    exists: jest.fn(), create: jest.fn(), find: jest.fn(), countDocuments: jest.fn(), findById: jest.fn(), findOneAndUpdate: jest.fn(),
} }));
jest.mock('../models/BlacklistedToken.js', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../services/auditService.js', () => ({
    record: jest.fn(), AUDIT_ACTIONS: { USER_CREATE: 'user.create', USER_PASSWORD_RESET: 'user.password_reset', USER_ROLE_CHANGE: 'user.role_change', USER_UPDATE: 'user.update' }, diffFields: jest.fn(() => []),
}));
jest.mock('../lib/jwtSecret.js', () => ({ TOKEN_KEY: 'user-admin-test-key' }));
jest.mock('../lib/secretToken.js', () => ({
    verifyAccessToken: (req, res, next) => {
        if (!req.headers['x-test-role']) return res.sendStatus(401);
        req.user = { id: '507f1f77bcf86cd799439011', role: req.headers['x-test-role'] };
        next();
    },
}));
jest.mock('../lib/settingLock.js', () => ({ __esModule: true, withSettingLock: jest.fn(async (key, fn) => fn()) }));
jest.mock('../middleware/uploadMid.js', () => ({ __esModule: true, default: { single: () => (req, res, next) => next() } }));

const app = express(); app.use(express.json()); app.use('/api/users', router);
const id = '507f1f77bcf86cd799439012';
const password = 'A chosen password 123!';
const details = { firstname: 'Test', lastname: 'Person', email: 'TEST@example.org', username: 'TestUser', role: 'editor', password };
const account = { _id: id, __v: 0, ...details, email: 'test@example.org', username: 'testuser', identityProvider: 'local', isActive: true, sessionVersion: 0 };
const asAdmin = method => method.set('x-test-role', 'superadmin');

beforeEach(() => {
    User.exists.mockResolvedValue(null);
    User.findById.mockReturnValue({ lean: async () => ({ ...account }) });
    User.create.mockImplementation(async data => ({ ...data, _id: id, password: 'PRIVATE_HASH', isActive: true }));
    User.findOneAndUpdate.mockImplementation(async (filter, update) => ({ ...account, ...update.$set }));
    record.mockResolvedValue({});
});

test.each(['viewer', 'editor', 'admin'])('%s cannot list, create, or change managed accounts', async role => {
    expect((await request(app).get('/api/users/manage').set('x-test-role', role)).status).toBe(403);
    expect((await request(app).post('/api/users/manage').set('x-test-role', role).send(details)).status).toBe(403);
    expect((await request(app).patch(`/api/users/manage/${id}`).set('x-test-role', role).send({ role: 'superadmin' })).status).toBe(403);
    expect(User.create).not.toHaveBeenCalled();
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
});
test('anonymous account creation is denied', async () => {
    expect((await request(app).post('/api/users/manage').send(details)).status).toBe(401);
});
test('creates an inactive invited account without enabling registration or returning credentials', async () => {
    process.env.LOCAL_SELF_REGISTRATION_ENABLED = 'false';
    const res = await asAdmin(request(app).post('/api/users/manage')).send({ ...details, identityProvider: 'authentik', refreshTokenHash: 'injected' });
    expect(res.status).toBe(201);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.org', username: 'testuser', identityProvider: 'local', invitationPending: true, isActive: false, password: expect.any(String) }));
    expect(User.create.mock.calls[0][0]).not.toHaveProperty('refreshTokenHash');
    expect(res.body.user).not.toHaveProperty('password');
    expect(JSON.stringify(record.mock.calls.map(call => call[1]))).not.toContain(password);
    expect(process.env.LOCAL_SELF_REGISTRATION_ENABLED).toBe('false');
});
test.each(['short', 'x'.repeat(73), '😀'.repeat(19)])('rejects invalid password length %s', async value => {
    expect((await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send({ password: value })).status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
});
test('accepts chosen passwords with spaces/punctuation without a composition rule', () => {
    expect(validateAccount({ ...details, password: 'a long plain password' }, true).password).toBe('a long plain password');
});
test('rejects invalid roles and object-valued identities', () => {
    expect(() => validateAccount({ ...details, role: 'owner' }, true)).toThrow();
    expect(() => validateAccount({ ...details, email: { $ne: null } }, true)).toThrow();
});
test('duplicate identities return 409, including a database uniqueness race', async () => {
    User.exists.mockResolvedValueOnce({ _id: id });
    expect((await asAdmin(request(app).post('/api/users/manage')).send(details)).status).toBe(409);
    User.create.mockRejectedValueOnce({ code: 11000 });
    expect((await asAdmin(request(app).post('/api/users/manage')).send(details)).status).toBe(409);
});
test('list results never expose password/token fields', async () => {
    const chain = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: async () => [{ ...account, refreshTokenHash: 'secret', resetPasswordToken: 'secret' }] };
    User.find.mockReturnValue(chain); User.countDocuments.mockResolvedValue(1);
    const res = await asAdmin(request(app).get('/api/users/manage?search=.*'));
    expect(res.status).toBe(200); expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.users[0]).not.toHaveProperty('password'); expect(res.body.users[0]).not.toHaveProperty('refreshTokenHash');
    expect(User.find.mock.calls[0][0].$or[0].firstname.$regex).toBe('\\.\\*');
});
test('disabling preserves the account and revokes local sessions and reset/refresh credentials', async () => {
    const res = await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send({ isActive: false });
    expect(res.status).toBe(200);
    const update = User.findOneAndUpdate.mock.calls[0][1];
    expect(update.$set.isActive).toBe(false); expect(update.$inc.sessionVersion).toBe(1);
    expect(update.$unset).toHaveProperty('refreshTokenHash'); expect(update.$unset).toHaveProperty('resetPasswordToken');
});
test('password reset hashes once, invalidates sessions and never audits the password/hash', async () => {
    const res = await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send({ password });
    expect(res.status).toBe(200);
    const update = User.findOneAndUpdate.mock.calls[0][1];
    expect(await bcrypt.compare(password, update.$set.password)).toBe(true);
    expect(update.$inc.sessionVersion).toBe(1);
    expect(JSON.stringify(record.mock.calls.map(call => call[1]))).not.toContain(password);
    expect(JSON.stringify(res.body)).not.toContain(update.$set.password);
});
describe('superadmin offboarding', () => {
    const superadmin = { ...account, role: 'superadmin' };
    beforeEach(() => { User.findById.mockReturnValue({ lean: async () => ({ ...superadmin }) }); withSettingLock.mockClear(); });

    test.each([{ role: 'viewer' }, { isActive: false }])('another superadmin can demote/disable a superadmin (%o) under the lock, revoking sessions', async change => {
        User.countDocuments.mockResolvedValue(1);
        const res = await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send(change);
        expect(res.status).toBe(200);
        expect(withSettingLock).toHaveBeenCalledWith('users.superadmin-guard', expect.any(Function));
        expect(User.countDocuments).toHaveBeenCalledWith({ _id: { $ne: id }, role: 'superadmin', isActive: { $ne: false } });
        const update = User.findOneAndUpdate.mock.calls[0][1];
        expect(update.$inc.sessionVersion).toBe(1);
        expect(update.$unset).toHaveProperty('refreshTokenHash');
    });

    test.each([{ role: 'viewer' }, { isActive: false }])('the last active superadmin cannot be removed (%o)', async change => {
        User.countDocuments.mockResolvedValue(0);
        const res = await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send(change);
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/one other active superadmin/);
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test.each([{ role: 'admin' }, { isActive: false }])('a superadmin cannot demote or disable themselves (%o)', async change => {
        User.findById.mockReturnValue({ lean: async () => ({ ...superadmin, _id: '507f1f77bcf86cd799439011' }) });
        const res = await asAdmin(request(app).patch('/api/users/manage/507f1f77bcf86cd799439011')).send(change);
        expect(res.status).toBe(403);
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test('other edits to a superadmin do not take the lock', async () => {
        const res = await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send({ firstname: 'Renamed' });
        expect(res.status).toBe(200);
        expect(withSettingLock).not.toHaveBeenCalled();
    });

    test('demoting a non-superadmin role change also revokes sessions', async () => {
        User.findById.mockReturnValue({ lean: async () => ({ ...account, role: 'admin' }) });
        await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send({ role: 'viewer' });
        expect(User.findOneAndUpdate.mock.calls[0][1].$inc.sessionVersion).toBe(1);
    });
});
test('does not set a local password on a linked SSO account', async () => {
    User.findById.mockReturnValue({ lean: async () => ({ ...account, authentikSub: 'linked' }) });
    expect((await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send({ password })).status).toBe(400);
});
test('a concurrent account edit produces a conflict instead of overwriting it', async () => {
    User.findOneAndUpdate.mockResolvedValueOnce(null);
    expect((await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send({ firstname: 'Changed' })).status).toBe(409);
    expect(record).not.toHaveBeenCalled();
});
test('disabled accounts cannot resolve an existing identity, including SSO', () => {
    expect(() => normalizeRequestUser({ ...account, isActive: false })).toThrow('Account is disabled');
});
test('old local tokens stay invalid after disable/re-enable or a password reset', async () => {
    BlacklistedToken.findOne.mockReturnValue({ lean: async () => null });
    User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ ...account, sessionVersion: 2 }) }) });
    const token = jwt.sign({ id, sessionVersion: 0 }, 'user-admin-test-key');
    await expect(resolveLocalTokenIdentity(token)).rejects.toThrow('Session has been invalidated');
});
test('legacy tokens/accounts without sessionVersion still work before a management change', async () => {
    BlacklistedToken.findOne.mockReturnValue({ lean: async () => null });
    User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ _id: id, role: 'viewer' }) }) });
    const token = jwt.sign({ id }, 'user-admin-test-key');
    expect((await resolveLocalTokenIdentity(token)).user.role).toBe('viewer');
});


test('pending accounts cannot be enabled, manually reset or have their email changed', async () => {
    User.findById.mockReturnValue({ lean: async () => ({ ...account, invitationPending: true, isActive: false }) });
    for (const change of [{ isActive: true }, { password }, { email: 'different@example.org' }]) {
        expect((await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send(change)).status).toBe(400);
    }
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
});
test('revoking a pending invitation clears token and pending state', async () => {
    User.findById.mockReturnValue({ lean: async () => ({ ...account, invitationPending: true, isActive: false }) });
    expect((await asAdmin(request(app).patch(`/api/users/manage/${id}`)).send({ isActive: false })).status).toBe(200);
    expect(User.findOneAndUpdate.mock.calls[0][1].$set).toMatchObject({ invitationPending: false, invitationTokenHash: null, invitationExpires: null, isActive: false });
});
