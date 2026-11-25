# DocMan end-to-end QA guide

Edition: 25 November 2026 | DocMan 3.1.0 plus pending profile/notification changes | Vue UI and mounted backend APIs

## 1. Scope, baseline and pass criteria

This is an executable manual test plan, not a completed test report. All cases start NOT RUN. It covers the current feature/ui-updates-profile working tree: existing document/security workflows, tabbed settings, UI customization, the stable-release updater, expanded My Profile and detailed update/profile notifications. Package metadata remains 3.1.0 while the pending changelog section is 3.1.1; a version label alone does not prove these changes are deployed. Record the actual deployed commit, local patch identifier and installed updater-helper revision before testing. Do not substitute historical POC successes or unit-test results for a fresh end-to-end run.

The primary end-to-end path is browser -> HTTPS proxy -> Node API -> MongoDB/file storage -> mail provider -> recipient browser. The updater adds the restricted Unix-socket helper, encrypted backup and service restart. API-only modules must be tested over the same HTTP stack with real test data. Books, Categories, Teams and Projects have Vue management controls and must be exercised through both browser and direct API requests. My Profile now includes a photo editor and password-change form. Password-reset screens, full review-task screens, analytics/charts and legacy background-image editing lack equivalent current Vue workflows; test their mounted APIs and record UI coverage gaps separately.

Each test passes only when the visible result, persistence after reload, authorization boundary and relevant side effects match the stated expectation. Expected denial is a pass; a disabled button alone is not evidence of backend authorization. A missing feature is BLOCKED or a defect, not an assumed pass. Mark unavailable optional SSO/SES configurations NOT APPLICABLE with a reason and owner.

Priority labels: P0 is a release-blocking core/security check; P1 is an important functional/operational check requiring an explicit disposition if it fails. These labels prioritize execution and do not replace defect severity triage.

Release gate: no unresolved unauthorized access, credential exposure, silent data loss, corrupt download, approval bypass or unrecoverable migration defect. Review lower-severity failures explicitly. A passing audit-chain check does not establish regulatory compliance or comprehensive security. Never change test expectations simply to match an observed defect.

## 2. Environment and test data

Use an isolated QA deployment, synthetic files and controlled inboxes. Obtain authorization for actual outbound test mail. Do not run destructive, corruption, crash or rate-limit tests against a shared demo while others are using it. Back up the database, uploads, environment and encryption keys first; confirm the restore location is readable only to the operator.

Record: base URL, deployed SHA, database name, Node/Mongo/Redis versions, active UI, browser/version, time zone, proxy config, APP_BASE_URL, configured maximum upload size, encryption state, account policy, approval policy, SMTP provider mode, activity/public-sharing policy, appearance baseline and start time. Also record the source-helper and installed-helper revisions, latest updater run ID, backup mode and whether the read-only notification completion endpoint is available. Record whether the backend listens only where intended. Do not copy secret values into the test record.

Accounts: S1 and S2 are distinct superadmins; A1 is admin; E1 is editor/uploader; E2 is editor/owner; P1 and P2 are viewer accounts assigned as distinct designated approvers; V1 is a viewer/stakeholder; R1 is a viewer assigned as a review assignee; O1 is an unrelated viewer; U1 is an unrelated editor; X1 is an SSO user when configured. Give each controlled email address a unique QA run prefix. Never use real staff accounts as destructive fixtures.

Use separate browser profiles for S1, E1, P1 and V1. Private windows can share IP rate limits and may share a private browsing session with other private windows. Do not treat multiple tabs as independent identities without checking the signed-in account. Test anonymous access in a genuinely signed-out profile with cookies/local storage cleared.

Create files qa-v1.txt containing QA RUN / VERSION ONE and qa-v2.txt containing QA RUN / VERSION TWO, plus qa-v3.txt with distinguishable content. Prepare valid small PNG/JPEG/WebP photo/logo fixtures, invalid/oversized variants, a second controlled contact inbox, one disabled account and one pending invitation for notification exclusion tests. Compute SHA-256 for each original. Also prepare a normal PDF, DOCX, image, empty file, disallowed executable and size-boundary files. Use an isolated storage fixture for malicious names/tampering. Use UTF-8 names, long names, spaces and punctuation as additional variants.

Create a Document category QA-General. Create D1 as E1, owner E2, approvers P1/P2, stakeholder V1, review assignee R1; retain another unrelated private document D2 owned by U1. Start D1 with v1 pending. Create separate disposable D3 for deletion/publicity/corruption tests. Use a run prefix on every fixture so cleanup cannot target real records.

## 3. How to execute and record results

Run sections in order: environment/authentication, accounts, core documents, approval/access, public sharing, notifications, administrative settings, API-only modules, resilience and cleanup. Keep D1 for the version lifecycle; use new documents when a case requires a clean state. Restore global settings after each policy test so later failures are attributable.

For the latest-change acceptance pass, first run ENV-01, ACC-03 through ACC-10, SYS-04, UI-01 through UI-06 and NOT-03 through NOT-10. Then run UPD-01 through UPD-09 on a disposable deployment and repeat ENV-01, VER-01, STO-01, MAIL-01 and the profile/notification checks after updating. Run NOT-08 only after UPD-03 has established a successful update. Do not mark the rest of the full suite passed because this shorter pass succeeds.

For every case record Case ID, build SHA, tester, time/time zone, browser, actor, fixture IDs, actual result, PASS/FAIL/BLOCKED/NOT APPLICABLE, evidence location and defect ID. For repeated endpoint tests add method/path and actor variant. Save sanitized screenshots, HTTP status/body, correlation time, affected audit sequence and SHA-256 comparisons where relevant. Never save raw bearer tokens, passwords, invitation URLs, SMTP secrets or public-link tokens in shared evidence.

Use browser Developer Tools -> Network to inspect method, URL, payload and status. For API-only actions use an approved HTTP client with separate private environments per actor. Set BASE_URL to your QA HTTPS origin, use Content-Type: application/json except multipart uploads, and send Authorization: Bearer <actor token> for authenticated routes. Obtain the token from that test account's login response and keep it only in the client's secret variable store. Do not place it in committed collections or shell history. Raw public-link requests must omit authentication.

Request recipes: category POST /api/categories with name, description and type Document; team POST /api/teams with name and description; project POST /api/projects with name, description and teamIds; book POST /api/books with title, description, category, documents and owners. Use actual fixture IDs and valid enum values from the models. Document creation is multipart field file plus metadata strings and JSON arrays for assignments. Review POST /api/reviews uses documentId and assignments: [{assignee, dueDate, notes}]. Treat these as recipes, not secret-bearing files.

For each API route in Appendix A, execute the route checklist there in addition to the domain cases below. The appendix lists the mounted route, handler and source middleware so a tester can locate its request contract. Missing or inconsistent contracts are defects; do not mark an endpoint tested because a related screen passed.

## 4. Deployment and navigation

### ENV-01 - Healthy application through HTTPS [P0]
Setup: deployed test build, services started, trusted QA certificate.
Steps: open BASE_URL; refresh /documents directly; sign in; request GET /api/docs anonymously in the HTTP client; inspect service logs for startup errors.
Expected: app assets and deep links load; authenticated list succeeds; anonymous private list returns 401 without document data. No mixed-content or certificate bypass is required. Capture response status and startup time.

