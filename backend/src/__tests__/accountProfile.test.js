import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { getAccountPolicy } from '../services/accountPolicyService.js';
import { validateProfile, changePassword, saveProfile, getAccount } from '../controllers/accountController.js';
import { MAX_AVATAR_BYTES } from '../lib/profileAvatar.js';
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

const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
test('profile supports position, contact details and a bounded raster photo without changing login identity', async () => {
    const input = { title: ' Team lead ', contactEmail: ' contact@example.org ', location: 'Office', website: 'https://example.org/about', avatarDataUrl: photo };
    User.findOneAndUpdate.mockReturnValue({ select: () => ({ lean: async () => ({ ...validateProfile(input), username: 'member', email: 'login@example.org', identityProvider: 'local' }) }) });
    const response = res(); await saveProfile({ user: { id: 'self' }, body: input }, response);
    const [filter, update] = User.findOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({ _id: 'self', isActive: { $ne: false }, invitationPending: { $ne: true }, identityProvider: { $ne: 'authentik' } });
    expect(update.$set).toMatchObject({ title: 'Team lead', contactEmail: 'contact@example.org', avatarDataUrl: photo });
    expect(update.$set).not.toHaveProperty('email');
    expect(response.json).toHaveBeenCalledWith({ user: expect.objectContaining({ email: 'login@example.org', externallyManaged: false }) });
});
test('account read selects private photo/contact fields only for the authenticated user', async () => {
    const select = jest.fn(() => ({ lean: async () => ({ avatarDataUrl: photo, contactEmail: 'contact@example.org', authentikSub: 'external-subject', identityProvider: 'authentik' }) }));
    User.findById.mockReturnValue({ select });
    const response = res(); await getAccount({ user: { id: 'self' } }, response);
    expect(User.findById).toHaveBeenCalledWith('self');
    expect(select.mock.calls[0][0]).toContain('avatarDataUrl');
    expect(response.json.mock.calls[0][0].user).not.toHaveProperty('authentikSub');
    expect(response.json.mock.calls[0][0].user).toMatchObject({ avatarDataUrl: photo, externallyManaged: true });
});
test('empty photo removes custom image without accepting legacy filenames', () => {
    expect(validateProfile({ avatarDataUrl: '' })).toEqual({ avatarDataUrl: '' });
    expect(() => validateProfile({ avatarDataUrl: '/uploads/photo.png' })).toThrow();
});
test.each([
    { avatarDataUrl: 'https://example.org/photo.png' },
    { avatarDataUrl: 'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64') },
    { avatarDataUrl: 'data:image/png;base64,' + Buffer.from('<script/>').toString('base64') },
    { avatarDataUrl: 'data:image/png;base64,' + Buffer.alloc(MAX_AVATAR_BYTES + 1).toString('base64') },
    { avatarDataUrl: null },
    { contactEmail: 'not an email' },
    { contactEmail: 'contact@example.org\r\nBcc:other@example.org' },
    { location: 'x'.repeat(255) },
    { website: 'javascript:alert(1)' },
    { website: '//example.org' },
    { website: 'https:example.org' },
    { website: 'https://user:password@example.org' },
    { website: 'https://example.org\\path' },
    { website: 'https://example.org/' + 'x'.repeat(2048) },
    { _id: 'someone-else' },
    { profilePicture: '../../other-file' },
])('rejects unsafe profile/photo input %#', input => {
    expect(() => validateProfile(input)).toThrow();
});
test('profile write blocked by active-local-account filter reports denial', async () => {
    User.findOneAndUpdate.mockReturnValue({ select: () => ({ lean: async () => null }) });
    const response = res(); await saveProfile({ user: { id: 'self' }, body: { avatarDataUrl: photo } }, response);
    expect(response.status).toHaveBeenCalledWith(403);
});
