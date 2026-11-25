# Activity notifications

DocMan creates in-app Activity notices and queues email when affected users' assignments or relevant application state change. Reads, downloads, logins and unchanged saves do not generate activity email. Account invitations and password-reset messages remain their own immediate-email flows.

## Setup after deploying backend and rebuilt Vue together

1. Confirm **System Settings → Outgoing email** is saved and a test email reaches an inbox.
2. Confirm backend `APP_BASE_URL` is the actual public HTTPS application URL. Restart `docman-backend` after editing its environment. Links point to the Activity page and require login; recipients need network access to the application.
3. Open **System Settings → Activity notifications** as a superadmin. **Send activity notifications by email** defaults on. Click **Save notification settings** if changing it.
4. Assign a test user to a document. Expected: one new assignment notice in that user's Activity view and a queued email. The backend polls every 15 seconds; under load, queued messages may take longer.
5. Click **Refresh status** on the settings card. Pending/Sending should progress to Sent. Confirm actual inbox receipt separately; Sent means the mail provider accepted the message.

No new package, Redis queue, cron job or service is required. The running backend delivers the MongoDB queue and scans review due dates hourly. Startup ensures the notification deduplication/queue indexes. Existing historical notifications without a delivery state are not retroactively mailed.

## Event coverage

| Change | Who is notified |
| --- | --- |
| Document author, owner, approver, stakeholder or review-assignee assignment added/changed/removed | Each person whose assignments changed, once even if assigned multiple roles |
| Document metadata/review-state edit, soft deletion or restoration | Associated author, owners, approvers, stakeholders and review assignees |
| Version submitted for approval | Explicit approvers, or owners when no explicit approvers exist; uploader excluded |
| Version published | All associated document users |
| Version rejected or withdrawn | Uploader, owners and eligible designated approvers; no reader-only recipients |
| Account role changed | The affected account |
| Account enabled/disabled | The affected account, including a disablement notice to an inactive account |
| Profile/photo/contact information or password changed | The affected account, with field names and unauthorized-change guidance |
| System update passes deployment service checks | All active, accepted accounts, with installed-version release notes |
| Team membership added/removed or member role/owner changed | Affected members |
| Team invitation to an existing user | Invited user through the existing in-app invitation flow, now also emailed |
| Team metadata/resource associations changed or team deleted | Current/removed members as appropriate |
| Project collaborator/owner/role changes | Affected collaborators/owners |
| Project metadata/status/resource associations changed or project deleted | Current/removed collaborators/owners as appropriate |
| Review task assigned, reassigned, due date/status/updates-required changed, or cycle reset | Assignee, previous assignee and assigner, deduplicated |
| Document review due within 24 hours or overdue | Associated document users; at most one queued reminder per document/due-date/recipient/UTC day |

This does not implement per-user preferences, digests, arbitrary messaging, emails for every page view, or notification of every administrator merely because their role allows access. Team membership does not itself grant document permissions. Pending account invitations use the invitation flow rather than these activity emails.

## Delivery and privacy

Review-task notices are generic account activity and contain no document reference. A newly assigned reviewer can receive them without separate document access; assigning a task does not grant that access. The notice is queued by the assignment's post-save hook, so there is no separate access mutation to coordinate with the task save. Ordinary document notices still require current document access. Previously queued notices retain their original fields and delivery behavior.

Ordinary resource-activity email contains a generic event category and a sign-in link, not document titles/content, attachments, review notes, passwords or tokens. System-update emails additionally contain release notes; profile-security emails contain changed field names and recovery guidance, never their values. Specific in-app notices link to the relevant resource. Current document authorization is checked again before delivering queued document events; stale events are skipped when access has been removed. Assignment-removal/deletion notices are generic and may still be mailed. Missing/pending/inactive recipients are skipped, except explicit account-status notices. Recipient email is read at delivery time.

Each event is an in-app Notification document with hidden email-delivery fields. Workers atomically claim jobs with a two-minute lease. Failed submissions retry with backoff; after five failed attempts they remain Failed for administrator action. Process crashes can recover expired leases. SMTP acceptance followed by a process crash before acknowledgement can produce a duplicate email: this is not an exactly-once SMTP guarantee.

