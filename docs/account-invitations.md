# Account invitations and registration

## Before creating accounts

Deploy the backend and rebuilt Vue frontend together. No database migration is needed: existing accounts keep their status and password. Confirm **System Settings → Outgoing email → Send a test email** works. Configure `APP_BASE_URL` to the actual public HTTPS application address in the backend environment and restart the backend after changing it. Invitations use this trusted configuration, never the incoming Host header. A recipient must be able to reach the application URL; an internal-only installation still requires network/VPN access.

The initial superadmin is still created with the installation helper. That bootstrap process does not depend on email.

## Invite a user

1. Sign in as a superadmin and open **Users → Create user**.
2. Enter the person's name, real reachable email, unique username and role. No password is entered by the administrator.
3. Click **Create user**. Expected: **Account created and invitation sent**, with **Invitation pending** in the list. The account cannot sign in yet.
4. The recipient opens the emailed link within **24 hours**, enters a password satisfying the displayed policy twice, and clicks **Activate account**. Expected: **Account activated. You can now sign in.**
5. Sign in using that username/password. Reusing the invitation must produce **Invalid or expired invitation**.

Only a hash of the random invitation token is stored. Acceptance atomically consumes the token and activates the account. The link's fragment keeps the token out of ordinary HTTP access logs. Opening/scanning the link alone does not activate anything; submitting a password is required. Treat the email link as private.

If activation commits but its audit append fails, the API returns HTTP 200 with `activated: true`, `auditRecorded: false`, and a warning. The account is already active: sign in with the chosen password instead of reusing the invitation or requesting another one. Have an administrator investigate the audit failure. The UI preserves the sign-in action and displays this warning.

If email delivery fails, the account remains pending and the UI explicitly reports the failure. Do not create a duplicate account. Fix outgoing email and click **Resend invitation** on the existing account. Resending replaces the token, invalidating earlier links. **Revoke invitation** invalidates the invitation and leaves the account disabled. A revoked account can be manually reset/enabled by a superadmin, but is no longer eligible for invitation resending. Pending email changes and manual password resets are blocked; revoke first if correcting the address. Mail-server acceptance is not proof of inbox receipt.

## Account policy

Superadmins use **System Settings → Accounts and passwords**:

- **Minimum password length:** integer from **14 to 24**, default **18**. This is a minimum, not a maximum password length. Longer passwords are accepted up to the existing bcrypt limit of **72 UTF-8 bytes**. Spaces/punctuation are allowed, control characters are rejected. No additional composition counts are introduced by this change.
- **Allow local self-registration:** default **off**. Off hides the local registration link and rejects direct registration API calls. On exposes the registration form and allows only viewer accounts; clients cannot choose elevated roles. This legacy self-registration flow activates accounts immediately and does not verify mailbox ownership. Use invitations when email verification is required.

The saved database policy replaces `LOCAL_SELF_REGISTRATION_ENABLED` for local registration. That old environment variable no longer controls this route. This switch does not control Authentik's own enrollment process.

Policy changes affect newly set passwords (invitation acceptance, registration, password resets and profile password changes), not existing login passwords. Existing bootstrap/CLI helpers retain their documented bootstrap password rules. An invitation is checked against the policy in effect when accepted, not when sent.

## Verification checklist

- Non-superadmins cannot change policy, create accounts or resend invitations.
- New accounts cannot sign in before accepting an invitation.
- Valid invitation activates once; expired, resent or revoked links fail.
- A failed email leaves a recoverable pending row; resend works after correcting email configuration.
- Change minimum to 24: a 23-character password fails, a valid 24-character password succeeds. A password over 72 UTF-8 bytes fails. Restore desired policy after testing.
- With self-registration off, both UI and direct API registration are unavailable. Enable it temporarily: a new account receives viewer role only, then switch it off again.
- Verify successful activation and administration events in the audit log without passwords or invitation tokens.

Local automated validation covers policy boundaries, token hashing/expiration filters, atomic consumption update, registration gating, and administration access. Live SMTP invitation delivery, browser activation and a real-database concurrent acceptance test remain deployment acceptance checks; development test email alone does not establish invitation delivery.

Local verification for this change: 44 focused backend tests passed (account invitations/policy and user administration); Vue production build passed with the existing chunk-size warning. These are not live SMTP/browser or real-MongoDB concurrency acceptance results.
