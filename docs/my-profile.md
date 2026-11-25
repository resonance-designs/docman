# My Profile

Every signed-in user can open **My Profile** from the menu or toolbar, or visit `/profile`. Existing `/account` links redirect to the profile page. This is your own account page, not a public directory or a way to edit another user's account.

## Edit your information

1. Open My Profile and wait for your saved information to load. If loading fails, use Retry.
2. Edit your first and last name, position/job title, department, telephone, optional contact email, location, website, and short bio.
3. Optionally choose a PNG, JPEG, or WebP photo up to **256 KiB**. Check the preview before saving. Replace or remove the photo using the page controls. SVG, remote image URLs, and oversized files are not accepted.
4. Save the profile. Expect a confirmation, then reload to verify the stored values. Discard returns to the last loaded/saved values; photo changes also require saving.

Actual changes create an Activity notice and queue an email to your sign-in address (subject to the application's activity-email setting). The notice names the changed fields without copying their contents. Password changes also generate this security notice. If you did not authorize a change, reset your credentials immediately through the sign-in page (or your identity provider for SSO) and contact your administrator. Saving unchanged information or submitting a rejected change does not generate a notice.

First and last name are required. Ordinary text fields allow up to 254 characters, bio allows 500 characters, and website allows 2,048 characters. A website must be a full HTTPS URL without embedded credentials. Bio is plain text; markup is not executed.

Your sign-in email, username, and role are read-only. Contact a superadmin to change sign-in identity. The optional **contact email** is profile information only: it does not change the address used for sign-in, password recovery, invitations, or notifications, and is not separately verified. New contact/photo fields are returned through your authenticated account endpoint, not a public photo URL.

## Change your password

For a local account, enter your current password, a new password, and the matching confirmation. The page shows the current configured minimum; new passwords must also fit the 72 UTF-8-byte limit. A failed current-password or policy check leaves the password unchanged.

After success, DocMan signs you out. Sign in again using the new password. Existing sessions and outstanding refresh/reset credentials are invalidated. If rate limiting prevents a request, wait before retrying; do not disable authentication protections.

Accounts managed by an external identity provider show a provider-management notice. Their profile and password remain read-only here; change them through the identity provider.

## Operations and acceptance

The photo is stored as a bounded data URL on the user record, so normal database backups include it. No new upload directory, environment variable, dependency, or data migration is required. Existing legacy file-based profile pictures are not imported into this new photo field; upload a photo in My Profile to set it.

Verify on the deployed application:

- Viewer, editor, admin, and superadmin can open their own profile; signed-out visitors must sign in. `/account` redirects preserve query/hash values.
- Save all supported fields, reload, and confirm persistence. Contact-email edits must not change sign-in or notification email.
- Upload, replace, discard, remove, and reload a photo. Test invalid/oversized images and a photo with missing/broken image content.
- Check mobile layout, labels, keyboard access, and photo fallback initials.
- Wrong current password, too-short/oversized new password, and mismatched confirmation are rejected. A successful change signs out the browser, rejects old sessions, and permits login with the new password.
- SSO-managed profiles remain read-only and local password changes are denied.
- Unrelated account fields and other users' IDs cannot be submitted through the self-service update endpoint.

Local automated checks and mocked browser fixtures do not establish remote database, identity-provider, or end-to-end deployment acceptance.
