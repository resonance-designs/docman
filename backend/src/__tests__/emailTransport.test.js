import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { effectiveEmailSetting } from '../services/emailSettingsService.js';
import { sendEmail, smtpOptions } from '../lib/emailService.js';
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }));
jest.mock('@aws-sdk/client-ses', () => ({ SESClient: jest.fn(), SendEmailCommand: jest.fn(input => input) }));
jest.mock('../services/emailSettingsService.js', () => ({ ...jest.requireActual('../services/emailSettingsService.js'), effectiveEmailSetting: jest.fn() }));
const config = { provider: 'smtp', smtpHost: 'mail.example.test', smtpPort: 587, smtpAuth: 'password', smtpSecurity: 'starttls', smtpUsername: 'app', fromEmail: 'app@example.test', fromName: 'DocMan', replyTo: 'help@example.test' };
let transport;
beforeEach(() => {
    transport = { sendMail: jest.fn().mockResolvedValue({ messageId: 'accepted', accepted: ['recipient@example.test'], rejected: [] }), close: jest.fn() };
    nodemailer.createTransport.mockReturnValue(transport);
    effectiveEmailSetting.mockResolvedValue({ config, secrets: { smtpPassword: 'secret-password' } });
});
test('SMTP password login requires validated TLS and bounded connection timeouts', async () => {
    await sendEmail('recipient@example.test', 'Subject', 'Body', '<p>Body</p>');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ requireTLS: true, secure: false, auth: { user: 'app', pass: 'secret-password' }, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' }, disableFileAccess: true, disableUrlAccess: true }));
    expect(transport.sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: { name: 'DocMan', address: 'app@example.test' }, replyTo: 'help@example.test' }));
    expect(transport.close).toHaveBeenCalled();
});
test('direct TLS and unauthenticated relay use distinct options', () => {
    expect(smtpOptions({ ...config, smtpSecurity: 'tls' }, {})).toMatchObject({ secure: true, requireTLS: false });
    const relay = smtpOptions({ ...config, smtpAuth: 'none', smtpSecurity: 'none' }, {});
    expect(relay.auth).toBeUndefined(); expect(relay.ignoreTLS).toBe(true);
});
test('transport errors do not expose raw credentials or SMTP responses', async () => {
    transport.sendMail.mockRejectedValue(Object.assign(new Error('secret-password SMTP server details'), { code: 'EAUTH' }));
    await expect(sendEmail('recipient@example.test', 'Subject', 'Body')).rejects.toThrow('rejected authentication');
    expect(transport.close).toHaveBeenCalled();
});
test('provider rejection is not reported as success', async () => {
    transport.sendMail.mockResolvedValue({ accepted: [], rejected: ['recipient@example.test'] });
    await expect(sendEmail('recipient@example.test', 'Subject', 'Body')).rejects.toMatchObject({ statusCode: 502 });
});
test.each(['role', 'keys'])('SES %s authentication sends sender, reply-to and message fields', async sesAuth => {
    effectiveEmailSetting.mockResolvedValue({ config: { ...config, provider: 'ses', sesRegion: 'us-east-1', sesAuth }, secrets: { sesAccessKeyId: 'key-id', sesSecretAccessKey: 'key-secret' } });
    const client = { send: jest.fn().mockResolvedValue({ MessageId: 'ses-message' }), destroy: jest.fn() }; SESClient.mockImplementation(() => client);
    expect(await sendEmail('recipient@example.test', 'Subject', 'Body')).toEqual({ messageId: 'ses-message', provider: 'ses' });
    expect(SESClient.mock.calls[0][0].credentials).toEqual(sesAuth === 'keys' ? { accessKeyId: 'key-id', secretAccessKey: 'key-secret' } : undefined);
    expect(SendEmailCommand).toHaveBeenCalledWith(expect.objectContaining({ ReplyToAddresses: ['help@example.test'], Destination: { ToAddresses: ['recipient@example.test'] } }));
    expect(client.destroy).toHaveBeenCalled();
});