### ENV-02 - Role menus and loaded-row search [P1]
Setup: each role logged into its own profile; fixtures exceed one visible row.
Steps: inspect every navigation item; search a loaded document title; clear it; use an impossible search; repeat on Books/Categories/Teams/Projects; directly navigate to hidden administrative routes as V1.
Expected: authorized menu/routes work, unauthorized routes are redirected/denied, no private data leaks. Search filters loaded rows only and shows useful empty states. Record incomplete pagination/server-search coverage as a limitation rather than claiming global search.

### ENV-03 - Usability, keyboard and responsive layout [P1]
Steps: use keyboard-only navigation, tab order, Enter submission and visible focus; test at 390px and desktop widths and 200% zoom. Open dialogs, cancel, submit invalid fields and wait for loading states. Repeat essential journeys in supported Edge/Chrome/Firefox versions.
Expected: core controls remain reachable, labels/error text are readable, dialogs can be exited and duplicate clicks do not create duplicate mutations. Record horizontal table behavior, screen-reader labeling and contrast defects separately.

## 5. Authentication, invitations and policy

### AUTH-01 - Invite, activate and login [P0]
Actor: S1 and a new controlled recipient.
Steps: System Settings -> Security -> Users -> Create user; provide unique identity and viewer role. Confirm Invitation pending. Attempt login before acceptance. Receive email, open link, submit a policy-valid password twice, sign in with username, then email.
Expected: pending login denied; email arrives; activation succeeds once; both supported identifiers sign in; account becomes active and no raw password/token appears in responses/logs/audit.

### AUTH-02 - Resend, expiry, revocation and replay [P0]
Steps: create separate pending accounts; resend one and try its old link; revoke another; expire a third in an isolated fixture or wait 24h. Reuse an already accepted link. Submit two concurrent accept requests for one fresh token.
Expected: old, expired, revoked and consumed links fail; only one concurrent acceptance succeeds. Opening/scanning a link alone must not consume it. A displayed setup form is not proof the token remains valid.

### AUTH-03 - Delivery failure and recovery [P1]
Setup: isolated SMTP sink configured to reject messages.
Steps: invite once; observe failure response and pending row; restore SMTP; resend on that same row; accept newest link.
Expected: no duplicate account, no premature activation, clear failure state, successful recovery. Capture provider rejection and final inbox receipt separately.

### AUTH-04 - Password policy boundaries [P0]
Steps: S1 sets minimum 24; reject values 13, 25, fractional and string via API. Test 23/24 characters, 72/73 UTF-8 bytes, spaces, Unicode and controls in invitation, registration, reset, admin reset and My Profile. Keep an existing 18-character account and sign in without changing it.
Expected: policy accepts integer 14-24 only; new passwords enforce live minimum and 72-byte maximum, reject controls; old login password still works. No undocumented composition counts. Restore baseline minimum.

### AUTH-05 - Self-registration off/on [P0]
Steps: switch off; check login link and POST /api/auth/register directly. Enable; register a unique user while requesting superadmin in the payload; inspect resulting role. Switch off again.
Expected: off blocks UI/API creation; on can create only viewer accounts. Current self-registration does not verify email ownership; record this behavior and never describe it as verified enrollment. Non-superadmins cannot change policy.

### AUTH-06 - Login failures, limiter and logout [P0]
Steps: wrong password, unknown identity, disabled user and pending account; valid login; logout; replay the old token; cross-role login in separate sessions. In isolation exceed the login limit and then wait for expiry.
Expected: no unauthorized session, generic credential failure, old logged-out credentials rejected where applicable. Limiter returns 429 and later permits legitimate login. Record shared-IP effects and actual reset window; do not restart services merely to make the test pass.

### AUTH-07 - Reset/refresh backend flow and missing UI [P0]
Steps: POST /api/auth/forgot-password for known and unknown emails; compare responses; obtain controlled reset token from mailbox; POST /api/auth/reset-password with token/password; replay and expire tokens; exercise GET /api/auth/refresh with legitimate and invalid refresh cookies, then logout.
Expected: non-enumerating reset request response; valid reset changes password, used/expired token rejected, stale sessions/refresh credentials cannot retain access. Test concurrent reset submissions and record any race. Current Vue lacks the reset-password screen referenced in mail: report the browser journey gap, even if the API passes.

### AUTH-08 - SSO and identity linking [P0, conditional]
Steps: with test Authentik configured, complete login/callback; test invalid state, invalid code, expired token, provider outage and denied account. S1 opens Authentik Linking, links a fixture identity, then tries duplicate/conflicting mapping. Try mapping as A1/V1.
Expected: valid subject maps to the intended user only; bad callbacks rejected; no account takeover or privilege escalation; only superadmin can link; local password UI does not alter provider password. If provider unavailable, mark BLOCKED/NOT APPLICABLE with owner.

## 6. Account administration and self-service

### ACC-01 - Manage accounts and privilege boundaries [P0]
Steps: S1 searches and paginates Users; edits a fixture's name/department/role; disables then enables it. As V1/E1/A1 call /api/users/manage GET/POST/PATCH directly. Attempt duplicate username/email and object/operator values.
Expected: only superadmin manages accounts; changes persist; disabled account and stale sessions lose access; duplicates/invalid inputs produce controlled 4xx. Password/hash/reset/invitation/SMTP secrets never appear in account listings.

### ACC-02 - Protect administrators and pending users [P0]
Steps: attempt self-disable/demotion; attempt removing the last active superadmin; use S2 to manage S1 while preserving a remaining superadmin. Try pending email/password/manual-enable changes. Exercise reset on active local and SSO accounts.
Expected: self/last-superadmin protections hold under concurrent requests; pending invitation restrictions hold; local reset hashes once and revokes old sessions; SSO password reset is refused. Restore both test superadmins.

### ACC-03 - My Profile information and persistence [P1]
Steps: as V1 open My Profile from the menu and toolbar at /profile. Edit first/last names, telephone, position, department, biography, contact email, location and HTTPS website. Save, reload and sign in again. Repeat a successful edit as E1, A1 and S1. Change the optional contact email to a second controlled inbox and verify the sign-in identity remains unchanged.
Expected: allowed fields persist for the signed-in user only; position maps to title in the API. Contact email is separate from sign-in, recovery and notification email. New photo/contact fields are available through the own-account DTO, not an anonymous directory. Actual edits generate the security notice tested in NOT-06; unchanged saves do not.

### ACC-04 - My Profile password and sessions [P0]
Steps: keep two logged-in sessions; submit wrong current password, mismatched confirmation and weak new password; then valid change. Try old/new passwords and replay prior session/reset/refresh credentials. Race two changes using the same old password.
Expected: failed attempts leave password unchanged; valid change succeeds once, new password works, old sessions/reset/refresh tokens fail; concurrent stale update cannot overwrite the winner. No cleartext/hash in responses.

### ACC-05 - Legacy profile and media APIs [P0]
Steps: PUT /api/users/:id with password/email/role/identity fields; attempt another user's profile edit as ordinary viewer. Upload a valid profile image and background image via their multipart fields, read them through /uploads, replace and delete; try executable, SVG/script, traversal and a document-storage filename.
Expected: legacy credential/access bypass rejected; ownership checked; valid legacy profile media works; document files never become public through /uploads. These legacy APIs/background images are separate from the new My Profile data-URL photo; do not treat one path's pass as coverage of the other.

