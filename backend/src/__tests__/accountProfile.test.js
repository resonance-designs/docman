import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { getAccountPolicy } from '../services/accountPolicyService.js';
import { validateProfile, changePassword, saveProfile } from '../controllers/accountController.js';
jest.mock('../models/User.js', () => ({ __esModule: true, default: { findById: jest.fn(), updateOne: jest.fn(), findOneAndUpdate: jest.fn() } }));
jest.mock('bcrypt', () => ({ __esModule: true, default: { compare: jest.fn(), hash: jest.fn() } }));
jest.mock('../services/accountPolicyService.js', () => ({ ...jest.requireActual('../services/accountPolicyService.js'), getAccountPolicy: jest.fn() }));
const req = () => ({ user: { id: 'self' }, body: { currentPassword: 'old password', password: 'A sufficiently long new password' } });
const res = () => { const r = { status: jest.fn(), json: jest.fn() }; r.status.mockReturnValue(r); return r; };
beforeEach(() => {
    User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ password: 'oldhash', identityProvider: 'local', isActive: true }) }) });
    bcrypt.compare.mockResolvedValue(true); bcrypt.hash.mockResolvedValue('newhash');
    getAccountPolicy.mockResolvedValue({ minLength: 24 }); User.updateOne.mockResolvedValue({ matchedCount: 1 });
});
test.each(['role', 'isActive', 'email', 'username', 'identityProvider', 'password', 'sessionVersion'])('rejects protected field %s', field => {
    expect(() => validateProfile({ [field]: 'value' })).toThrow();
});
test('validates and trims profile fields', () => {
    expect(validateProfile({ bio: 'First\nSecond\r\nThird' }).bio).toBe('First\nSecond\r\nThird');
    expect(() => validateProfile({ bio: 'Bad\u0000text' })).toThrow();
    expect(() => validateProfile({ firstname: 'First\nSecond' })).toThrow();
    expect(validateProfile({ firstname: ' Jane ', bio: '' })).toEqual({ firstname: 'Jane', bio: '' });
    expect(() => validateProfile({ firstname: ' ' })).toThrow();
    expect(() => validateProfile({ bio: 'a'.repeat(501) })).toThrow();
});

test('legacy current passwords over 72 bytes can be verified, but new passwords remain capped', async () => {
    const request = req(); request.body.currentPassword = 'x'.repeat(80);
    const response = res(); await changePassword(request, response);
    expect(bcrypt.compare).toHaveBeenCalledWith(request.body.currentPassword, 'oldhash');
    expect(User.updateOne).toHaveBeenCalled();
    User.updateOne.mockClear(); request.body.password = 'y'.repeat(80);
    await changePassword(request, res());
    expect(User.updateOne).not.toHaveBeenCalled();
});
test('password change checks current password, hashes once and revokes sessions/reset tokens atomically', async () => {
    const response = res(); await changePassword(req(), response);
    expect(bcrypt.compare).toHaveBeenCalledWith('old password', 'oldhash'); expect(bcrypt.hash).toHaveBeenCalledTimes(1);
    expect(User.updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: 'self', password: 'oldhash' }), expect.objectContaining({ $inc: { sessionVersion: 1, __v: 1 }, $unset: expect.objectContaining({ resetPasswordToken: 1, refreshTokenHash: 1 }) }));
    expect(response.status).not.toHaveBeenCalled();
});
test('wrong current password does not write', async () => {
    bcrypt.compare.mockResolvedValue(false); const response = res(); await changePassword(req(), response);
    expect(response.status).toHaveBeenCalledWith(400); expect(User.updateOne).not.toHaveBeenCalled();
});
test('uses current configured minimum', async () => {
    const request = req(); request.body.password = 'a'.repeat(23); const response = res(); await changePassword(request, response);
    expect(response.status).toHaveBeenCalledWith(400); expect(bcrypt.hash).not.toHaveBeenCalled();
});
test('SSO password cannot be changed locally', async () => {
    User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ identityProvider: 'authentik' }) }) });
    const response = res(); await changePassword(req(), response); expect(response.status).toHaveBeenCalledWith(403); expect(User.updateOne).not.toHaveBeenCalled();
});
test('concurrent credential change rejects stale update', async () => {
    User.updateOne.mockResolvedValue({ matchedCount: 0 }); const response = res(); await changePassword(req(), response); expect(response.status).toHaveBeenCalledWith(409);
});
test('profile writes target authenticated user and cannot change protected fields', async () => {
    const response = res(); await saveProfile({ user: { id: 'self' }, body: { role: 'superadmin' } }, response);
    expect(response.status).toHaveBeenCalledWith(400); expect(User.findOneAndUpdate).not.toHaveBeenCalled();
});
