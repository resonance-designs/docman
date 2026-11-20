import bcrypt from 'bcrypt';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';
import { sendEmail } from '../lib/emailService.js';
import { acceptInvitation, deliverInvitation, tokenHash, invitationUrl } from '../controllers/invitationController.js';
import { getAccountPolicy, passwordError, validatePolicy } from '../services/accountPolicyService.js';
import { register, resetPassword } from '../controllers/authController.js';
jest.mock('../models/User.js', () => ({ __esModule: true, default: { findOneAndUpdate: jest.fn(), updateOne: jest.fn(), findOne: jest.fn() } }));
jest.mock('../models/SystemSetting.js', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../lib/emailService.js', () => ({ sendEmail: jest.fn() }));
jest.mock('../services/auditService.js', () => ({ record: jest.fn(), AUDIT_ACTIONS: {} }));
jest.mock('../lib/secretToken.js', () => ({ createAccessToken: jest.fn() }));
const response = () => { const res = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res; };
const token = 'ab'.repeat(32);
beforeEach(() => {
    process.env.APP_BASE_URL = 'https://docman.example.org';
    SystemSetting.findOne.mockReturnValue({ lean: async () => null });
    User.updateOne.mockResolvedValue({ matchedCount: 1 });
    sendEmail.mockResolvedValue({});
});
test('default policy disables public registration and preserves minimum 18', async () => {
    expect(await getAccountPolicy()).toEqual({ minLength: 18, selfRegistrationEnabled: false });
    const res = response(); await register({ body: {} }, res); expect(res.status).toHaveBeenCalledWith(403);
});
test.each([13, 25, 14.5, '18'])('rejects invalid minimum %s', minLength => {
    expect(() => validatePolicy({ minLength, selfRegistrationEnabled: false })).toThrow();
});
test('policy enforces configured minimum, Unicode byte cap and controls', () => {
    expect(passwordError('a'.repeat(14), { minLength: 14 })).toBeNull();
    expect(passwordError('a'.repeat(23), { minLength: 24 })).toBeTruthy();
    expect(passwordError('😀'.repeat(19), { minLength: 14 })).toBeTruthy();
    expect(passwordError('a'.repeat(24) + '\n', { minLength: 14 })).toBeTruthy();
});
test('invitation stores only a hash and emails an expiring fragment link', async () => {
    await deliverInvitation({ _id: 'user', email: 'user@example.org' }, {});
    const update = User.updateOne.mock.calls[0][1].$set;
    const body = sendEmail.mock.calls[0][2];
    const emailedToken = body.match(/#token=([a-f0-9]{64})/)[1];
    expect(update.invitationTokenHash).toBe(tokenHash(emailedToken));
    expect(JSON.stringify(update)).not.toContain(emailedToken);
    expect(update.invitationExpires.getTime()).toBeGreaterThan(Date.now() + 23 * 3600000);
});
test('failed delivery remains an error for a retry, not successful activation', async () => {
    sendEmail.mockRejectedValueOnce(new Error('relay unavailable'));
    await expect(deliverInvitation({ _id: 'user', email: 'user@example.org' }, {})).rejects.toThrow();
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
});
test('acceptance atomically matches unexpired inactive local invitation and clears credentials', async () => {
    User.findOneAndUpdate.mockResolvedValueOnce({ _id: 'user' });
    const res = response(); await acceptInvitation({ body: { token, password: 'a'.repeat(18) } }, res);
    const [filter, update] = User.findOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({ invitationTokenHash: tokenHash(token), invitationPending: true, isActive: false, identityProvider: 'local' });
    expect(filter.invitationExpires.$gt).toBeInstanceOf(Date);
    expect(update.$unset).toHaveProperty('invitationTokenHash');
    expect(update.$inc.sessionVersion).toBe(1);
    expect(await bcrypt.compare('a'.repeat(18), update.$set.password)).toBe(true);
    expect(res.json).toHaveBeenCalledWith({ message: 'Account activated. You can now sign in.' });
});
test('consumed, expired, revoked and unknown tokens cannot activate an account', async () => {
    User.findOneAndUpdate.mockResolvedValue(null);
    const res = response(); await acceptInvitation({ body: { token, password: 'a'.repeat(18) } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
});
test('changed password policy applies at acceptance', async () => {
    SystemSetting.findOne.mockReturnValue({ lean: async () => ({ value: { minLength: 24 } }) });
    const res = response(); await acceptInvitation({ body: { token, password: 'a'.repeat(18) } }, res);
    expect(res.status).toHaveBeenCalledWith(400); expect(User.findOneAndUpdate).not.toHaveBeenCalled();
});
test('registration cannot request elevated roles when enabled', async () => {
    SystemSetting.findOne.mockReturnValue({ lean: async () => ({ value: { minLength: 14, selfRegistrationEnabled: true } }) });
    const res = response(); await register({ body: { firstname: 'Test', lastname: 'User', username: 'testuser', email: 'user@example.org', password: 'a'.repeat(14), role: 'superadmin' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
});
test('reset uses configured password policy', async () => {
    SystemSetting.findOne.mockReturnValue({ lean: async () => ({ value: { minLength: 24 } }) });
    const res = response(); await resetPassword({ body: { token, password: 'a'.repeat(18) } }, res);
    expect(res.status).toHaveBeenCalledWith(400); expect(User.findOne).not.toHaveBeenCalled();
});
test('production invitations require an HTTPS base URL', () => {
    const old = process.env.NODE_ENV; process.env.NODE_ENV = 'production'; process.env.APP_BASE_URL = 'http://example.org';
    try { expect(() => invitationUrl(token)).toThrow(); } finally { process.env.NODE_ENV = old; }
});


test('resending generates a different token and replaces the previous hash', async () => {
    const user = { _id: 'user', email: 'user@example.org' };
    await deliverInvitation(user, {}); await deliverInvitation(user, {});
    expect(User.updateOne.mock.calls[0][1].$set.invitationTokenHash).not.toBe(User.updateOne.mock.calls[1][1].$set.invitationTokenHash);
});
