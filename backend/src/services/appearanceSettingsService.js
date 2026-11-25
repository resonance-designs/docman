import SystemSetting from '../models/SystemSetting.js';

export const APPEARANCE_KEY = 'ui.appearance';
export const MAX_LOGO_BYTES = 256 * 1024;
const defaults = {
    typography: {
        link: { color: '#C65300', fontSize: 16 },
        linkHover: { color: '#963F00', fontSize: 16 },
        linkActive: { color: '#793300', fontSize: 16 },
        linkVisited: { color: '#6941A5', fontSize: 16 },
        h1: { color: '#1F2937', fontSize: 34 },
        h2: { color: '#1F2937', fontSize: 28 },
        h3: { color: '#1F2937', fontSize: 24 },
        h4: { color: '#1F2937', fontSize: 20 },
        h5: { color: '#1F2937', fontSize: 18 },
        h6: { color: '#1F2937', fontSize: 16 },
        paragraph: { color: '#1F2937', fontSize: 16 },
    },
    logo: { dataUrl: '', alt: 'DocMan' },
    menuPosition: 'left',
    footer: { enabled: false, text: '', linkLabel: '', linkUrl: '', backgroundColor: '#FFFFFF', textColor: '#1F2937' },
};

export function appearanceDefaults() { return structuredClone(defaults); }
export class AppearanceInputError extends Error {}
function reject(message) { throw new AppearanceInputError(message); }
function object(value, keys, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || Object.keys(value).some(key => !keys.includes(key))) reject(`Invalid ${label} fields.`);
}
function text(value, max, label) {
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) reject(`Invalid ${label} (maximum ${max} characters).`);
    return value.trim();
}
function color(value) {
    if (typeof value !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(value)) reject('Colors must use six-digit hex values, such as #1F2937.');
    return value.toUpperCase();
}
function logoData(value) {
    if (value === '') return '';
    if (typeof value !== 'string' || value.length > 350000) reject('Logo must be a PNG, JPEG or WebP image no larger than 256 KiB.');
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) reject('Logo must be a base64 PNG, JPEG or WebP image. SVG is not supported.');
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > MAX_LOGO_BYTES || bytes.toString('base64') !== match[2]) reject('Invalid or oversized logo image.');
    const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
        : match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
            : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) reject('Logo contents do not match its image type.');
    return value;
}

/** Construct a known-field DTO; never accept CSS, HTML, or remote image URLs. */
export function validateAppearance(input) {
    object(input, Object.keys(defaults), 'appearance');
    object(input.typography, Object.keys(defaults.typography), 'typography');
    const typography = {};
    for (const key of Object.keys(defaults.typography)) {
        const value = input.typography[key];
        object(value, ['color', 'fontSize'], key);
        if (!Number.isInteger(value.fontSize) || value.fontSize < 10 || value.fontSize > 72) reject(`${key} font size must be a whole number from 10 to 72 pixels.`);
        typography[key] = { color: color(value.color), fontSize: value.fontSize };
    }
    object(input.logo, ['dataUrl', 'alt'], 'logo');
    const logo = { dataUrl: logoData(input.logo.dataUrl), alt: text(input.logo.alt, 120, 'logo alternative text') };
    if (logo.dataUrl && !logo.alt) reject('Provide alternative text for the logo.');
    if (!['left', 'right', 'top'].includes(input.menuPosition)) reject('Menu placement must be left, right or top.');
    object(input.footer, Object.keys(defaults.footer), 'footer');
    const f = input.footer;
    if (typeof f.enabled !== 'boolean') reject('Footer visibility must be true or false.');
    const linkUrl = text(f.linkUrl, 2048, 'footer link URL');
    if (linkUrl) {
        let url;
        try { url = new URL(linkUrl); } catch { reject('Footer links must be absolute HTTPS URLs.'); }
        if (!/^https:\/\//i.test(linkUrl) || url.protocol !== 'https:' || !url.hostname || url.username || url.password || /[\s\\]/.test(linkUrl)) reject('Footer links must be HTTPS URLs without credentials.');
    }
    const footer = { enabled: f.enabled, text: text(f.text, 500, 'footer text'), linkLabel: text(f.linkLabel, 100, 'footer link label'), linkUrl, backgroundColor: color(f.backgroundColor), textColor: color(f.textColor) };
    if (Boolean(footer.linkLabel) !== Boolean(linkUrl)) reject('Provide both a footer link label and URL, or leave both empty.');
    return { typography, logo, menuPosition: input.menuPosition, footer };
}

export async function getAppearance() {
    const row = await SystemSetting.findOne({ key: APPEARANCE_KEY }).lean();
    if (!row) return appearanceDefaults();
    // Invalid legacy/manual database values must not become browser CSS or URLs.
    try { return validateAppearance(row.value); }
    catch (error) { if (error instanceof AppearanceInputError) return appearanceDefaults(); throw error; }
}

export async function saveAppearance(value, userId) {
    const settings = validateAppearance(value);
    await SystemSetting.findOneAndUpdate({ key: APPEARANCE_KEY },
        { $set: { value: settings, updatedBy: userId } }, { upsert: true, runValidators: true });
    return settings;
}