Activity changes and notification insertion are separate database writes. A process crash or queue-write failure between them can leave a missing notification; enqueue failures are logged by the backend. The business mutation is not rolled back or reported as failed solely because email queuing failed. These hooks cover ordinary application single-document saves/updates/deletes; raw database edits, bulk import/insertMany/bulkWrite and arbitrary updateMany bypass this event path. Supported review-cycle resets save individual assignments so they are covered. Review reminder scans deduplicate across restarts/workers through a unique event key.

## Pausing and retrying

If saving notification settings or retrying failed emails commits successfully but its audit append fails, the API returns HTTP 200 with `committed: true`, `auditRecorded: false`, and a recovery message (including the committed retry count). The operation must not be repeated to repair its audit. Preserve the response and have an administrator investigate the audit failure. This does not make the business write and audit append transactional.

- Turning off activity emails pauses the queue; in-app notices continue. Invitations, resets and explicit test emails are unaffected.
- Paused messages remain queued and resume when enabled. Do not use the switch expecting the backlog to be discarded.
- Outgoing email must remain configured. If that provider is disabled/unavailable, activity sends fail and retry.
- Correct SMTP/provider, URL or connectivity issues first, then click **Retry failed emails**. This requeues Failed jobs only; successful emails are not intentionally resent.
- Queue counts are visible to superadmins only. Logs and notices must never include credentials or invitation links. Check `sudo journalctl -u docman-backend -n 100 --no-pager` for `Notification enqueue failed`, `Notification observation failed` or `Notification worker failed` if expected events are missing.
- Keep database backups: the notification queue survives backend restarts because it is stored in MongoDB. Restoring an older database can replay notifications that were already delivered after that snapshot.

## Acceptance checklist

Use synthetic documents and real test inboxes; do not send external notifications without authorization.

1. Assignment: add a stakeholder and approver, verify both receive Activity/email; save unchanged fields and verify no duplicate assignment notice.
2. Role and team: change a test user's role; add them to a team, change membership role and remove them. Verify each affected-user event.
3. Versions: submit, publish, reject and withdraw synthetic versions. Verify recipients match the table and reader-only users do not get pending/rejected version notices.
4. Reviews: assign a task, complete/reopen it and exercise a due-date reminder. Confirm the reminder does not repeat during the same UTC day/due-date.
5. Pause delivery: create an event, confirm in-app notice remains available and email waits; resume and confirm delivery.
6. Failure recovery: use isolated test configuration to fail sending, inspect Failed status after retries, restore working email and retry. Do not disrupt production SMTP to test this.
7. Access removal: queue an ordinary document event while paused, remove recipient access, resume and verify that stale event is Skipped. The generic removal notice may still arrive.
8. Restart while pending: verify persistence and delivery after restart. Real-MongoDB concurrent-worker and crash recovery testing remains required before claiming production reliability.

Local focused event/delivery/hook/account tests and the Vue build pass. The legacy `notifications.test.js` suite cannot currently start under the repository's Jest server-module setup (ES module import error). Live SMTP, browser delivery, and real-database concurrency/failure recovery remain deployment acceptance checks.

Verification result: 85 focused backend tests passed across event detection, queue delivery, mutation hooks, account invitations/administration, SMTP transport, and approval-service regression suites. Vue build and notification model/service imports passed. The separate legacy integration-suite startup failure described above remains unresolved.

## System-update notices

A successful UI or CLI update creates an Activity notice and queues an email for every active, accepted account, regardless of role. Disabled accounts and pending invitations are excluded. The message identifies the installed version and includes that version's section from the installed commit's `CHANGELOG.md`, as plain text, bounded to 12,000 characters. It is not a diff of every skipped release. Missing release notes are reported explicitly rather than invented.

For UI updates, after deploying this feature, run the following **on the server**, once the update has completed and no recovery is pending:

```bash
cd /var/www/docman
sudo bash scripts/update/enable-web-updater.sh
```

