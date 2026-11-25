export const typographyLabels = {
  link: 'Links — normal', linkHover: 'Links — hover / focus', linkActive: 'Links — active', linkVisited: 'Links — visited',
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', h5: 'Heading 5', h6: 'Heading 6', paragraph: 'Paragraph text',
};
export const defaultAppearance = {
  typography: Object.fromEntries(Object.keys(typographyLabels).map(key => [key, {
    color: ({ link: '#C65300', linkHover: '#963F00', linkActive: '#793300', linkVisited: '#6941A5' })[key] || '#1F2937',
    fontSize: ({ h1: 34, h2: 28, h3: 24, h4: 20, h5: 18, h6: 16 })[key] || 16,
  }])),
  logo: { dataUrl: '', alt: 'DocMan' }, menuPosition: 'left',
  footer: { enabled: false, text: '', linkLabel: '', linkUrl: '', backgroundColor: '#FFFFFF', textColor: '#1F2937' },
};
export const cloneAppearance = value => JSON.parse(JSON.stringify(value));
export const isColor = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
export const isFontSize = value => Number.isInteger(value) && value >= 10 && value <= 72;
export function isHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  if (!value) return true;
  if (!/^https:\/\//i.test(value) || value.length > 2048 || /[\s\\]/.test(value)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function isSafeLogo(value) {
  return typeof value === 'string' && (value === '' || (value.length <= 350000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)));
}
// Defensive allowlisting also protects previews from invalid or partially edited input.
export function safeAppearance(value) {
  const result = cloneAppearance(defaultAppearance);
  for (const key of Object.keys(typographyLabels)) {
    const entry = value?.typography?.[key];
    if (isColor(entry?.color)) result.typography[key].color = entry.color;
    if (isFontSize(entry?.fontSize)) result.typography[key].fontSize = entry.fontSize;
  }
  if (['left', 'right', 'top'].includes(value?.menuPosition)) result.menuPosition = value.menuPosition;
  if (isSafeLogo(value?.logo?.dataUrl)) result.logo.dataUrl = value.logo.dataUrl;
  if (typeof value?.logo?.alt === 'string') result.logo.alt = value.logo.alt.slice(0, 120);
  const footer = value?.footer || {};
  if (typeof footer.enabled === 'boolean') result.footer.enabled = footer.enabled;
  for (const key of ['text', 'linkLabel']) if (typeof footer[key] === 'string') result.footer[key] = footer[key].slice(0, key === 'text' ? 500 : 100);
  if (isHttpsUrl(footer.linkUrl)) result.footer.linkUrl = footer.linkUrl;
  for (const key of ['backgroundColor', 'textColor']) if (isColor(footer[key])) result.footer[key] = footer[key];
  return result;
}
export function appearanceVariables(value) {
  const settings = safeAppearance(value);
  const result = {};
  for (const [key, entry] of Object.entries(settings.typography)) {
    result[`--appearance-${key}-color`] = entry.color;
    result[`--appearance-${key}-size`] = `${entry.fontSize}px`;
  }
  return result;
}
export function appearanceError(value) {
  for (const key of Object.keys(typographyLabels)) {
    if (!isColor(value?.typography?.[key]?.color)) return `${typographyLabels[key]} needs a six-digit hex color (for example #1F2937).`;
    if (!isFontSize(value?.typography?.[key]?.fontSize)) return `${typographyLabels[key]} needs a whole-number size between 10 and 72 pixels.`;
  }
  for (const [text, limit] of [[value?.logo?.alt, 120], [value?.footer?.text, 500], [value?.footer?.linkLabel, 100]]) {
    if (typeof text !== 'string' || text.length > limit || /[\u0000-\u001f\u007f]/.test(text)) return 'Logo and footer text must be within the indicated length and contain no line breaks or control characters.';
  }
  if (!isSafeLogo(value?.logo?.dataUrl)) return 'Choose a PNG, JPEG or WebP logo no larger than 256 KiB.';
  if (value.logo.dataUrl && !value.logo.alt.trim()) return 'Add alternative text for the logo.';
  if (!isHttpsUrl(value?.footer?.linkUrl)) return 'The footer link must be a complete HTTPS URL without embedded credentials.';
  if (Boolean(value?.footer?.linkUrl) !== Boolean(value?.footer?.linkLabel?.trim())) return 'Provide both a footer link label and URL, or leave both empty.';
  if (!isColor(value?.footer?.backgroundColor) || !isColor(value?.footer?.textColor)) return 'Footer colors must use six-digit hex values.';
  return '';
}
