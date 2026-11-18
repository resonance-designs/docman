import express from 'express';
import request from 'supertest';
import EmailSetting from '../models/EmailSetting.js';
import { prepareEmailSetting, publicEmailSetting, effectiveEmailSetting, persistEmailSetting } from '../services/emailSettingsService.js';
import { encryptMailSecrets, decryptMailSecrets, mailCredentialBinding } from '../lib/mailSecrets.js';
import { record } from '../services/auditService.js';
import { sendEmail } from '../lib/emailService.js';
import { createRateLimiter } from '../config/redis.js';
import router from '../routes/systemRoutes.js';

jest.mock('../models/EmailSetting.js', () => ({ __esModule: true, default: { findById: jest.fn(), findOneAndUpdate: jest.fn() } }));
jest.mock('../services/auditService.js', () => ({ record: jest.fn(), AUDIT_ACTIONS: { SYSTEM_SETTING_CHANGE: 'system.setting_change', EMAIL_TEST: 'system.email_test' } }));
jest.mock('../lib/emailService.js', () => ({ sendEmail: jest.fn() }));
jest.mock('../config/redis.js', () => ({ createRateLimiter: jest.fn(() => ({ limit: jest.fn() })) }));
jest.mock('../controllers/systemController.js', () => Object.fromEntries(['getSystemInfo', 'getPerformanceMetrics', 'clearCollection', 'restoreCollection', 'archiveFiles', 'restoreFiles', 'generateDummyData', 'getRedisSettings', 'updateRedisSettings'].map(key => [key, jest.fn()])));
jest.mock('../lib/secretToken.js', () => ({ verifyAccessToken: (req, res, next) => { if (!req.headers['x-test-role']) return res.sendStatus(401); req.user = { id: '507f1f77bcf86cd799439011', role: req.headers['x-test-role'] }; next(); } }));
const app = express(); app.use(express.json()); app.use('/system', router);
const limiter = createRateLimiter.mock.results[createRateLimiter.mock.calls.findIndex(args => args[0] === 3)].value.limit;
const password = 'mail credential for testing';
const input = () => ({ provider: 'smtp', revision: 0, fromEmail: 'docman@example.test', fromName: 'DocMan', replyTo: '', smtpHost: 'smtp.example.test', smtpPort: 587, smtpSecurity: 'starttls', smtpAuth: 'password', smtpUsername: 'docman', smtpPassword: password });
const asAdmin = req => req.set('x-test-role', 'superadmin');
let stored;
beforeEach(() => {
    process.env.EMAIL_SETTINGS_KEY = 'ab'.repeat(32); stored = null;
    EmailSetting.findById.mockImplementation(() => ({ lean: async () => stored }));
    EmailSetting.findOneAndUpdate.mockImplementation(async (filter, update) => ({ ...update.$set, revision: filter.revision + 1 }));
    record.mockResolvedValue({ _id: 'audit-id' }); limiter.mockResolvedValue({ success: true }); sendEmail.mockResolvedValue({ messageId: 'test' });
});
afterAll(() => { delete process.env.EMAIL_SETTINGS_KEY; delete process.env.AWS_SES_SENDER_EMAIL; });