Expected: `Syntax OK`, `active`, and `PASS: updater service installed...`. If setup stops, resolve the reported issue before continuing. This refresh is necessary because the root-owned helper is intentionally outside the application checkout. It adds a read-only completion endpoint that does not create or extend browser progress tickets. The backend scans it every minute; the browser does not need to remain open. A matching completed update can be announced after this refresh, including the update that installed the feature. A helper's stale completion for a different installed commit is ignored.

The CLI updater queues notices only after its service checks succeed. Cancellations, failures, recovery-required states and ordinary backend restarts do not create new broadcasts. This confirms deployment service checks, not completion of browser acceptance. Manual deployments bypass the updater; after independently confirming success, an operator may invoke the notification command below with a unique run ID and the installed full commit hash.

Broadcast receipts persist in MongoDB with an initial recipient cutoff. Per-run/per-user event keys prevent duplicate queue entries during retries. Incomplete broadcasts resume after restarts even if a newer update has replaced the helper's latest status. Accounts created after the cutoff do not receive that earlier broadcast. Deleting an already-completed notification does not cause it to reappear on restart.

If a CLI update reports a notification-queuing warning, the healthy deployment remains running. Fix the database/configuration issue first. To retry only the notices, read the successful update's private `report.json` for `run_id` and `target_commit`, then replace both placeholders before running:

```bash
cd /var/www/docman/backend
sudo -u docman env NODE_ENV=production /usr/bin/node \
  src/scripts/notifySystemUpdate.js RUN_ID FULL_TARGET_COMMIT
```

Expected: `System update notifications queued.` A nonzero exit or failure message is not success. This command verifies that the supplied commit is still installed; do not use it for failed updates or invent a new run ID when retrying, because the run ID provides deduplication. It does not perform a deployment or directly send SMTP. Existing receipts are resumed automatically; this command is useful when the initial receipt could not be written. Provider errors are handled separately by **Retry failed emails** in System Settings.

## Profile security notices and in-app alerts

An actual profile change—including photo upload/removal, position, bio, contact details or names—creates a notice for that account. Password changes and successful password resets also create one; login/session-token writes, unchanged saves, rejected changes and initial invitation activation do not. Email is sent to the account's current sign-in address, never the optional profile contact email. The message lists changed field names, never their old/new values, image bytes, passwords, hashes or reset tokens. It instructs the recipient to reset credentials and contact an administrator if the change was unauthorized; SSO users are directed to their identity provider.

The Activity toolbar button shows unread counts and refreshes about every 30 seconds while the page is visible, as well as on navigation and after marking a notice read. Open Activity to read the full notice and use **Refresh activity** to fetch newly queued items. Update notes preserve line breaks and remain escaped text.

The existing **Send activity notifications by email** switch applies to both new notice types: switching it off pauses email but leaves in-app notices available. The outgoing provider must be configured for email to arrive. These are queued security notices, not a separate guaranteed-delivery channel; existing retry limits, SMTP duplicate possibilities and the profile mutation/queue-write gap described above still apply.

Additional acceptance checks:

1. Change a test profile's position, bio, contact email and photo. Expect one Activity notice and email listing those changed fields, with unauthorized-change guidance and none of their values. Confirm the email arrives at the sign-in inbox rather than the new contact address.
2. Save unchanged values and attempt an invalid photo/profile save. Expect no new notice. Successfully change/reset a local password: expect a security notice; wrong-current-password and rejected-policy requests must not create one.
3. With a viewer, editor, admin and superadmin already active, complete an update. Expect one version-and-release-notes notice per account, followed by email. An inactive account or pending invitation must not receive it. Restart the backend and refresh the updater: no extra notice.
4. Cancel an update or simulate a failed update in a disposable test environment. Expect no success broadcast. Exercise queue interruption/resumption without duplicate per-user entries.
5. Pause activity email, perform profile/update events, then resume. In-app notices remain available while paused and pending emails resume afterward. Confirm actual inbox receipt; Sent only means provider acceptance.
6. Check the unread badge, marking read, full multiline notes, mobile layout and signed-out navigation. No Activity badge/API polling should run while signed out.