### ACC-06 - Photo upload, replacement, removal and discard [P1]
Setup: valid PNG, JPEG and WebP fixtures below 256 KiB, plus an account with a saved photo.
Steps: select a new photo and inspect its unsaved preview; Discard and reload. Select and Save, reload, replace and Save, then remove and Save. Repeat with keyboard controls on mobile. Restore an isolated database backup containing the photo.
Expected: only Save persists the draft; Discard restores the last saved photo. Removal restores initials/fallback. Database backup includes the photo without a new public upload URL. Legacy file-based pictures are not automatically imported. Each actual persisted change creates one profile notice; selection/discard alone creates none.

### ACC-07 - Profile and photo input boundaries [P0]
Steps: submit empty required names, 255-character ordinary fields, 501-character bio, 2,049-character website, invalid contact email and control characters. Test a multiline bio, HTML as text, HTTPS website, HTTP/javascript/data URLs and embedded URL credentials. Test valid images at the 256 KiB boundary and above it, SVG, non-image data, wrong signatures, remote URLs and invalid base64 through the API.
Expected: required/length/type/scheme restrictions are enforced server-side; valid plain text and supported raster images persist. Unsupported input returns controlled validation errors without changing the saved profile or queuing a notice. Raw image bytes never appear in notices, email or audit exports. Check the resulting display; a filename/MIME label alone is not proof of a valid image.

### ACC-08 - Profile routes, roles and protected fields [P0]
Steps: open /profile as viewer, editor, admin and superadmin. Open /account?test=qa#contact and inspect the redirect. Repeat signed out and as X1. PATCH /api/users/me/account with role, email, username, isActive, sessionVersion, identityProvider, password and another user's ID. Try concurrent account disablement during save.
Expected: all local roles can edit their own profile; the legacy route preserves query/hash and requires login. Protected/unknown fields are rejected and another account cannot be targeted. Disabled/pending/provider-managed accounts cannot use this local edit path. SSO profile/password controls are read-only; sign-in identity remains administrator-managed.

### ACC-09 - Profile failure feedback and committed-save recovery [P1]
Steps: simulate initial profile-load failure, failed save, then a successful profile write followed by a failed session/display refresh using a QA proxy or fixture. Retry loading and inspect the stored account directly. Test rapid double Save and changing a photo while Save is in progress.
Expected: load failure provides Retry and does not permit editing guessed defaults; failed writes preserve the draft. A committed save followed by refresh failure is reported as saved with a refresh warning, not a failed mutation to repeat. Controls prevent conflicting submissions and re-enable after completion. No extra profile event is created merely by retrying a read.

### ACC-10 - Password success feedback and recovery instructions [P0]
Steps: complete ACC-04 and NOT-07. Verify policy text changes after the superadmin changes its minimum. Submit mismatched confirmation, a too-short password and more than 72 UTF-8 bytes; then a valid password. Inspect the success page and use its sign-in action.
Expected: rejected attempts do not mutate credentials or send a success notice. Success clears local session state and password inputs, offers sign-in, and the new password works. The notice instructs reset of credentials and contact with an administrator for unauthorized changes, with identity-provider guidance for SSO. The separate missing reset-password browser screen remains a known gap, not a passing recovery journey.

## 7. Document creation and metadata


### DOC-01 - Required fields and initial creation [P0]
Actor: E1. Steps: omit each of title, description, author, category, Opens For Review and file; then create D1 with all valid fields and assignments. Refresh details and library.
Expected: missing values rejected without partial records/orphan uploads; valid create persists correct metadata and v1 awaiting approval under baseline policy. A viewer cannot create by API. Capture IDs and original file hash.

### DOC-02 - Metadata and assignment edits [P0]
Steps: E2 edits description and assignments; verify names after reload. V1 tries same API. E1 tries changing author and server-owned currentVersion/deletedAt/history fields. A1 changes author through permitted administrative path.
Expected: editing follows account role plus authorship/ownership; readers denied; server-owned fields cannot be forged; author changes restricted to admin. Revision shows actor and before/after values without changing published file bytes.

### DOC-03 - Private sharing and revocation [P0]
Steps: V1 reads/downloads D1 as stakeholder; O1 requests its exact URL and download API; add O1 as review assignee, then remove all its assignments. Test O1 before and after removal with an existing session.
Expected: assigned user reads approved data; outsider denied; newly assigned access works; removal takes effect on next request. Remove one of several assignments and confirm remaining assignment still grants access. Team membership alone is insufficient.

### DOC-04 - Review dates, custom intervals and contacts [P1]
Steps: set custom interval 1 then invalid 0/negative; set known Opens For Review/due dates; compare input, saved API, details and revision in UTC and a negative-offset browser time zone. Add/edit/remove external contacts with valid/invalid email/type.
Expected: valid interval/date data survives round trips; date-only calendar values do not shift a day. The observed one-day detail display issue must remain a FAIL until corrected. Contacts persist correctly and do not create accounts or grant document access.

### DOC-05 - File types, names and size limits [P0]
Steps: upload normal TXT/PDF/DOCX/image, unsupported executable, empty file, misleading extension/MIME, long Unicode filename and malicious path. Upload just below, at and above the configured byte limit through proxy and direct backend in isolated QA.
Expected: permitted files download unchanged; unsupported/oversized/unsafe input rejected with meaningful 4xx; no path traversal, arbitrary overwrite or orphan record. Proxy and app limits align; record actual byte/MB interpretation instead of assuming it.

### DOC-06 - Partial create and duplicate submission [P1]
Steps: induce review-assignment API failure after successful document POST; inspect library before retry. Double-click create and retry after simulated lost response. Run simultaneous creates with distinct files.
Expected: UI should expose recoverable state and avoid silent duplicates; any existing document must be discoverable. Record duplicate/partial behavior as a defect, not expected success merely because separate APIs are used. Clean only run-specific fixtures.

## 8. Version lifecycle and approvals

### VER-01 - Publish initial version [P0]
Steps: E1 attempts self-approval via API; P1 opens Approvals, downloads and approves v1; P2 inspects result.
Expected: uploader denied under default policy; one eligible distinct approval publishes under threshold 1 even with two approvers assigned. Approval actor/time/comment recorded, private reader download matches original hash.

### VER-02 - Replacement while old publication stays live [P0]
Steps: E1 uploads qa-v2 with What changed?; V1 downloads current publication; P1 approves v2; V1 downloads again; owner downloads retained v1.
Expected: v2 pending does not replace v1; after approval v2 current and v1 Superseded; each download hash matches its original. Metadata edit alone must not create a file version.

### VER-03 - Reject and withdraw [P0]
Steps: upload v3, attempt reject with blank reason then reject with reason; verify current remains v2. Upload another version and withdraw; test unauthorized withdrawal and second concurrent pending upload.
Expected: required rejection reason, correct states and recipients, previous publication unchanged; unauthorized mutation denied; one active pending/publication-in-progress record only.

### VER-04 - Pending-version access and decisions [P0]
Steps: V1/O1 request pending/rejected/withdrawn file URLs directly; P1 and E1 request legitimate pending versions; substitute fileId from D2 under D1 path; approve as non-designated stakeholder and unrelated admin-role variants according to policy.
Expected: restricted versions only to authorized editors/approvers; document/file binding enforced; no IDOR. Admin document authority does not bypass no-self-approval. Ordinary published-read access does not confer decision rights.

