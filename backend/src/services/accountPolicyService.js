import SystemSetting from '../models/SystemSetting.js';
export const defaults = { minLength: 18, selfRegistrationEnabled: false };
export async function getAccountPolicy() {
    const row = await SystemSetting.findOne({ key: 'accounts.policy' }).lean();
    return { ...defaults, ...row?.value };
}
export function passwordError(password, policy = defaults) {
    if (typeof password !== 'string' || [...password].length < policy.minLength || Buffer.byteLength(password, 'utf8') > 72 || /[\x00-\x1f\x7f]/.test(password))
        return `Password must contain at least ${policy.minLength} characters, at most 72 UTF-8 bytes, and no control characters.`;
    return null;
}
export function validatePolicy(input) {
    if (!input || !Number.isInteger(input.minLength) || input.minLength < 14 || input.minLength > 24 || typeof input.selfRegistrationEnabled !== 'boolean' || Object.keys(input).some(k => !Object.hasOwn(defaults, k)))
        throw Object.assign(new Error('Choose a minimum length from 14 to 24 and a self-registration setting.'), { statusCode: 400 });
    return { minLength: input.minLength, selfRegistrationEnabled: input.selfRegistrationEnabled };
}