test.each(['get', 'put', 'post'])('unauthenticated %s email operation is denied', async method => {
    expect((await request(app)[method](`/system/email${method === 'post' ? '/test' : ''}`).send({})).status).toBe(401);
});
test.each(['viewer', 'editor', 'admin'])('role %s cannot read, save or test mail configuration', async role => {
    for (const [method, path] of [['get', '/email'], ['put', '/email'], ['post', '/email/test']]) expect((await request(app)[method]('/system'+path).set('x-test-role', role).send({})).status).toBe(403);
    expect(sendEmail).not.toHaveBeenCalled(); expect(EmailSetting.findOneAndUpdate).not.toHaveBeenCalled();
});
test('credentials are encrypted, not returned, and absent from audit events', async () => {
    const response = await asAdmin(request(app).put('/system/email')).send(input());
    expect(response.status).toBe(200); expect(response.body.credentialsStored).toBe(true);
    const update = EmailSetting.findOneAndUpdate.mock.calls[0][1].$set;
    expect(JSON.stringify(update)).not.toContain(password);
    expect(decryptMailSecrets(update.encryptedSecrets, mailCredentialBinding(update.config))).toEqual({ smtpPassword: password });
    expect(JSON.stringify(response.body)).not.toContain(password); expect(JSON.stringify(record.mock.calls.map(call => call[1]))).not.toContain(password);
    expect(response.headers['cache-control']).toBe('no-store');
});
test('public settings allowlist hides ciphertext and unexpected stored fields', () => {
    const row = { config: { ...input(), smtpPassword: password }, encryptedSecrets: 'secret-ciphertext', revision: 1 };
    expect(JSON.stringify(publicEmailSetting(row))).not.toContain(password);
    expect(JSON.stringify(publicEmailSetting(row))).not.toContain('secret-ciphertext');
});
test('authenticated encryption rejects tampering and wrong keys', () => {
    const value = encryptMailSecrets({ smtpPassword: password });
    const parts = value.split('.'); parts[3] = Buffer.from('tampered').toString('base64');
    expect(() => decryptMailSecrets(parts.join('.'))).toThrow('cannot be decrypted');
    process.env.EMAIL_SETTINGS_KEY = 'cd'.repeat(32);
    expect(() => decryptMailSecrets(value)).toThrow('cannot be decrypted');
});
test('missing encryption key prevents credential storage but permits an IP-authorized relay', () => {
    delete process.env.EMAIL_SETTINGS_KEY;
    expect(() => prepareEmailSetting(input())).toThrow('EMAIL_SETTINGS_KEY');
    expect(prepareEmailSetting({ ...input(), smtpAuth: 'none', smtpPassword: '' }).encryptedSecrets).toBe('');
});
test('blank password preserves only the same SMTP destination/account', () => {
    const previous = { ...prepareEmailSetting(input()), revision: 1 };
    const unchanged = prepareEmailSetting({ ...input(), revision: 1, smtpPassword: '' }, previous);
    expect(decryptMailSecrets(unchanged.encryptedSecrets, mailCredentialBinding(unchanged.config)).smtpPassword).toBe(password);
    for (const change of [{ smtpHost: 'other.test' }, { smtpPort: 465 }, { smtpUsername: 'other' }, { smtpSecurity: 'tls' }]) expect(() => prepareEmailSetting({ ...input(), ...change, smtpPassword: '' }, previous)).toThrow('Enter the SMTP password');
});
test.each([{ smtpPort: 0 }, { smtpHost: 'https://mail.test' }, { fromEmail: 'a@test\r\nBcc:x@test' }, { smtpSecurity: 'none' }, { rejectUnauthorized: false }, { provider: 'sendmail' }])('rejects invalid or unsafe settings %j', change => {
    expect(() => prepareEmailSetting({ ...input(), ...change })).toThrow();
});
test('SES supports server credentials or encrypted key pair and clears unused credentials', () => {
    const ses = { ...input(), provider: 'ses', sesRegion: 'us-east-1', sesAuth: 'keys', sesAccessKeyId: 'access-id', sesSecretAccessKey: 'secret-key' };
    const prepared = prepareEmailSetting(ses);
    expect(decryptMailSecrets(prepared.encryptedSecrets, mailCredentialBinding(prepared.config))).toEqual({ sesAccessKeyId: 'access-id', sesSecretAccessKey: 'secret-key' });
    expect(prepareEmailSetting({ ...ses, sesAuth: 'role' }).encryptedSecrets).toBe('');
    expect(prepareEmailSetting({ provider: 'disabled', revision: 0 }).encryptedSecrets).toBe('');
});
test('revision conflict does not overwrite another administrator changes', async () => {
    stored = { ...prepareEmailSetting(input()), revision: 1 };
    const response = await asAdmin(request(app).put('/system/email')).send(input());
    expect(response.status).toBe(409); expect(EmailSetting.findOneAndUpdate).not.toHaveBeenCalled();
});
test('a database race also returns a conflict', async () => {
    EmailSetting.findOneAndUpdate.mockResolvedValue(null);
    await expect(persistEmailSetting({ ...input(), revision: 1 }, { revision: 1 }, 'user')).rejects.toMatchObject({ statusCode: 409 });
    EmailSetting.findOneAndUpdate.mockRejectedValue({ code: 11000 });
    await expect(persistEmailSetting(input(), null, 'user')).rejects.toMatchObject({ statusCode: 409 });
});
test('audit failure blocks writes and test sending', async () => {
    record.mockResolvedValue(null);
    expect((await asAdmin(request(app).put('/system/email')).send(input())).status).toBe(503);
    expect((await asAdmin(request(app).post('/system/email/test')).send({ recipient: 'admin@example.test' })).status).toBe(503);
    expect(EmailSetting.findOneAndUpdate).not.toHaveBeenCalled(); expect(sendEmail).not.toHaveBeenCalled();
});
test('test send uses a fixed message, one recipient and rate limiting', async () => {
    const result = await asAdmin(request(app).post('/system/email/test')).send({ recipient: 'admin@example.test' });
    expect(result.status).toBe(200); expect(sendEmail.mock.calls[0][1]).toBe('DocMan email configuration test');
    expect(result.body.message).toContain('accepted');
    limiter.mockResolvedValue({ success: false });
    expect((await asAdmin(request(app).post('/system/email/test')).send({ recipient: 'admin@example.test' })).status).toBe(429);
    expect((await asAdmin(request(app).post('/system/email/test')).send({ recipient: 'admin@example.test', html: 'custom' })).status).toBe(400);
    expect(sendEmail).toHaveBeenCalledTimes(1);
});
test('no database fallback when email is disabled or the database fails', async () => {
    stored = { config: { provider: 'disabled' } };
    await expect(effectiveEmailSetting()).rejects.toThrow('disabled');
    EmailSetting.findById.mockImplementation(() => ({ lean: async () => { throw new Error('database unavailable'); } }));
    await expect(effectiveEmailSetting()).rejects.toThrow('database unavailable');
});
test('legacy server SES settings remain available until overridden', async () => {
    process.env.AWS_SES_SENDER_EMAIL = 'legacy@example.test';
    expect((await effectiveEmailSetting()).config).toMatchObject({ provider: 'ses', fromEmail: 'legacy@example.test', sesAuth: 'role' });
});

test('stored credentials cannot be decrypted after database-side destination tampering', async () => {
    stored = prepareEmailSetting(input());
    stored.config.smtpHost = 'attacker.example.test';
    await expect(effectiveEmailSetting()).rejects.toThrow('cannot be decrypted');
});