### VER-05 - Policy variants and unavailable quorum [P1]
Setup: isolated configuration with recorded restore values.
Steps: set threshold 2, approve once then twice with distinct users; repeat approval by same user; test no explicit approvers fallback to owners; test uploader-only approver; separately disable approval and upload.
Expected: distinct count enforced; no duplicate vote; fallback correct; impossible approval configuration does not silently publish; no-approval mode publishes with audit. Per-team/per-document policy UI is deferred, not an available control. Restore defaults.

### VER-06 - Concurrency and interrupted publication [P0]
Steps: synchronize two upload requests, two approvals and two retry-publication requests against disposable fixtures. Inject a process interruption at publication persistence boundaries in a controlled environment, restart, then retry.
Expected: one active pending version; unique monotonic version/revision records; no duplicate publish/approve audit entries; recoverable current version with correct bytes. Verify actual MongoDB indexes and final state, not only mocked tests. Capture timing and logs without secrets.

### VER-07 - History, compare and audit restrictions [P1]
Steps: inspect Revision history and Audit trail as owner, approver, stakeholder and outsider; call version/history/compare/revisions endpoints using valid, invalid and cross-document versions.
Expected: visible history agrees with mutations; private audit restricted; comparisons never expose a forbidden version; malformed IDs and missing versions return controlled errors. No filesystem paths or publication recovery snapshots exposed.

## 9. Public sharing

### PUB-01 - Anonymous current publication [P0]
Steps: authorized editor enables sharing and copies link; open without auth; inspect JSON and download v2. Upload v3 pending; download public again; approve v3 and retry.
Expected: current approved file only; pending v3 hidden until published; same link advances after approval. Public JSON contains title/filename/size/version only; no assignments, description, storage path, token echo or audit/history.

### PUB-02 - Denial and token boundaries [P0]
Steps: try private document ID instead of token, random/malformed token, token for document with no publication, direct private APIs without auth, cross-document file query parameters and alternate HTTP methods. Enable sharing as V1/O1 by direct API.
Expected: unavailable public references return 404; no publication gives no file; private API stays protected; only authorized editors/admins manage sharing; URL parameters cannot select older or pending files.

### PUB-03 - Individual revocation and deletion [P0]
Steps: disable D3 link; request old page/download fresh; re-enable and compare token; delete D3 and request new link; restore and test again.
Expected: revoked token permanently invalid, re-enable generates different token, deleted document inaccessible. Restore can reactivate the retained token; document this behavior. Already downloaded copies cannot be recalled.

### PUB-04 - Global policy truth table [P0]
Steps: S1 sets enabled=true with either secondary value: create/use links. Set enabled=false and disableExistingLinks=false: try old link and new enable. Then set both false/true respectively: try old page/download. Re-enable globally.
Expected: enabled allows links; disabled/preserve keeps old links but denies new creation; disabled/block denies all anonymous pages/downloads; re-enable restores retained links. Individual revocation remains possible while globally off. Verify backend API, not only switch appearance.

### PUB-05 - Global privilege, failure and propagation [P0]
Steps: call GET/PUT /api/system/public-sharing as anonymous/V1/E1/A1; send invalid types/extra fields as S1; use two backend instances, toggle policy and request each; simulate settings DB read failure.
Expected: superadmin-only settings; strict booleans; both instances observe uncached policy; lookup failure fails closed with no file data. Requests already authorized may complete; do not claim cancellation of in-progress transfers. Audit records policy change without bearer link token.

## 10. Storage, deletion and restoration

### STO-01 - Encryption and round-trip integrity [P0]
Steps: enable encryption with configured key; upload and approve known file; compare stored bytes against plaintext and authorized/private/public download hashes. Upload once with encryption off in isolated QA, then re-enable and download both.
Expected: encrypted stored bytes differ, downloaded plaintext hashes match originals; FileProtection metadata exists; keys never returned to browser. Changing storage policy is not retroactive re-encryption. Older files remain readable with their original metadata/key.

### STO-02 - Missing key, missing file and tampering [P0, destructive fixture]
Steps: back up D3 bytes and metadata; remove test key from an isolated instance, then restore; rename one stored file; modify a copy's stored bytes; retry downloads through private and public paths. Restore original fixture/key.
Expected: fail closed, meaningful error and integrity audit, no successful corrupt plaintext; streamed corruption may terminate an already-started response rather than return clean JSON. Do not tamper with shared files or lose the only key copy.

### STO-03 - Soft delete and restore [P0]
Steps: admin deletes fixture with reason; ordinary user checks list/direct/download/public URLs; admin opens deleted list and restores; verify versions, original hashes and assignments.
Expected: deleted resources unavailable normally; restore preserves correct history/content; access policy still enforced. Viewer/editor cannot delete or restore through forged requests. Inspect retained public link after restoration.

## 11. Activity and outgoing email

### NOT-01 - Document event recipients [P1]
Steps: add/change/remove each assignment role, edit metadata, submit/publish/reject/withdraw, delete/restore. Keep multiple roles on one recipient; save unchanged values.
Expected: affected users get in-app notices and queued generic mail according to docs/activity-notifications.md; no duplicate assignment notice for overlapping roles or unchanged save; reader-only recipients do not get restricted version decisions. Actual inbox receipt tested separately from Sent count.

### NOT-02 - Membership/account/review notices [P1]
Steps: change account role/status; team membership/member role; project collaborator role; review assignee/due date/status. Inspect prior and new assignee mailboxes and Activity.
Expected: affected users notified, deduplicated; disabled-account status notice may still mail; pending invitation accounts use invitation flow. These resource/account-role emails remain generic: no document content, titles, review notes, keys or credentials. The detailed profile/update notice types are tested separately below.

### NOT-03 - Activity ownership and read state [P0]
Steps: list Activity, unread count, mark one read, mark all read and delete own notice via API. Substitute another recipient's notification ID in read/delete requests.
Expected: only own notices visible/mutable; unread counts persist; resource links still enforce current authorization. Mark-all/delete currently require API coverage beyond Vue Mark read.

### NOT-04 - Pause, queue recovery and access removal [P1]
Steps: pause activity email, generate events and confirm in-app notices; remove recipient access to a queued document event; resume. Restart backend while jobs pending. Cause five send failures using a test sink, restore mail and Retry failed emails.
Expected: paused backlog preserved; ordinary stale-access mail skipped, generic removal notice may still send; pending jobs survive restart; failed jobs retry only after requested recovery. Invitations/reset/test emails are not paused by this switch.

### NOT-05 - Concurrent workers, leases and reminder dedupe [P1]
Steps: two QA workers claim a queue; interrupt one after claim; wait beyond its two-minute lease; restart. Trigger repeated due-reminder scans within the same UTC day and across next day/due-date change.
Expected: one active claim normally; expired lease recovered; daily document/due-date/recipient reminder deduplication. SMTP acceptance followed by crash may duplicate mail. Mutation and enqueue are separate writes: simulate enqueue failure and record logged missing notice; do not claim transactional or exactly-once delivery.

### NOT-06 - Profile notices across fields and roles [P0]
Setup: enabled activity email, working test provider, distinct sign-in and optional contact inboxes; repeat with viewer, editor, admin and superadmin fixtures.
Steps: change names, position, department, bio, phone, contact email, location, website and photo, first together and then one field at a time. Save and inspect Activity, queued state and inbox. Repeat unchanged Save and Discard; submit an invalid edit.
Expected: the affected account receives one notice per actual mutation, not one per changed field. The notice lists changed field names and unauthorized-change guidance without old/new values, photo bytes or secrets. Email goes to the current sign-in address, not optional contact email. Other users receive no profile notice. Unchanged/rejected/discarded edits produce none. Allow normal 15-second queue polling and backlog time before diagnosing non-delivery.

