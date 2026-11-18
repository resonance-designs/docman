import net from 'node:net';
import EmailSetting from '../models/EmailSetting.js';
import { encryptMailSecrets, decryptMailSecrets, hasEmailSettingsKey, mailCredentialBinding } from '../lib/mailSecrets.js';

export const MAIL_PROVIDERS = ['environment', 'disabled', 'smtp', 'ses'];
export const defaults = () => ({ provider: 'environment', fromEmail: '', fromName: '', replyTo: '', smtpHost: '', smtpPort: 587, smtpSecurity: 'starttls', smtpAuth: 'none', smtpUsername: '', sesRegion: 'us-east-1', sesAuth: 'role' });
const bad = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
export function validEmail(value) {
    return typeof value === 'string' && value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(value) && !value.includes('..');
}
function str(input, name, max = 255) {
    if (typeof input[name] !== 'string' || input[name].length > max || /[\u0000-\u001f\u007f]/.test(input[name])) bad(`Invalid ${name}.`);
    return input[name].trim();
}
export async function readEmailSetting() {
    return await EmailSetting.findById('outbound').lean();
}
export function publicEmailSetting(row) {
    // Explicit allowlist: never spread a database object into an API response.
    const config = defaults();
    for (const name of Object.keys(config)) if (row?.config?.[name] !== undefined) config[name] = row.config[name];
    return { ...config, revision: row?.revision || 0, credentialsStored: Boolean(row?.encryptedSecrets), encryptionReady: hasEmailSettingsKey(), environmentConfigured: validEmail(process.env.AWS_SES_SENDER_EMAIL), environmentSender: validEmail(process.env.AWS_SES_SENDER_EMAIL) ? process.env.AWS_SES_SENDER_EMAIL : '' };
}
export function prepareEmailSetting(input, previous) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) bad('Settings must be an object.');
    const allowed = [...Object.keys(defaults()), 'revision', 'smtpPassword', 'sesAccessKeyId', 'sesSecretAccessKey'];
    if (Object.keys(input).some(name => !allowed.includes(name))) bad('Unrecognized email setting.');
    if (!Number.isSafeInteger(input.revision) || input.revision < 0) bad('A settings revision is required.');
    if (!MAIL_PROVIDERS.includes(input.provider)) bad('Choose a supported email provider.');
    const config = defaults(); config.provider = input.provider;
    if (['disabled', 'environment'].includes(config.provider)) return { config, encryptedSecrets: '' };
    config.fromEmail = str(input, 'fromEmail'); config.fromName = str(input, 'fromName', 100); config.replyTo = str(input, 'replyTo');
    if (!validEmail(config.fromEmail) || (config.replyTo && !validEmail(config.replyTo))) bad('Enter one valid sender/reply-to email address.');
    let secrets = null;
    const secret = (name, max = 4096) => {
        const value = input[name] ?? '';
        if (typeof value !== 'string' || value.length > max || /[\u0000\r\n]/.test(value)) bad(`Invalid ${name}.`);
        return value;
    };
    if (config.provider === 'smtp') {
        config.smtpHost = str(input, 'smtpHost');
        if (!net.isIP(config.smtpHost) && !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(config.smtpHost)) bad('SMTP host must be a hostname or IP address, without a URL or port.');
        config.smtpPort = input.smtpPort;
        if (!Number.isInteger(config.smtpPort) || config.smtpPort < 1 || config.smtpPort > 65535) bad('SMTP port must be from 1 to 65535.');
        if (!['starttls', 'tls', 'none'].includes(input.smtpSecurity)) bad('Choose STARTTLS, TLS, or an unencrypted relay.');
        if (!['none', 'password'].includes(input.smtpAuth)) bad('Choose IP-authorized relay or password authentication.');
        config.smtpSecurity = input.smtpSecurity; config.smtpAuth = input.smtpAuth;
        if (config.smtpAuth === 'password') {
            if (config.smtpSecurity === 'none') bad('Password authentication requires TLS or STARTTLS.');
            config.smtpUsername = str(input, 'smtpUsername');
            if (!config.smtpUsername) bad('SMTP username is required.');
            const password = secret('smtpPassword');
            if (password) secrets = { smtpPassword: password };
            else if (previous?.config?.provider === 'smtp' && previous.config.smtpHost === config.smtpHost && previous.config.smtpPort === config.smtpPort && previous.config.smtpUsername === config.smtpUsername && previous.config.smtpSecurity === config.smtpSecurity && previous.config.smtpAuth === 'password' && previous.encryptedSecrets) {
                // A different destination must never inherit the old server's password.
                secrets = decryptMailSecrets(previous.encryptedSecrets, mailCredentialBinding(previous.config));
            } else bad('Enter the SMTP password for this server/account.');
        }
    } else {
        config.sesRegion = str(input, 'sesRegion', 60);
        if (!/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(config.sesRegion)) bad('Enter an AWS region such as us-east-1.');
        if (!['role', 'keys'].includes(input.sesAuth)) bad('Choose server credentials or stored AWS keys.');
        config.sesAuth = input.sesAuth;
        if (config.sesAuth === 'keys') {
            const access = secret('sesAccessKeyId', 128), password = secret('sesSecretAccessKey', 256);
            if (access && password) secrets = { sesAccessKeyId: access, sesSecretAccessKey: password };
            else if (!access && !password && previous?.config?.provider === 'ses' && previous.config.sesAuth === 'keys' && previous.encryptedSecrets) secrets = decryptMailSecrets(previous.encryptedSecrets, mailCredentialBinding(previous.config));
            else bad('Enter both AWS access key ID and secret access key.');
        }
    }
    return { config, encryptedSecrets: secrets ? encryptMailSecrets(secrets, mailCredentialBinding(config)) : '' };
}
export async function persistEmailSetting(input, previous, actor) {
    const prepared = prepareEmailSetting(input, previous);
    if (input.revision !== (previous?.revision || 0)) throw Object.assign(new Error('Email settings changed. Reload before saving.'), { statusCode: 409 });
    try {
        const result = await EmailSetting.findOneAndUpdate({ _id: 'outbound', revision: input.revision }, { $set: { ...prepared, updatedBy: actor }, $inc: { revision: 1 } }, { new: true, upsert: !previous, runValidators: true, setDefaultsOnInsert: false });
        if (!result) throw Object.assign(new Error('Email settings changed. Reload before saving.'), { statusCode: 409 });
        return result;
    } catch (error) {
        if (error.code === 11000) throw Object.assign(new Error('Email settings changed. Reload before saving.'), { statusCode: 409 });
        throw error;
    }
}
export async function effectiveEmailSetting() {
    const row = await readEmailSetting();
    const config = row?.config || defaults();
    if (config.provider === 'disabled') throw Object.assign(new Error('Email sending is disabled in System settings.'), { statusCode: 503 });
    if (config.provider === 'environment') {
        if (!validEmail(process.env.AWS_SES_SENDER_EMAIL)) throw Object.assign(new Error('Legacy AWS SES is not configured. Configure email in System settings.'), { statusCode: 503 });
        return { config: { ...defaults(), provider: 'ses', fromEmail: process.env.AWS_SES_SENDER_EMAIL, sesRegion: process.env.AWS_SES_REGION || 'us-east-1', sesAuth: 'role' }, secrets: {} };
    }
    return { config, secrets: decryptMailSecrets(row.encryptedSecrets, mailCredentialBinding(config)) };
}
