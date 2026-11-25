export const MAX_AVATAR_BYTES = 256 * 1024;

/** Accept only embedded raster images; never remote URLs, filenames, SVG or HTML. */
export function validateProfileAvatar(value) {
    if (value === '') return '';
    if (typeof value !== 'string' || value.length > 350000) throw new Error('Profile photo must be a PNG, JPEG or WebP image no larger than 256 KiB.');
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) throw new Error('Choose a PNG, JPEG or WebP profile photo. SVG and remote image URLs are not supported.');
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > MAX_AVATAR_BYTES || bytes.toString('base64') !== match[2]) throw new Error('Invalid or oversized profile photo.');
    const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
        : match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
            : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) throw new Error('Profile photo contents do not match its image type.');
    return value;
}