### NOT-07 - Password notices and suppression [P0]
Steps: change a local password in My Profile, perform a successful password reset through the supported API, and perform an administrator reset on a fixture. Compare rejected current-password/policy requests, login/logout/refresh, newly created accounts and initial invitation activation.
Expected: successful password mutations create an affected-user security notice that names password without including it, its hash or tokens. Login/session writes, rejected writes and initial invitation activation do not create a profile-change notice. A reset-request email is distinct from the notification that a reset completed. Existing pause/retry policy applies to the queued notice.

### NOT-08 - Successful release broadcast and detailed mail [P0]
Setup: complete UPD-03; refresh the installed helper as in UPD-01. Have active accepted fixtures in all four roles, one disabled account and one pending invitation; record account creation times.
Steps: close the updater browser after completion and inspect each active user's Activity and controlled inbox. Compare version and message to the target commit's CHANGELOG section. Restart backend and refresh updater status; create a new account after the broadcast cutoff.
Expected: one system_updated notice per active accepted account, independent of role or open browser, within the one-minute scan plus queue/backlog time. Disabled/pending accounts and accounts created after the cutoff are excluded. Email contains target-version notes, not a fabricated summary of skipped versions; absent notes have an explicit fallback and long notes are bounded. Restart/re-observation does not enqueue the same run again. Service-check success is not a claim that browser acceptance passed.

### NOT-09 - Broadcast failure, resume and email controls [P0, isolated deployment]
Steps: pause activity email and complete a test update; inspect in-app notices before resuming mail. Interrupt fan-out after one recipient, restart, and allow another completed run to replace the helper's last status. Test a queue failure before receipt creation, then follow the documented notice-only retry using the original successful run ID and installed commit. Exercise cancelled/failed/recovery-required updates and a stale helper completion for a different installed commit.
Expected: paused mail remains pending while Activity works. Persisted incomplete receipts resume, even after a newer run, with per-run/per-user queue deduplication and the original cutoff. Initial enqueue failure requires recovery; do not invent a new run ID to retry. Failed/cancelled/mismatched updates create no success broadcast. Ordinary document mail remains generic. SMTP acceptance/crash may still duplicate email; neither profile mutation/queue writes nor SMTP delivery are exactly-once guarantees.

### NOT-10 - Unread badge, detail safety and mobile alerts [P1]
Steps: create profile and update notices for V1. Observe the Activity badge while visible, navigate between pages, open Activity, use Refresh activity, mark a notice read, hide/restore the tab and test at 375px/768px/desktop widths. Sign out and switch accounts. Use synthetic markup and a long line in controlled release-note fixtures.
Expected: badge refreshes about every 30 seconds while visible and on navigation/read updates; it stops being shown/polled when signed out and does not display a previous account's response after a session switch. Read counts match the API. Multiline details remain readable and escaped; markup does not execute and long lines do not force page overflow. Failed badge refresh does not interrupt the current task. Mark-all/delete remain covered through their APIs.

### MAIL-01 - SMTP modes and saved settings [P0]
Steps: with controlled server test IP-authorized relay and authenticated SMTP; STARTTLS, direct TLS and approved unencrypted relay. Save sender/reply-to/host/port; send test; inspect inbox. Try password authentication with no encryption and invalid host/port/sender.
Expected: valid modes deliver; insecure password mode and invalid settings rejected; test uses saved settings; SMTP acceptance and inbox delivery recorded separately. Use approved QA endpoints, not hard-coded organization infrastructure.

### MAIL-02 - Secret retention, SES and provider changes [P0]
Steps: save credentials, reload with blanks, save unchanged; change host/username and try retaining old password; switch service/auth mode; test concurrent edits/revision conflicts. If available test SES role and stored-key modes plus environment mode, then Disabled.
Expected: encrypted credentials not returned; unchanged blanks retain only compatible credentials; changed targets require new secrets; switching clears obsolete credentials; conflicting edits controlled. Disabled stops sends; lack of key blocks storing credentials. Capture no secret values.

## 12. Reviews and organizational APIs

### REV-01 - Review assignment lifecycle [P1, API]
Steps: POST /api/reviews with D1 and [{assignee:R1,dueDate,notes}]; GET document/user task lists; PUT task status, requiresUpdates and updateNotes; mark document reviewed via /api/docs/:id/review; start/reset another cycle through supported application operation.
Expected: correct assignee, deadline, status and review state; per-document/task permissions enforced; new cycle resets appropriate tasks and notifies affected users; no automatic publication from marking reviewed. Validate valid enums against ReviewAssignment model before sending.

### REV-02 - Review visibility, overdue and cleanup [P0, API]
Steps: O1 requests R1 tasks and D2 tasks; admin lists overdue; create controlled duplicate/orphan fixture and run /api/reviews/document/:documentId/cleanup; repeat as ordinary viewer.
Expected: no unauthorized private task/document metadata, overdue selection correct, cleanup restricted and does not delete valid unrelated tasks. Record deadline time-zone boundaries and backup cleanup fixtures.

### ORG-01 - Categories and Books [P1, browser + API]
Steps: in Categories, admin creates/edits Document and Book categories, filters types and paginates; editor creates a book with title/description/category/owners, opens details, links/unlinks a readable document, edits and deletes the book. Repeat mutations as viewer and non-owner admin; request D2 directly through book association APIs.
Expected: saved rows survive reload, document access is unchanged, non-owner administration is denied except superadmin, and deletion requires confirmation. Categories reject duplicate/invalid names and wrong type. In-use categories cannot be deleted or have their type changed, including references from soft-deleted documents. Deleting a book cleans team/project links without deleting documents.

### ORG-02 - Teams and invitations [P0, browser + API]
Steps: E1 creates a team in Teams, opens Members, adds E2 and changes their role. Invite an existing active account from Invitations; sign in as that recipient and accept in Activity. Try wrong-account acceptance, replay, expired token and concurrent acceptance. Toggle member invites, try an ordinary member inviting an admin, remove/leave membership and delete a fixture.
Expected: ownership/application-role boundaries hold, owner cannot be removed/demoted, member invite policy is enforced, and invitations are bound to the intended active account and consumed once. Team-management responses omit invitation tokens. New or pending accounts must activate through Users first. Viewer can inspect their own Teams without gaining create/manage controls. After an invitation expires, sending a fresh invitation to the same account succeeds and only the new token works. Changes notify affected users; failure to enqueue an invitation is recoverable rather than silently reported as delivered.

### ORG-03 - Projects and collaborators [P0, browser + API]
Steps: create a project with name, description and accessible teamIds. Edit status/priority/dates/tags, clear dates, try end-before-start and invalid enums. Add an eligible linked-team member as direct collaborator, change role, remove/leave; inspect inherited team members. Exercise list, search, my-projects, team filter, detail and deletion as owner, manager, superadmin and unrelated caller.
Expected: owner/manager permissions apply, only active eligible accounts appear, populated identities behave like IDs, unrelated users cannot list/open private projects, viewers can inspect their projects without write controls, and invalid inputs do not mutate records. Removing a direct collaborator does not erase inherited team access. Owner cannot be removed/demoted; manager cannot delete the project. Clearing dates persists. Deletion cleans document/team links without deleting the resources.

