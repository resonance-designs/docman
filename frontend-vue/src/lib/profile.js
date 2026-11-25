export const profileFields = ['firstname', 'lastname', 'title', 'department', 'telephone', 'contactEmail', 'location', 'website', 'bio', 'avatarDataUrl'];
export function profileDraft(user = {}) {
  return Object.fromEntries(profileFields.map(key => [key, typeof user[key] === 'string' ? user[key] : '']));
}
export function safeAvatar(value) {
  return typeof value === 'string' && value.length <= 350000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';
}
export function profileError(profile) {
  for (const key of profileFields.filter(key => key !== 'avatarDataUrl')) {
    const value = profile[key];
    const limit = key === 'bio' ? 500 : key === 'website' ? 2048 : 254;
    const controls = key === 'bio' ? /[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/;
    if (typeof value !== 'string' || value.length > limit || controls.test(value)) return `Check ${key}: maximum ${limit} characters and no unsupported control characters.`;
  }
  if (!profile.firstname.trim() || !profile.lastname.trim()) return 'First and last name are required.';
  if (profile.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail.trim())) return 'Enter a valid contact email address.';
  if (profile.website.trim()) {
    try {
      const value = profile.website.trim(), url = new URL(value);
      if (!/^https:\/\//i.test(value) || url.protocol !== 'https:' || !url.hostname || url.username || url.password || /[\s\\]/.test(value)) return 'Website must be a complete HTTPS URL without credentials.';
    } catch { return 'Website must be a complete HTTPS URL.'; }
  }
  if (profile.avatarDataUrl && !safeAvatar(profile.avatarDataUrl)) return 'Choose a PNG, JPEG or WebP profile photo no larger than 256 KiB.';
  return '';
}
export function passwordChangeError(current, password, confirmation, minimum) {
  if (!current) return 'Enter your current password.';
  if (password !== confirmation) return 'New passwords must match.';
  if ([...password].length < minimum) return `Use at least ${minimum} characters for your new password.`;
  if (/[\x00-\x1f\x7f]/.test(password)) return 'Your new password cannot contain control characters.';
  if (new TextEncoder().encode(password).length > 72) return 'Your new password must be at most 72 UTF-8 bytes.';
  return '';
}
// A refresh failure after a committed save must not falsely report that the write failed.
export async function saveAndRefreshProfile(api, profile, refreshProfile) {
  const { data } = await api.patch('/users/me/account', profile);
  let refreshFailed = false;
  try { await refreshProfile(); } catch { refreshFailed = true; }
  return { user: data.user, refreshFailed };
}
