import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import dotenv from 'dotenv';
import { effectiveEmailSetting, validEmail } from '../services/emailSettingsService.js';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.prod' : process.env.NODE_ENV === 'development' ? '.env.dev' : '.env' });

export function smtpOptions(config, secrets) {
    return {
        host: config.smtpHost, port: config.smtpPort,
        secure: config.smtpSecurity === 'tls',
        requireTLS: config.smtpSecurity === 'starttls',
        ignoreTLS: config.smtpSecurity === 'none',
        tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
        ...(config.smtpAuth === 'password' ? { auth: { user: config.smtpUsername, pass: secrets.smtpPassword } } : {}),
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
        disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
    };
}
export function safeDeliveryError(error) {
    const code = error?.code || error?.name;
    const message = code === 'EAUTH' ? 'Mail server rejected authentication. Check the saved credentials and server policy.'
        : ['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNREFUSED', 'ENOTFOUND', 'EDNS'].includes(code) ? 'Could not connect securely to the mail server. Check the host, port, TLS trust, and network access.'
        : ['EENVELOPE', 'MessageRejected'].includes(code) ? 'Mail server rejected the sender or recipient. Check relay permissions and verified addresses.'
        : 'Email delivery failed. Check the provider settings, credentials, TLS trust, and mail-server logs.';
    return Object.assign(new Error(message), { statusCode: 502 });
}
// Existing reset/review callers share this transport; configuration is read for every send.
export async function sendEmail(to, subject, text, html) {
    if (!validEmail(to) || typeof subject !== 'string' || /[\r\n]/.test(subject)) throw new Error('Invalid email recipient or subject.');
    let settings;
    try { settings = await effectiveEmailSetting(); }
    catch (error) { throw Object.assign(new Error(error.statusCode === 503 ? error.message : 'Email configuration is unavailable.'), { statusCode: 503 }); }
    const { config, secrets } = settings;
    if (config.provider === 'smtp') {
        const transport = nodemailer.createTransport(smtpOptions(config, secrets));
        try {
            const result = await transport.sendMail({ from: { name: config.fromName, address: config.fromEmail }, to, ...(config.replyTo ? { replyTo: config.replyTo } : {}), subject, text, html });
            if (!result.accepted?.length || result.rejected?.length) throw new Error('Recipient not accepted');
            return { messageId: result.messageId, provider: 'smtp' };
        } catch (error) { throw safeDeliveryError(error); }
        finally { transport.close(); }
    }
    const client = new SESClient({ region: config.sesRegion, ...(config.sesAuth === 'keys' ? { credentials: { accessKeyId: secrets.sesAccessKeyId, secretAccessKey: secrets.sesSecretAccessKey } } : {}), maxAttempts: 1, requestHandler: { connectionTimeout: 10000, requestTimeout: 20000 } });
    try {
        const name = config.fromName ? `=?UTF-8?B?${Buffer.from(config.fromName).toString('base64')}?= ` : '';
        const result = await client.send(new SendEmailCommand({
            Source: name ? `${name}<${config.fromEmail}>` : config.fromEmail,
            Destination: { ToAddresses: [to] },
            ...(config.replyTo ? { ReplyToAddresses: [config.replyTo] } : {}),
            Message: { Subject: { Charset: 'UTF-8', Data: subject }, Body: { Text: { Charset: 'UTF-8', Data: text }, ...(html ? { Html: { Charset: 'UTF-8', Data: html } } : {}) } },
        }));
        return { messageId: result.MessageId, provider: 'ses' };
    } catch (error) { throw safeDeliveryError(error); }
    finally { client.destroy(); }
}
export default { sendEmail };