### ORG-04 - Team/project resource associations [P0, browser + API]
Steps: use team resource tabs to associate/dissociate projects, books and documents; use project details for books/documents. Inspect associated/available lists before and after. Repeat requests with duplicate IDs, malformed/nonexistent IDs, D2 and unrelated callers. Try linking a project managed by another user to a team. Exercise individual document-removal and batch routes.
Expected: no duplicate or unauthorized changes, visible lists refresh, selectors obey document visibility, and associations do not grant document permission. Team-project linking requires the authority to manage the project as well as team resource access; an account-wide admin role alone must not bypass owner/team-admin/project-manager requirements. Cancellation performs no write; deletion/cleanup errors remain visible. Test every association method in Appendix A.

### ORG-05 - External contacts and types [P1, API]
Steps: admin creates/edits/deletes a type and contact; list contacts and by-document entries; attach contact during document create/edit. Try viewer mutations, invalid email/type, nonexistent document and a contact attached only to D2.
Expected: authorized CRUD works, validation and visibility hold, no implicit account creation/access. Follow actual mounted type routes in Appendix A; record type operations not mounted as a feature gap.

### ORG-06 - Analytics and custom charts [P0, API]
Steps: get analytics and export as V1/O1/admin; create chart with name, chartType, dataSource, xAxisField/yAxisField and permitted filters from model; list/detail/data/edit/delete; test isPublic chart and private-document datasets.
Expected: aggregates/exports/chart data respect document read filters even when chart is shared; no raw forbidden IDs or counts that reveal private data. Invalid fields/operators/datasources rejected. No current Vue analytics editor is claimed.

### ORG-07 - Management recovery and responsive controls [P1, browser]
Steps: test all four management sections at desktop/tablet/375px; navigate by keyboard, open/cancel dialogs, submit missing/oversize fields, fail one list/detail/selector request and use Retry. Simulate a save timeout, check for persisted data before retrying, and reload after success. Verify a metadata-only book edit preserves all document associations, including links not visible to the current actor.
Expected: forms remain usable, dialogs scroll, no page-level overflow hides primary actions, controls have useful labels, loading/busy states prevent duplicate submission, stale route data is cleared, public-sharing load failures disable writes until Retry succeeds, errors are actionable and successful saves reflect server state. Local fixture checks do not substitute for real database writes or multi-user authorization tests.


## 13. Audit, system and operational tests

### AUD-01 - Audit filters, exports and chain [P0]
Steps: perform known mutation/download/denial, filter Audit Log by actor/action/outcome/date, paginate; export CSV/JSON; S1 runs Verify integrity; A1/V1 try verification/read/export as allowed/denied.
Expected: consistent event attribution, timestamps and filters; chain valid; administrative access enforced; no secrets. Open CSV safely and test formula-like user text does not execute spreadsheet formulas. A missing expected event is a defect, not proof no action occurred.

### SYS-01 - Settings permissions and persistence [P0]
Steps: enumerate account, storage, email, notification and public-sharing GET/PUT routes as each role; save valid changes/reload/restart; send invalid types, extra keys and parallel writes. Re-test UI messages after rejected saves.
Expected: intended superadmin boundaries; storage read allowed to uploaders; no silent default on read failure; policy persistence and correct audit. New defaults do not accidentally publish private documents or enable self-registration.

### SYS-02 - Redis and operational information [P1]
Steps: admin uses System Settings → Security → Redis Re-test/Apply; exercise configured self-hosted/Upstash/memory modes in isolated environment; simulate unavailable provider; read system info/performance as admin then viewer.

System Settings navigation regression: as superadmin, verify Security, Email & Notifications, Storage, UI Customization and Software Updates tabs. Edit a setting without saving, switch tabs, and return; its unsaved value should remain without triggering a save. Confirm updater progress continues across tab changes. As admin, confirm Security, Storage and UI Customization appear, with existing Redis read-only behavior and deleted-document restoration; superadmin cards must remain hidden. Check keyboard tab navigation and horizontal tab scrolling at a narrow mobile width. Switching tabs must not trigger an update, send an email, or restore a document. A page reload is not expected to preserve unsaved form values.

Security administration navigation: Users, Audit Log, and Authentik Linking must no longer appear as separate sidebar entries. Open them under System Settings → Security. Superadmins can reach all three; admins can reach Audit Log but not Users or Authentik Linking. Verify existing `/admin/users`, `/admin/audit`, and `/admin/authentik-linking` bookmarks reach the integrated panels with equivalent permissions. Test refresh and browser Back/Forward across tabs, user-form drafts, audit filters/exports, and identity-linking controls. Anonymous users must sign in; non-administrative users must not reach these panels.
Expected: effective rate-limit store/error accurately reported, no passwords or internal secrets returned, authorized-only operational info, no accidental resetting of auth protections. Restore provider and retest limiter.

### SYS-03 - Maintenance guards [P0, disposable database only]
Steps: with destructive-tools flag off call clear/restore/archive/generate endpoints; as nonsuperadmin repeat. In an independently disposable seeded database, enable flag, run each supported action and verify exact collection/file effects and audit before discarding database.
Expected: disabled flag denies every destructive route; privileged role alone is insufficient. Enabled behavior matches request and does not reach paths outside configured storage. Never enable this on a shared or production server merely to complete a checklist.

### SYS-04 - Integrated tabs and direct-link authorization [P0]
Steps: verify S1 sees Security, Email & Notifications, Storage, UI Customization and Software Updates; A1 sees Security, Storage and UI Customization. Open Users/Audit Log/Authentik Linking under Security and their old URLs. As A1 request /admin/system?tab=email, ?tab=updates, ?tab=security&section=users and ?tab=security&section=authentik; repeat as V1 and signed out. Exercise Back/Forward, reload and keyboard tab selection.
Expected: only permitted sections load; admin can view Audit Log and customize appearance but cannot gain superadmin rights through a query or redirect. Backend protected endpoints deny unauthorized calls, not just hide controls. Old URLs preserve intended routing and permissions. Switching tabs preserves drafts/filters and updater observation without committing side effects; page reload may discard unsaved drafts.

### UI-01 - Appearance access and draft isolation [P0]
Steps: A1 and S1 open UI Customization, edit typography without saving, switch tabs and return, then Discard. Save a distinct setting and reload in another signed-in and anonymous session. Attempt PUT /api/system/appearance as viewer/editor/anonymous and GET anonymously.
Expected: admin and superadmin can persist application-wide branding. Unsaved changes affect preview only and Discard restores saved settings. Anonymous GET returns only public appearance fields; unauthorized writes fail without changing branding. Applied appearance reaches Vue login/public pages, not email templates, exported documents or legacy React/docs sites.

### UI-02 - Typography and link states [P1]
Steps: test regular/hover/active/visited link colors, H1-H6 and paragraph colors/sizes against representative semantic text. Use six-digit hex colors and integer sizes 10 and 72; reject malformed colors, sizes 9/73/fractional and unsupported input types. Exercise keyboard focus, hover and activation; save and reload.
Expected: valid settings persist and apply where supported without breaking button/status readability. Visited-color setting is retained; visited links and previews use normal link size and the visited-size control is disabled. Do not demand browser history disclosure from computed visited styles. Record contrast/accessibility concerns and restore a readable baseline.

