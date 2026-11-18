import crypto from 'node:crypto';

const context = binding => Buffer.from('docman:outbound-email:v1:' + binding);
export const mailCredentialBinding = config => JSON.stringify([config.provider, config.smtpHost, config.smtpPort, config.smtpSecurity, config.smtpAuth, config.smtpUsername, config.sesRegion, config.sesAuth]);
export const hasEmailSettingsKey = () => /^[a-fA-F0-9]{64}$/.test(process.env.EMAIL_SETTINGS_KEY || '');
function key() {
    if (!hasEmailSettingsKey()) throw Object.assign(new Error('An administrator must configure EMAIL_SETTINGS_KEY on the server before storing mail credentials.'), { statusCode: 503 });
    return Buffer.from(process.env.EMAIL_SETTINGS_KEY, 'hex');
}
export function encryptMailSecrets(secrets, binding = '') {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
    cipher.setAAD(context(binding));
    const data = Buffer.concat([cipher.update(JSON.stringify(secrets), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}
export function decryptMailSecrets(envelope, binding = '') {
    if (!envelope) return {};
    try {
        const [version, iv, tag, data, extra] = envelope.split('.');
        if (version !== 'v1' || extra || !iv || !tag || !data) throw new Error();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
        decipher.setAAD(context(binding));
        decipher.setAuthTag(Buffer.from(tag, 'base64'));
        return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8'));
    } catch {
        throw Object.assign(new Error('Saved mail credentials cannot be decrypted. Restore the original EMAIL_SETTINGS_KEY or re-enter the credentials.'), { statusCode: 503 });
    }
}
