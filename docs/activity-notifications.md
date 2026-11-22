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

Email contains a generic event category and a sign-in link, not document titles/content, attachments, review notes, passwords or tokens. Specific in-app notices link to the relevant resource. Current document authorization is checked again before delivering queued document events; stale events are skipped when access has been removed. Assignment-removal/deletion notices are generic and may still be mailed. Missing/pending/inactive recipients are skipped, except explicit account-status notices. Recipient email is read at delivery time.

Each event is an in-app Notification document with hidden email-delivery fields. Workers atomically claim jobs with a two-minute lease. Failed submissions retry with backoff; after five failed attempts they remain Failed for administrator action. Process crashes can recover expired leases. SMTP acceptance followed by a process crash before acknowledgement can produce a duplicate email: this is not an exactly-once SMTP guarantee.

Activity changes and notification insertion are separate database writes. A process crash or queue-write failure between them can leave a missing notification; enqueue failures are logged by the backend. The business mutation is not rolled back or reported as failed solely because email queuing failed. These hooks cover ordinary application single-document saves/updates/deletes; raw database edits, bulk import/insertMany/bulkWrite and arbitrary updateMany bypass this event path. Supported review-cycle resets save individual assignments so they are covered. Review reminder scans deduplicate across restarts/workers through a unique event key.

## Pausing and retrying

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