### UI-03 - Logo upload and privacy [P0]
Steps: select a supported PNG/JPEG/WebP logo up to 256 KiB, supply alternative text, preview, save, reload and remove it. Reject SVG, remote data, invalid signature/base64, oversized image and missing alternative text. Inspect appearance response and audit event.
Expected: a valid logo replaces the wordmark; removal/defaults restore it. Invalid content cannot be stored through a forged API request. The logo is public branding, not a private profile image; audit entries omit image bytes and private settings. New sessions and anonymous pages receive only public appearance data.

### UI-04 - Menu placement and responsive navigation [P1]
Steps: save left, right and top menu placement in turn. Navigate to documents, profile and settings at desktop/768px/375px and 200% zoom. Toggle the narrow-screen drawer, switch settings tabs and reload.
Expected: saved placement persists; mobile navigation remains reachable with usable focus and labels. Header/profile/Activity controls and notices do not overflow after transitions settle. Changing placement never grants hidden roles or resets an in-progress updater merely because its tab was hidden.

### UI-05 - Footer text and URL validation [P0]
Steps: enable footer, enter text and HTTPS link/label, save/reload on signed-in and public pages, then disable. Try HTML/script text, javascript/data/HTTP URLs, embedded credentials, excessive text and unknown API fields. Inspect the target of a valid external link.
Expected: configured text and link render safely as text and the footer hides after a saved disable. Unsafe configuration is rejected without altering the previous footer. The external link uses safe opener handling. Restore baseline footer and verify document download contents were not modified by branding.

### UI-06 - Defaults, failed reads and saved-with-warning [P1]
Steps: make a difficult-to-read test theme, use Restore defaults, inspect preview and save. Simulate appearance-load failure and malformed stored data in an isolated clone. Simulate successful settings storage followed by audit failure, then reload; test two administrator saves with different values.
Expected: public rendering falls back to safe defaults when needed; the editor requires a successful settings load before edits. Restore defaults requires Save to persist. A committed change with audit failure is reported as saved with warning, not an instruction to repeat the mutation. Concurrent saves use last-save-wins; record that limitation. Database backup/restore preserves saved branding.

### UPD-01 - Helper setup and read-only notification observation [P0, server operator]
Setup: disposable supported Ubuntu installation; trusted HTTPS, operator access, reviewed checkout and no active update/recovery. Follow docs/deployment/web-updates.md; an application update does not replace the root-owned helper.
Steps: run sudo bash scripts/update/enable-web-updater.sh from /var/www/docman. Confirm Syntax OK, active and PASS. Check control.sock is root:docman 660 and progress.sock is root:www-data 660. Request /_docman-update/status without a progress ticket; inspect installed helper revision. Observe background completion checks without opening the updater UI.
Expected: unauthenticated progress returns 403 and no private details. Setup refuses active maintenance/recovery. The new notification-status control operation returns completion metadata only and does not mint/extend browser tickets. The app has no broad sudo/arbitrary-command access. An old helper lacking this operation requires refresh; missing notices before refresh are BLOCKED setup, not a pass.

Steps: in Software Updates, check helper readiness with matching files, a legacy helper, mismatched startup fingerprints, missing socket and failed capability response. Refresh the helper while idle, then click Recheck helper readiness. Repeat GET /api/software-updates/helper as non-superadmin and anonymous. Inspect the confirmation and completed-update messages.
Expected: matching running files show ready; legacy/mismatched helper shows explicit server-action warning, affected features and setup command. Missing/unverified state never reports ready. Unauthorized requests are denied. The check is independent of GitHub discovery and does not install anything. Completion requires reloading and checking the newly installed release; the old pre-upgrade UI cannot retroactively display these warnings.

### UPD-02 - Stable release discovery and privileges [P0]
Steps: S1 checks releases; compare installed version and published upstream stable releases. Test no-newer-release state and upstream outage. In a controlled fixture include older/same versions, prereleases, drafts and a tag without a published release. Call discovery/status/start/answer/cancel routes as A1, V1 and anonymous; try a forged tag/commit, moved tag and unexpected payload.
Expected: only published newer stable releases are installable; the chosen commit is revalidated. Errors do not fabricate available releases. All control APIs remain superadmin-only, with generic availability errors and no credentials. Forged/moved releases are rejected before deployment; staging does not overwrite live source merely to check for updates.

### UPD-03 - Successful interactive update and regression smoke [P0, isolated deployment]
Setup: two reviewed stable versions with a newer published test release; synthetic database/files, working provider/sink and restorable backup. Record old commit, hashes and keys without exposing secrets.
Steps: choose the release, type UPDATE in uppercase without the colon, follow LOCAL or approved SAVED backup prompts and use the correct existing repository password or a valid new one. Confirm INITIALIZE only for a verified new/empty destination. Let the updater finish, reconnect and sign in. Record report/run ID and old/target commits; test document read/upload/replacement/approval/download, profile, email, settings and audit integrity.
Expected: backup is verified before mutation; build/migration/publish/service checks complete in order. UI reports the new version; files, accounts, keys and policies survive. Browser regression results are recorded separately from service success. Complete NOT-08/09 to validate notices. Never initialize over an existing repository to bypass a password failure.

### UPD-04 - Reconnection, stale prompts and competing starts [P0]
Steps: while a prompt is waiting, change settings tabs, reload the browser and reconnect using the authorized session. Submit an old prompt response after advancing, click Start twice and try a second superadmin start. Refresh during backend downtime and after it returns; test expired/missing progress tickets.
Expected: one update runs; current prompt/stage survives supported reconnection and hidden tabs. Old responses cannot answer a newer prompt; competing starts are denied. Expired/missing tickets deny progress until authorized recovery. Answers and repository passwords never appear in audit, ordinary API responses or screenshots. Reconnection must not silently restart deployment.

### UPD-05 - Backup destination and current password limitation [P0]
Steps: test LOCAL and configured SAVED on separate clones, including missing SAVED configuration, unavailable destination, wrong existing password and a new password below the requirement. Cancel at a waiting pre-deployment prompt. Preserve private diagnostics and service state.
Expected: no deployment proceeds without a valid encrypted backup. LOCAL is an encrypted same-server recovery snapshot, not off-server disaster recovery. Invalid password currently stops with generic update failure/report guidance; record this as the known deferred usability defect. Specific validation feedback and three total attempts are requested future behavior, NOT implemented or a passing expectation in this build. Never record password values in evidence.

### UPD-06 - Failure before mutation [P0, disposable clone]
Steps: independently inject build failure, backup failure and preflight failure before source/database mutation. Capture current commit, service state, frontend hash and backup/report identifiers before and after each attempt; remove the injected fault before retrying.
Expected: original application remains running or is restored, with its prior source/data/assets intact. Failure report identifies recovery context without exposing secrets. There is no successful-update notification. Do not classify an unchanged private report ID or generic UI failure alone as proof of rollback; verify the old application works.

### UPD-07 - Post-mutation failure and restore [P0, destructive clone]
Steps: inject migration/start/health failure after mutation; separately interrupt the helper during an active run. Inspect private report and ACTIVE state, then follow documented operator recovery with the matching encrypted snapshot. Use a mail sink during restoration and verify original hashes, credentials and audit chain.
Expected: unsafe post-mutation deployment is stopped/quarantined or flagged for operator recovery; no automatic code-only rollback over a changed database is assumed. Further updates require resolution. Interrupted/failed/recovery-required states produce no success broadcast. Restoring a database may replay email; record duplicate-risk behavior rather than claim exactly-once delivery.

### UPD-08 - Notification enqueue failure after a healthy update [P1]
Steps: in a disposable clone fail notice queuing after update service checks, then restore the queue. Observe the application and report. Exercise automatic pending-receipt recovery and, where initial receipt creation failed, run the documented notifySystemUpdate.js retry with the same successful run ID and installed full commit. Repeat that retry; try a mismatched installed commit.
Expected: a mail/queue problem does not roll back or quarantine a healthy deployment. Warning/private diagnostics support recovery. Same-run retries do not create a second queued event per recipient; mismatched commit is rejected. Retry failed SMTP jobs separately through notification settings. No success notification is sent for a failed deployment merely to clear an error.

### UPD-09 - Refresh helper safely after upgrade [P0]
Steps: after a successful app update with no recovery pending, rerun helper setup from the reviewed deployed checkout; verify Apache, helper service and socket ownership, then perform discovery and an unauthenticated progress request again. In a clone, attempt setup during an active update and force Apache configuration validation failure.
Expected: installed helper reflects reviewed code without weakening privilege boundaries. Active updates prevent replacement. Invalid Apache changes are restored to the pre-invocation state, with no misleading PASS/reload. Successful helper refresh enables background update notices for a matching completed run without resending completed receipts. Deferred backup-password retry behavior remains unchanged.

### OPS-01 - Backup, update and rollback [P0, clone]
Steps: back up known published files/accounts/settings/queue and keys; update a cloned server following the Ubuntu guide or approved update.sh options; run migration dry-run and actual migration plus verifyAuditChain; restore backup in isolation and replay core smoke path.
Expected: correct code/assets/env/ownership, original passwords and file hashes work, encryption keys preserved, audit valid, rollback recovers content. Restored queues may replay mail: use a sink. Test installer/updater failure and recovery on a fresh supported Ubuntu LTS VM, not the only demo.

### OPS-02 - Service failures and resource limits [P1]
Steps: in QA stop/restart MongoDB, Redis and SMTP individually; simulate disk-full/permission-denied on a dedicated upload volume; interrupt client upload/download; refresh afterward. Restore each dependency before next scenario.
Expected: clear controlled errors, no publication of partial/corrupt files, recoverable service and queue state, no stale unauthorized access. Capture memory/disk recovery and orphan-file cleanup. Do not fill the real root filesystem.

### SEC-01 - Cross-cutting API authorization and injection [P0]
Steps: apply Appendix A matrix to every route: no token, invalid/expired token, lowest role, unrelated user, authorized user. Substitute IDs, operators/objects, invalid pagination, huge strings, HTML/script, cross-resource relationships and unsupported methods.
Expected: consistent 4xx/denial without data/state change; no 500 due to routine bad input, privilege escalation, XSS or NoSQL injection. Verify post-denial database state and side effects, not just HTTP status.

### SEC-02 - Logs, transport, cache and direct file exposure [P0]
Steps: inspect proxy/API responses for TLS and relevant security headers; request uploaded document filename through /uploads and static roots; inspect cache after logout/revocation; search test logs/exports for known synthetic secret markers and public-link URLs.
Expected: private documents unavailable from static paths; no reusable secrets in responses/audits. Public routes use no-store and noindex; link paths can appear in proxy access logs and must be protected. Browser headers are defense-in-depth, not authorization. Do not publish real log contents.

## 14. Automated checks and evidence

Run focused checks from backend with NODE_ENV=test and the repository's Jest runner. On PowerShell set $env:NODE_ENV='test', then node node_modules/jest/bin/jest.js --runInBand with selected test paths. On Linux use NODE_ENV=test npm test -- --runInBand. Use npm run build from frontend-vue for the Vue build. Root build scripts may reinstall dependencies; inspect before running. Run npm run security:audit from the root and preserve its complete report rather than weakening the gate.

Relevant suites include accountProfile, accountInvitations, userAdmin, publicDocuments, notificationEvents, notificationDelivery, notificationHooks, systemUpdateNotifications, notificationVisibility, notificationSettingsCommit, emailTransport, compliance/documentAccess, compliance/approvalService and compliance/auditService. Also run the appearance/settings and frontend profile/navigation regressions, and python3 -m unittest discover -s scripts/update -p 'test_*.py' in Linux for the updater. Run the repository's broader tests and Linux verification scripts as documented; some legacy integration startup issues have previously existed. A test-runner setup error is BLOCKED, never PASS. Record actual command, environment, exit code and report path.

For concurrency, use actual MongoDB and the deployed code, including verifyAuditConcurrency.js in a disposable database. Mocked unit tests cannot prove unique-index behavior, worker leases, atomic invitation acceptance, multi-instance policy propagation or encrypted download through Apache. Retain a sanitized HAR only after removing tokens/cookies/URLs containing bearer links.

## 15. Results, defects and cleanup

Use the companion qa-results-template.csv. One row per case and one row per API route/actor variant when expanded. Record evidence without credentials. Defect format: summary; build; actor/role; fixture; exact steps; expected; actual; reproducibility; severity; sanitized evidence; cleanup required. Distinguish product defect, infrastructure outage, test-data error and unimplemented UI.

Known validation concerns to carry forward: deferred updater password-feedback/three-attempt UX (documented, not implemented); separate installed-helper refresh requirement; date-only one-day display mismatch; missing Vue password-reset page; incomplete live notification/concurrency validation; queue insertion separate from business mutation and at-least-once mail; large frontend bundle warning. These are not automatic waivers. Historical dependency findings are time-sensitive: use a fresh audit of the actual lockfiles.

Cleanup: export results; revoke every test public link; restore global sharing/registration/password/approval/email/storage/Redis policies and appearance; remove run-specific users, tasks and organizational fixtures in dependency order; retain audit evidence; securely remove temporary bearer tokens and downloads; ensure test mail cannot reach real recipients. Record the final application commit, helper version and backup/run IDs; retain recovery snapshots and secrets in the approved private location. Do not delete completed broadcast receipts to reset tests: use a new controlled run to avoid duplicate mail. Verify original document hashes and normal sign-in after cleanup. Do not bulk-clear application data to tidy a shared server.

Sign-off must list executed build, total PASS/FAIL/BLOCKED/NOT APPLICABLE, unresolved P0/P1 defects, approved deferrals and responsible approver. State exactly which browsers, provider modes, network paths and API-only functions were not tested. A POC demo acceptance is not production security approval.

## 16. Source and maintenance notes

Source references: frontend-vue/src/router/index.js and views/components; backend/src/routes; middleware/documentAccess.js; services/approvalService.js, storedFileService.js, notificationDeliveryService.js and publicSharingPolicy.js; controllers/accountController.js and publicDocumentController.js; docs/account-invitations.md; docs/my-profile.md; docs/ui-customization.md; docs/activity-notifications.md; docs/deployment/web-updates.md; docs/deployment/ubuntu-server-installation.md. Appendix A is regenerated from mounted source routes, not a manually remembered feature list.

When routes change, regenerate the PDF/route inventory and add domain-specific cases for new state transitions. Do not equate generated route presence with executed coverage. Add screenshots only from an identified build using synthetic data; do not label illustrations or mocked screens as captured deployment evidence.
