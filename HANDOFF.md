# HANDOFF — DocMan 2.3.0 compliance hardening

## Superadmin web updater — November 24, 2026

Implemented System settings → Software updates: newer published non-prerelease GitHub releases only, exact commit selection, required encrypted backup with LOCAL POC or operator-configured SAVED storage, interactive prompts, and read-only progress while the backend stops. Backend API requires superadmin; a root-owned broker runs separately with fixed repository/tag restrictions and no arbitrary command endpoint or broad sudo rule. First deploy the feature using the existing CLI updater, then run `sudo bash scripts/update/enable-web-updater.sh` once on the server. Helper code is intentionally outside the mutable checkout and later helper upgrades require operator setup. See [complete web updater setup and recovery](docs/deployment/web-updates.md). The operator deployed feature commit e0da7c3 and installed its helper on NMDOH development: migration, 158-entry audit verification, HTTPS, socket permissions, unauthenticated progress rejection, and superadmin release discovery passed. Full UI update/restore acceptance is pending. These results precede the PR #54 review fixes.

The user confirmed Render auto-deploy was disabled and the old service suspended after the Pages repair. This is user-reported completion; no authenticated Render inspection was performed here.

Web updater local validation: 68 targeted tests passed (33 CLI, 10 broker/worker, 12 backend API, 13 frontend), Vue production build and setup-script Bash syntax passed. The existing bundle-size advisory remains. Initial helper deployment passed as recorded above; full restore acceptance remains pending.

PR #54 follow-up fixes: reject interrupted helper responses; serialize installer/broker starts with an installation lock plus the existing CLI lock; filter published GitHub release metadata on discovery and start. Validation: 46 Linux updater tests, 15 backend tests, and Bash syntax passed. After deploying these fixes, rerun helper setup to replace the root-owned copies. GitGuardian incident 41063984 flags pwd.getpwnam('docman').pw_uid, a Unix account lookup with no embedded password; classify this specific incident as false positive.

## Deployment automation follow-up — November 24, 2026

The master documentation workflow at `4d04b6d` failed during Setup Pages because the repository Pages site was missing (HTTP 404). Pages was enabled with `build_type: workflow`; rerun `45457088369` passed both build and deployment. The local documentation build also passed. GitHub reports a nonblocking Node 20 action-runtime deprecation warning; action upgrades remain separate maintenance. No active Render deployment workflow or Render repository webhook was found; the obsolete external Render service still requires dashboard retirement. Auto-Deploy Off stops Git-triggered deployments, while suspension is separate. No authenticated Render access was available and no Render service setting was changed. See the maintainer guide for both recovery procedures.

## PR #50 fixes for 3.0.2 — November 22, 2026

PR #52 follow-up: the November 23 eight-finding pass was committed as `55fcf35`. The November 24 five-finding pass repairs no-op relationship mismatches, pending-status reporting, scan fairness, the concurrency test predicate, and tokenless session expiry. See the [follow-up record and validation](docs/reviews/pr-52-coderabbit-3.0.2.md). The latest changes remain uncommitted and undeployed. Project/team relationship reconciliation runs with the backend; see [recovery guidance](docs/resource-management.md). The optional migration cursor optimization remains deferred.

The initial 42 PR #50 fixes were committed on `bugs/3.0.1-fixes`; see [individual dispositions and validation](docs/reviews/pr-50-coderabbit-3.0.2.md). The root and application/documentation package manifests are version **3.0.2**. No deployment is established by these source changes. Preserve the existing 3.0.1 release tag; do not claim that server installations have these fixes.

Existing installations need the safe Apache access-log configuration applied separately: the updater intentionally preserves Apache configuration. Follow the updated installation/manual guide and address historical token-bearing logs separately. Complete fresh-Ubuntu/systemd/restic restore and live browser/SMTP acceptance before claiming deployment validation. The manual generator now records current metadata; previously generated PDFs retain their old metadata until rebuilt.

## Hosting retirement — November 20, 2026

Render is no longer a deployment target. Removed active hosting instructions/navigation and replaced legacy NODE_ENV=render startup scripts with production mode. Use self-hosted Ubuntu/Linode guidance. The external service/Git integration and obsolete DNS records are not controlled by this repository and have not been disabled here; retire those before merging if automatic deployment is still enabled. Historical changelog entries remain historical.


## Resource management interfaces — November 20, 2026

Follow-up gap pass: team/project resource permissions aligned with management roles; malformed inputs and invitation resend/reuse cases tested. Activity resource names are filtered by current access. Vue retries, route-change handling and mobile account actions corrected. Browser checks use synthetic API fixtures; live database, SMTP and multi-user acceptance remain separate. Final follow-up verification: 186 focused tests passed, Vue production build passed, both PDFs rebuilt/rendered. Fixed the document detail review-date timezone shift; timestamps remain localized.

Implemented Vue category/book/team/project management, role-aware forms, resource linking, collaborator role updates and team invitation acceptance through Activity. Backend fixes cover populated membership checks, readable document selectors, project/team list visibility, category reference protection and deletion cleanup. No deployment performed. See [operations and acceptance checks](docs/resource-management.md). The PDF manuals now include these management screens and updated QA procedures. Preserve earlier uncommitted account, notifications and public-sharing work.


## Activity notifications — November 20, 2026

Implemented persistent activity-email delivery and mutation-based notices for document assignments (including approvers/removals), account roles/status, team/project membership and resource changes, review tasks/reminders, and file publication workflows. Added superadmin Activity notifications switch/counts/retry controls. No new infrastructure dependency; backend worker polls every 15 seconds, review scan hourly. Existing invitations/resets remain separate. See [operations, coverage and limits](docs/activity-notifications.md). Snapshot/change hooks use ordinary Mongoose writes; queue insertion is not transactional with the business mutation, and SMTP delivery is not exactly once. Local changes only; live NMDOH notification tests have not run. Preserve the ignored local operations note; do not publish its temporary infrastructure workaround.


## Account invitations and policy — November 20, 2026

Implemented superadmin account invitations (24-hour, hashed single-use tokens, inactive until accepted), resend/revoke controls, public activation page, and account settings. Minimum length configurable 14–24 (default 18); the 72-byte bcrypt cap remains. Self-registration defaults off and is controlled in the database, replacing LOCAL_SELF_REGISTRATION_ENABLED; enabled public signup is viewer-only and still does not verify email. See [operations and acceptance checklist](docs/account-invitations.md). Existing accounts are unchanged. Initial CLI bootstrap remains independent of email. Changes are local, not deployed to NMDOH. Live invitation/browser and real-database concurrency acceptance remain pending. Do not include private local operations notes or temporary infrastructure workarounds in commits.


## Fresh-server installer and NMDOH validation — November 18, 2026

Follow-up user requirement: provide an `update.sh` as well. Implemented the standard-layout updater and [complete update/recovery guide](docs/deployment/automated-updates.md), with `--check`, interactive target selection or `--ref`, builds before downtime, a mandatory encrypted pre-update snapshot, the shared maintenance lock, staged dependencies/Vue publication, migrations and HTTPS checks. It supports the existing non-root checkout owner (including NMDOH's `rbakos`) and `docman-build`. Obtain the updater in a separate tools clone on old servers; do not pull the live checkout first and lose the old source baseline. No automatic code-only rollback after mutation: failures stop writers and retain an ACTIVE guard plus recovery artifacts. Missing encryption/email machine keys are generated only if no corresponding encrypted records exist; existing keys/credentials/accounts are preserved. Local safety/backup integration evidence is in the update guide; full Ubuntu VM update/reboot/interruption acceptance remains pending. No NMDOH update was executed.

New explicit user requirement: provide a repository-root interactive Bash `install.sh` that installs **all application prerequisites and configuration on a fresh latest-LTS Ubuntu server**, prompting where input is necessary. Keep it and the beginner walkthrough synchronized; do not assume preinstalled Apache, MongoDB, Node or backup tools. Human passwords remain user-chosen (18+ characters); encode connection-string values automatically, generate machine keys separately, and preserve credentials/keys on retries.

Implemented on `feature/poc-release-validation`: `install.sh`, private Python configuration helpers, account bootstrap, Apache/systemd templates, optional restic backup scheduling and local safety tests. [Installer walkthrough](docs/deployment/automated-installation.md) covers obtaining/cloning prerequisites, prompts, success/failure, retries, key recovery, mail setup and remaining acceptance. Target Ubuntu 26.04 LTS x86_64/AVX; fail on unsupported OS or a newer LTS in the updated distribution catalog rather than mixing repositories. Native services only. npm runs unprivileged. Installer configures `NODE_HOST=127.0.0.1`; unset preserves existing Node listening behavior. Privileged retry helpers/state are root-only and separate from build-owned application source. The installer refuses an existing deployment and is **not an updater**.

Verification details and pending fresh-VM acceptance are in the installer walkthrough. No installation has been performed on NMDOH by the assistant. Do not equate syntax/unit/bootstrap tests with a successful fresh Ubuntu installation. Full certificate issuance, package/reboot/interruption tests and an isolated backup restore remain acceptance tasks. Email starts disabled and is configured through the existing superadmin UI; no test mail is sent by the installer. Daily backup and audit verification share the maintenance lock because audit verification itself writes an event.

Parallel ongoing objective: update NMDOH's existing POC and document end-to-end results in [the execution record](docs/deployment/nmdoh-poc-validation.md). Latest user evidence: clean server checkout at `67b1790` on `feature/compliance-hardening`; backend/Apache/MongoDB/Redis active; 37 GB free. Waiting for the user's backup-tool/timer inventory before deployment changes. The fresh installer must **not** be run there. Preserve existing database/files/keys and follow section 19 of the manual guide.

**Repo:** `C:\Dev\Projects\docman` (WSL: `/mnt/c/Dev/Projects/docman`)
**Branch:** `feature/compliance-hardening` (based on `dev` @ `000274b`, "Merge pull request #46"). Published through `e9df951`; subsequent documentation corrections remain local.
**Owner:** Richard Bakos (Resonance Designs). DocMan is being pitched as a proof of concept for a secure document
management system at NMDOH (New Mexico Department of Health), to be self-hosted on agency Ubuntu LTS servers.
An earlier version (2.2.7) already runs on a Linode Ubuntu server (Apache + Node + local MongoDB, systemd services,
deployed with `scripts/apache_production_*.sh`). No Docker is used anywhere, and none should be introduced.

---

## Document storage: encryption at rest and upload size — November 18, 2026

Replaced the earlier per-version document passwords and user-held encryption keys (reviewed and rejected: handing per-file keys to users weakened encryption at rest, since a leaked key plus a stolen backup decrypts that file without the master key, and the key added no access control beyond document permissions; shared document passwords could not be revoked per person or attributed).

Current design (`backend/src/lib/storageEncryption.js`, `lib/encryptingStorage.js`, `middleware/documentUpload.js`, `services/storedFileService.js`):
- A custom multer storage engine streams uploads straight to disk, encrypting on the way when encryption at rest is on. **Plaintext never touches the disk.** Files are written mode 0600.
- Chunked AES-256-GCM (64 KiB chunks; nonce = 8-byte random prefix + chunk counter; AAD binds file id, chunk index and a final-chunk flag). Detects edits, truncation, extension, reordering and cross-file swaps.
- Each file has its own data key, wrapped with `DOCUMENT_ENCRYPTION_KEY` and stored in `fileprotections` (same `_id` as the File record, created before it). No keys are ever sent to browsers.
- Downloads stream and decrypt chunk by chunk (constant memory, no size cap from decryption). `File.sha256` = stored bytes (checked before every download); `File.contentSha256` = original file (sent as `X-Content-SHA256`).
- Superadmin **System Settings → Document storage** (`GET/PUT /api/system/storage`, audited): encrypt at rest (default on when a key exists; fails closed with 503 if required but the key is missing) and maximum upload size in MB (default 50; ceiling `MAX_UPLOAD_MB_CEILING`, default 250). Apache `LimitRequestBody` must be raised to match larger limits (guide section 15.1).
- Removed: document passwords and policy settings, key retrieval/unlock routes, key notifications, `document_key_available` notification type.

Verified in the sandbox with plain Node (Jest 30 could not run there): encrypt/decrypt round trips for 0 B–5 MB including chunk boundaries; rejection of bit flips, truncation (boundary and mid-chunk), extension, chunk reordering, wrong file id and wrong master key; real Express + multer 2.5 uploads with no plaintext on disk, correct checksums, mode 0600, 413 over the limit with partial-file cleanup. **Still to run in WSL:** the Jest suites, both frontend builds, and an end-to-end encrypted upload/download against MongoDB.

## Superadmin offboarding — November 18, 2026

Superadmins can now demote or disable other superadmins (never themselves, never the last active one). The count check and the update run under a cross-process lock (`lib/settingLock.js`, a lease row in `systemsettings`, works on standalone MongoDB), so two superadmins cannot remove each other simultaneously. Role changes now also revoke sessions. Legacy `PUT /api/users/:id` still refuses superadmin demotion; use User Management.

## Superadmin email configuration — November 18, 2026

Implemented locally: System Settings → Outgoing email, with server-enforced superadmin-only GET/PUT `/api/system/email` and POST `/api/system/email/test`. Supports SMTP with login or an IP-authorized relay, STARTTLS/direct TLS, explicitly unencrypted non-authenticated relay, SES server credential chain or encrypted API keys, legacy SES environment settings, and disabled mail. Existing reset/review callers use the selected transport on every send. No provider fallback on database/transport failure.

Saved credentials are cryptographically bound to their destination/account settings to reject database-side retargeting. Credentials live only in an AES-256-GCM ciphertext envelope in the dedicated `EmailSetting` collection. `EMAIL_SETTINGS_KEY` is a separate server secret; never reuse JWT keys, expose it through the UI, or rotate it without re-entering/recovering saved mail credentials. Blank credentials preserve the same destination/account only; changing SMTP host/port/security/username requires new credentials. Settings use revision compare-and-set; audits omit credentials; tests are limited to three per minute per administrator. Pre-operation audit failure blocks sending/writing; completion audit failure explicitly reports an already-completed action. Mail delivery and auditing are not one transaction.

Patched Nodemailer 10.6.0 is now intentionally used for SMTP, replacing the previously removed unused vulnerable 7.x dependency. Backend production dependency audit remains clean. Update both backend dependencies and Vue assets before using this feature. Verification: 130 targeted tests pass on Windows and Linux/Node 22 (31 new email tests). Local SMTP fixtures passed relay, TLS and STARTTLS sending, encrypted credential storage, access denial, rate limiting, concurrent-save conflict, shared notification transport, and disabled mode; untrusted TLS certificates were rejected. Browser checks passed save/reload, blank saved password fields, test email, provider switching, and hiding controls from regular admins. Live AWS SES and NMDOH mail delivery remain untested. No NMDOH mail-server contact or real external email has been attempted. The agency must supply SMTP details/relay authorization; both authentication methods were explicitly requested. Ubuntu section 16 now covers all prerequisites, UI steps, expected outcomes, key/CA setup, and recovery. Existing environment SES deployments retain their settings until changed in the UI.

### NMDOH mail-server information — November 18, 2026

The user reports that REDCap uses **`webmail.state.nm.us`**, **SMTP port `25`**. Use this as the candidate DocMan endpoint, not evidence of a tested connection. Authentication and TLS mode are unknown; IP-authorized relay is only a candidate until IT confirms it. The user thinks arbitrary sender addresses may be accepted, but this is unverified and must not become a documented guarantee or a hard-coded sender.

For `dohr2simdocmdev` (`docman-dev.doh.nm.gov`), NOC/security must confirm network reachability/access rules separately from mail-server relay authorization. Ask the mail administrators whether the source IP needs allowlisting or SMTP credentials are required, which sender addresses/recipient domains are allowed (including outside agencies), and whether STARTTLS/private CA trust is required. Port 25 proves neither authentication nor encryption requirements. Firewall management remains with security/NOC.

No real SMTP contact or delivery test has been performed. After deploying the feature and obtaining confirmed values, use System Settings → Outgoing email → Send a test email and verify actual inbox receipt. Update this checkpoint with results without recording secrets. The beginner walkthrough includes these candidate values, open questions, and success/failure distinctions in [section 16.1](docs/deployment/ubuntu-server-installation.md#161-get-the-mail-server-information-first).

## Dependency remediation — November 18, 2026

Local dependency updates cover all five lockfiles; see [dependency security review](docs/dependency-security-review.md) for versions, overrides, verification, residual risk, and deployment steps. All audited trees have zero critical findings; backend runtime has zero findings. Full-tree counts remain backend 37, Vue 10, React 11, docs 34 (all high, all derived from unpatched Picomatch). Keep this risk open; no agency acceptance is implied. The audit tool/weekly CI now includes Vue and fails closed on errors. Maintainers should recheck the advisory by November 25 or when a patch appears.

Validation: Windows and Linux/Node 22 pass 99 targeted backend tests and five audit/schema checks; all UI/docs builds pass. Isolated MongoDB smoke checks pass 24/24 plus concurrent publication recovery; rate limiting used memory. The review records the missing seeded fixture and wrapper log-print limitations.

NMDOH has **not** deployed these dependency updates. Both backend and Vue require `npm ci`, followed by a Vue rebuild/publication and backend restart using the existing safe-update procedure. Do not mistake local package/test results for changes to the remote server.

## Standing user requirement: deployment walkthrough

Do not infer prerequisite installation from guide contents or related checks. Apache was included in earlier package lists but was not confirmed during guided NMDOH setup; the user reports it is missing. The `www-data` read test proved file permissions only. Apache installation and version verification must precede site configuration (now explicit at the start of section 14). Installation is now confirmed in the current-status table; site configuration and HTTPS remain pending.

Configuration preparation must precede editing: explain URL encoding in place, generate encoded values from existing passwords, require saving each labeled value and the JWT key, and only then open nano. Include recovery after `clear` and after an interrupted edit. Never instruct a returning user to recreate an existing environment file with `install /dev/null`; reopen it without truncation. Section 10.1 now includes this sequence. Do not claim these local documentation updates are already present on the remote server until committed, pushed, and pulled.

The deployment documentation must be a **complete end-to-end walkthrough that anyone can follow**, including a beginner with no server-administration experience. This is an explicit user requirement, not an optional documentation preference.

The user's stated usability target is a new computer student around age 12: do not assume they know shell prompts,
what an empty result means, how to create/save a configuration file, or whether a displayed error is expected.

- **Required outcome: independent deployment without this chat or an AI assistant.** A beginner must be able to start with a fresh server and complete the documented deployment using the walkthrough itself. Do not leave essential instructions, explanations, troubleshooting, or success criteria only in conversation. Requiring the user to return for missing instructions is a documentation defect, not an acceptable workflow.
- Treat every installation question, confusing prompt, and encountered failure as evidence to review the relevant instructions. Add the missing explanation and concrete recovery steps to the canonical guide in the same work session, before continuing past that step; update related examples and the confirmed/pending checkpoint. Do not merely promise to document it later.
- Before describing the walkthrough as complete, review it from a beginner's perspective: can the reader identify their current prompt, perform each action, recognize success or failure, recover from the documented failures, and find the next step without asking us? Fix any gaps found. For genuinely environment-specific information, identify exactly what must be obtained and from whom (for example, the NOC), rather than making this chat a prerequisite. Distinguish documentation review and syntax checks from steps actually verified on the target server.
- Always target the **latest stable Ubuntu Server LTS**. The current target is **26.04 LTS**. Verify the latest LTS against official Ubuntu sources when maintaining the guide; do not assume a previously recorded version is still current. Interim releases, development previews, and release candidates are not the target.
- Provide **one clear installation sequence**, not parallel instructions for older Ubuntu releases. Keep the specific target version/codename visible so users select the correct packages; do not replace concrete instructions with vague “latest” placeholders.
- Cover every prerequisite: obtaining/installing the OS where needed, access, dependency installation and configuration, application deployment, initial accounts/reference data, startup, verification, and operational setup/recovery. Do not assume an unstated prerequisite is already configured.
- Give exact commands, where to run them, files to edit and their contents, values to replace, expected results, and what to do when a check fails. Explain necessary terminology in beginner-friendly language.
- Apply that rule to **every stage**, not just isolated examples: explain silent success, interactive prompts, positive and deliberately negative checks, and a concrete next action on failure. Separate commands at checkpoints so a beginner does not paste past a failed migration, backup, or restore. Do not call syntax checking proof of an executed deployment.
- Keep the canonical guide in sync with guided deployment. Any new or corrected installation step given in conversation must also be documented before proceeding beyond it. Clearly separate confirmed results from pending checks.
- When a new LTS becomes available, verify dependency support, update the single walkthrough and related documentation together, and validate the changed steps. If compatibility blocks that update, state the specific blocker; do not silently retain an older-LTS alternative or claim an untested configuration works.
- For the current NMDOH POC, respect the requested order: install the application and verify local startup first, then configure internal DNS/HTTPS and browser access. Do not make public DNS, a DMZ, or external access prerequisites for this internal deployment.

Canonical document: [complete Ubuntu installation guide](docs/deployment/ubuntu-server-installation.md). Preserve this requirement across handoffs and future documentation edits.

## Complete Ubuntu installation documentation — November 17, 2026

The full walkthrough has had a beginner-usability pass across setup, accounts/configuration, deployment, TLS,
email, backup scheduling, recovery, and updates. Added prompt/location explanations, exact file-edit commands,
expected outputs and failure actions. Migration/build/update steps now stop at explicit checkpoints. Corrected
private-certificate site activation order and explained successful inactive oneshot jobs versus failed services.
The current remote installation checkpoint below records confirmed results; documentation edits do not complete server tasks.

The canonical fresh-server runbook is [docs/deployment/ubuntu-server-installation.md](docs/deployment/ubuntu-server-installation.md).
It provides one Ubuntu 26.04 LTS walkthrough with Ubuntu Node 22 packages, MongoDB 9.0, native Apache,
and Redis, and includes OS/SSH/DNS/firewall setup,
account-only provisioning, environment files, migrations, systemd, TLS, SES, encrypted off-server backups,
restoration, maintenance, and acceptance checks. Local authentication is sufficient; Authentik is optional.
Uploads live outside the checkout. The old destructive manual replacement procedure has been superseded.
This documentation does not claim a completed Ubuntu 26.04 LTS application deployment or live AWS/DNS/certificate validation.
Guide verification: Bash/Python/embedded-JavaScript/JSON syntax and local links pass; both Apache examples pass isolated
syntax checks; the documentation site builds. Systemd parsing reports expected absent target-installation dependencies
in the verification environment. The guide explicitly handles the Vue category-creation and password-reset UI gaps
with category bootstrap instructions and an operator-assisted backend reset procedure.

## NMDOH internal POC installation — current checkpoint

This is the current status, not a list of commands to ask the user to run. The user has resumed guided server work that can proceed while the NOC certificate is pending.

The user connects through NinjaOne to an NMDOH workstation, then to the internal server `dohr2simdocmdev`, with sudo access. Ubuntu 26.04.1 LTS, x86-64/AVX, 7.3 GiB RAM, and 39 GB initially free were confirmed. Website name: `docman-dev.doh.nm.gov`; the user confirms its internal A record. The server is not in the DMZ. ITSD NOC approved a self-signed certificate for this POC; it is installed and HTTPS works. Security team owns firewall configuration.

| Stage | Evidence/status |
| --- | --- |
| Source | Server pulled `e9df951` on `feature/compliance-hardening`. Subsequent documentation edits are local, not yet published. |
| Runtime/database | Node 22.22.1, npm 9.2.0, MongoDB 9.0.8, Redis 8.0.5. MongoDB/Redis authenticated and unauthenticated checks passed. MongoDB loopback listener confirmed earlier. |
| Identity/storage | `docman` uid 999/gid 983. Uploads/logs owned docman:docman, mode 750; checkout rbakos:rbakos 755; public directory root:root 755. Log symlink and Git exclusion completed. |
| Dependencies | Both npm installs completed; frontend exit 0 supplied. Backend reported 37 vulnerabilities (3 critical); frontend reported 10 high. Review remains outstanding. |
| Settings | Backend file root:docman 640, readable by service; uploads writable; no placeholders. Frontend local login enabled. User reports all three application URLs changed to HTTPS website hostname and backend restarted. |
| Initial data | `RBakos` superadmin and `General` category created. Additional role/approval test users remain pending. |
| Migration | Completed with zero missing files; audit chain valid, checked 1. Dry-run connection setup created indexes: it is not strictly read-only. |
| Website files | Vite build succeeded; published files readable by www-data. This does not prove Apache is installed. |
| Backend | Enabled and running; local Redis selected; localhost API returned HTTP 401 and No token provided. |
| Apache | Version 2.4.66 confirmed; proxy, proxy_http, headers, rewrite, ssl and dependencies enabled. Restart returned without error. DocMan site enabled; Apache configuration returned Syntax OK (global ServerName warning only), reload succeeded, service active. Self-signed certificate trusted on Ubuntu. HTTPS website returned 200 and proxied unauthenticated API returned 401 without -k. Public certificate file hashes matched after transfer to the Windows workstation; trust import was instructed. User confirms successful browser login as RBakos. Explicit confirmation of warning-free browser trust and document workflows remains pending. |
| Other prerequisites | Clock confirmed synchronized with active NTP and Etc/UTC. Listener output confirms MongoDB on 127.0.0.1:27017, Redis on 127.0.0.1/[::1]:6379, backend on *:5001, Apache on *:80/*:443, and SSH on IPv4/IPv6 port 22. UFW reports inactive. Other host/NOC network filtering remains unverified; do not claim direct backend access is blocked or public exposure is proven. Confirm NOC firewall requirements and management access before enabling host filtering. Complete base-tool inventory remains unconfirmed. |
| Acceptance/operations | Browser login succeeded (user: “I'm in”). Document upload/replacement/approval/download and access-denial tests, email, backup/restore, and dependency remediation remain pending. |

**Password policy:** user-chosen passwords of at least 18 characters; no generated hexadecimal password requirement or manual long-password transcription. `passwordPrompt()` in `db.createUser` assigns a new password. Machine JWT keys are separate. The user explicitly authorized keeping the existing development database/Redis credentials temporarily, with replacement deferred until later/before production. Do not record their values or repeatedly block this POC on that exception.

**Documentation requirement:** use the common base package list in section 4.3 and expected-result checkpoints at the relevant steps. Do not infer installation from a package list or successful permission check. Explain encoded passwords and save them before editing configuration. Preserve existing settings on retries. Keep this table updated instead of appending contradictory “next step” notes.

## Verification follow-up — November 17, 2026

The secure document-sharing follow-up is implemented in this working tree. Scope remains authenticated upload,
download and file replacement; no new project or invitation workflow was introduced.

Verified in an isolated WSL Ubuntu 22.04 copy with Node 22.23.4, MongoDB 8.0.34 and Redis 7.0.15:

- Clean `npm ci` for backend, Vue and legacy React; Vue Vite 8 production build, remote bundle and React build pass.
- 78 targeted security/compliance/identity tests pass (7 suites). The Authentik suite now runs under the existing Jest configuration.
- Forced simultaneous publication retries from two independent Node processes against MongoDB: one publication
  audit entry, one history entry, one revision, and a valid gap-free hash chain. `verifyAuditConcurrency.js` also
  confirms the database rejects a duplicate event even with a different available sequence number.
- Expanded real-database smoke test: 24 checks pass using both memory and real local Redis; no Redis fallback.
- Browser: local sign-in, replacement upload, separate approver inbox/approval, published version and superseded
  history, authenticated download (HTTP 200), revision and audit views. The live Authentik provider was not contacted.
- MongoDB dump restored to a separate disposable database; copied uploaded files match stored SHA-256 values;
  restored audit chain verifies. An injected publication interruption recovers with one history entry and one revision.
- Real RSA-signed test Authentik token works before blacklist insertion and fails afterward.
- Windows `node_modules` were preserved. No production deployment or production database mutation was performed.

Corrections include shared document visibility filters in book/project responses and analytics/custom-chart data;
removal of stale document/analytics response caches; Authentik blacklist enforcement; reactive session clearing;
unique version and active-upload indexes; resumable publication with a unique publication revision; a retry button;
and an approver display-name fix. Logout reports failure if token invalidation cannot be persisted.

Publication uses a durable `publishing` state for standalone MongoDB compatibility. A crash can leave publication
incomplete until an authorized user clicks **Retry publication**. History/revision writes and successful publication
audit entries are idempotent. Audit deduplication is enforced by a sparse unique database key, including across server
processes; retries do not emit duplicate stdout audit records. Existing audit records/hashes are preserved.
This is recovery across multiple writes, not a cross-collection transaction.

Before release, run the compliance migration while writes are stopped. It checks for conflicting existing versions
and refuses to silently renumber/discard them, then replaces the old nonunique version index and adds the new indexes.
This includes the unique audit idempotency-key index; install it before resuming writes and update every application process.
The partial active-version index uses MongoDB 6+ syntax; the verified deployment target is MongoDB 8.0.34.
Do not roll back application code alone across a migrated production database without a tested recovery plan.

The GitHub deploy workflow now accepts the repository's `VITE_AUTHENTIK_*` variables, checks required values when
Authentik is enabled, tests the security/identity suites, builds/publishes the remote bundle, and runs migration
preflight/migration. Repository variables still must be configured for the target server; this workflow was not run remotely.

Reproducible checks:

```bash
REDIS_URL=redis://127.0.0.1:6399/0 MONGO_URI=mongodb://127.0.0.1:27199 bash scripts/verify-linux.sh
# Run just the independent-process audit race (creates its own disposable database):
NODE_ENV=verify MONGO_URI=mongodb://127.0.0.1:27199/docman_verify_audit \
  AUDIT_FAIL_CLOSED=true node backend/src/scripts/verifyAuditConcurrency.js
# After smoke-testing and restoring a disposable DB and its uploaded files:
NODE_ENV=verify MONGO_URI=mongodb://127.0.0.1:27199/docman_verify_restored \
  UPLOAD_DIR=/path/to/restored-test-uploads node backend/src/scripts/verifyWorkflowRecovery.js
```

`verifyWorkflowRecovery.js` requires an existing smoke-test fixture in a `docman_verify_*` database and makes test
changes there. The historical full backend suite still contains unrelated failures/timeouts; it is not claimed green.
Upstash and the deployed Authentik provider/server remain environment-specific checks.

---

## ⚠️ Why this handoff exists: the previous assistant could not access WSL

The previous assistant (Claude, in the Claude desktop app) **could not run anything inside the user's WSL environment**.
Its limits in that session were:

- Its shell was a **separate, sandboxed Linux VM** (Ubuntu 22.04). The sandbox could see only the Windows folders the user
  connected (`C:\Dev\Projects\docman`, `C:\Dev\Projects\rdevsyscmd`). It was **not** the user's WSL distro and could
  not see anything installed there (Node, MongoDB 8.0.34, etc.).
- That sandbox had **no internet access** (account network setting). `npm ci`, package downloads, and MongoDB/Redis
  downloads all failed.
- Its desktop-control tool can only **click** in terminal windows. Typing is blocked, so it could not drive a WSL terminal.
- Services on the user's localhost (such as the WSL `mongod`) are **not reachable** from that sandbox.

As a result, **the end-to-end test against a real MongoDB was never run**, and the Vue build was only checked with a
stand-in Vite version (details below).

**You (the next assistant) need to close that gap by working directly in the user's WSL (Ubuntu 24.04, MongoDB 8.0.34
installed locally):** do a clean install, build, test, run end-to-end, fix what fails, and commit.

---

## What was done (commits on the branch, newest first)

| Commit | Summary |
| --- | --- |
| `fad8cc8` | Ignore `.verify-tools/` |
| `a3f3714` | `scripts/verify-linux.sh` uses natively installed MongoDB/Redis (Docker removed) |
| `1ecca5c` | Line-ending normalization to LF via `.gitattributes` (**no content changes**, `git diff --ignore-cr-at-eol` is empty; safe to drop) |
| `88d01a1` | Linux verification script, end-to-end smoke test, `MONGO_URI` support in any env, `npm test` config fix, update scripts run the migration |
| `024e24e` | Main feature commit: audit log, revision history, change approval, security fixes, switchable Redis; version bumped to 2.3.0 |

Full feature documentation: **`docs/compliance-and-redis.md`** (read it first). Changelog: `CHANGELOG.md` → `[2.3.0]`.

### Feature summary

1. **Audit log** (`backend/src/models/AuditLog.js`, `services/auditService.js`, `controllers/auditController.js`,
   `routes/auditRoutes.js`). Entries can only be added: Mongoose middleware blocks updates and deletes. Each entry is
   linked to the previous one by a SHA-256 hash (`prevHash` → `hash`), and `verifyChain()` detects edits, deletions and
   re-ordering. Appends are serialized inside the process. Covers auth events, document CRUD and views, uploads and
   downloads, approvals, review changes, user and role changes, system settings, exports and verifications.
   - API: `GET /api/audit`, `GET /api/audit/export?format=csv|json`, `GET /api/audit/verify` (superadmin).
   - CLI: `npm run audit:verify`. Exit code 2 means tampering was detected.
2. **Revision history** (`models/DocumentRevision.js`, immutable; `services/revisionService.js`). Every document
   change stores a full snapshot plus the field-level diff. API: `GET /api/docs/:id/revisions`.
3. **Change approval** (`services/approvalService.js`, `controllers/versionController.js`, `middleware/documentAccess.js`).
   - A new file version is `pending_approval`. Once enough approvals arrive it becomes `approved`, which publishes it
     and sets `Doc.currentVersion`; the previously published version becomes `superseded`. Versions can also end
     `rejected` (written reason required) or `withdrawn`.
   - Approvers are `Doc.approvers` (falling back to `owners` when empty) plus admins. Nobody may approve their own upload.
   - Only one version can be pending per document. Settings: `APPROVAL_REQUIRED`, `APPROVAL_MIN_APPROVALS`,
     `APPROVAL_ALLOW_SELF_APPROVAL`.
   - Inbox: `GET /api/docs/approvals/pending`.
4. **File integrity:** SHA-256 recorded at upload and verified on every download. A mismatch returns 409 and is audited.
5. **Soft delete and restore:** `Doc.deletedAt`, filtered out by query and aggregate middleware unless the
   `includeDeleted` option is set. Admin routes: `DELETE /api/docs/:id`, `POST /:id/restore`, `GET /api/docs/deleted`.
6. **Security fixes:**
   - `/uploads` no longer serves document files; only profile images go through `routes/mediaRoutes.js`.
   - Every `/api/docs/:id/*` route checks access to that specific document.
   - Document updates use a field allow-list (`pickUpdatableFields`).
   - Review assignments can only be changed by the assignee or an admin.
   - Self-registration is forced to `viewer`; it previously allowed requesting superadmin.
   - Password reset: hashed tokens, input type checks against NoSQL injection, no account enumeration, `APP_BASE_URL`
     for the link.
   - Admins can't change a superadmin's role or their own.
   - `trust proxy` is set, so audit entries and rate limits see real client IPs behind Apache.
   - Swagger and destructive admin tools are off in production unless explicitly enabled.
   - The unused `POST /upload` route was removed.
7. **Redis switch** (`backend/src/config/redis.js`, `lib/redisRespClient.js`, `models/SystemSetting.js`).
   - Rate-limit store options: `upstash`, `local` (self-hosted Redis, via a built-in RESP client with **no new npm
     dependency**) or `memory`. Upstash is used **only** for rate-limit counters, never for document data or caching.
   - Selection order: the superadmin runtime choice (System Settings UI, `PUT /api/system/redis`) → `REDIS_PROVIDER`
     → automatic. The connection is tested before a switch and the switch is audited.
   - If the active store fails, requests fall back to the in-memory store.
8. **Vue UI** (`frontend-vue`):
   - Document detail: versions panel (download, approve, reject, withdraw, upload), revision history and audit tabs,
     soft delete.
   - New views: `/approvals`, `/admin/audit`, `/admin/system`.
   - An Approvers field in the create and edit forms.
   - **React (legacy) UI:** only the download links were updated to the authenticated endpoint. It has no approval UI.
9. **Migration:** `npm run migrate:compliance[:dry-run]` (`backend/src/scripts/migrateComplianceFields.js`, idempotent).
   - Marks legacy file versions `approved`, records checksums, sets `latestVersion`, and creates baseline revisions.
   - The Apache update scripts now run it automatically (step 7b).
10. **Tooling:**
    - `scripts/verify-linux.sh`: `npm ci` ×3, compliance unit tests, both frontend builds, starts the backend against
      a **throwaway** DB `docman_verify_<ts>` on the local `mongod`, runs the migration and the smoke test.
    - `backend/src/scripts/smokeTest.js`: about 20 end-to-end checks against a running server.
    - `backend/jest.config.js` was fixed: it referenced the never-installed `jest-junit` and `jest-watch-typeahead`,
      so `npm test` failed on every clean checkout.

---

## Verification status

| Check | Status |
| --- | --- |
| Backend compliance/security unit tests (`npx jest src/__tests__/compliance`) | ✅ 63/63 pass (sandbox, mocks + BSON round-trip + fake RESP server) |
| React frontend `vite build` (Vite 7) | ✅ builds on Linux |
| Vue frontend build | ⚠️ Built on Linux with **Vite 7 standing in** for the project's Vite 8: the Linux Rolldown binary for Vite 8 couldn't be downloaded. A real `npm ci` + `npm run build` needs to be confirmed. |
| Vue screens in a browser | ❌ Never opened or clicked through |
| End-to-end against a real MongoDB (`scripts/verify-linux.sh`) | ❌ **Never run** |
| Self-hosted Redis against a real `redis-server` | ❌ Only tested against a fake RESP server; the Lua sliding-window script has never run on real Redis |
| Upstash path | ❌ Not exercised (code is unchanged from the previous approach, now wrapped) |
| Pre-existing test suites (`auth`, `docs`, `users`, `projects`, `teams`, `categories`, `analytics`, `notifications`, `externalContacts`, `auth.integration`, `documentService`, `queryOptimizationService`, `identityService.authentik`, `cacheMiddleware`) | ❌ Already failing **before** this work (ESM / top-level-await / Babel config issues and stale expectations). Not caused by 2.3.0 and not fixed. |

---

## What remains (in order)

1. **Run the full verification in WSL** (Ubuntu 24.04, local `mongod` 8.0.34 must be running):
   ```bash
   bash scripts/verify-linux.sh
   # if mongod requires auth:
   MONGO_URI='mongodb://user:pass@127.0.0.1:27017/?authSource=admin' bash scripts/verify-linux.sh
   # to also test self-hosted Redis (sudo apt install redis-server):
   REDIS_URL=redis://:pass@127.0.0.1:6379/0 bash scripts/verify-linux.sh
   ```
   - The script runs `npm ci` and uses a throwaway database `docman_verify_<ts>`. Logs land in `.verify-logs/`.
   - Constraint: the user also develops on the Windows side of `C:\Dev\Projects\docman`. Don't leave its
     `node_modules` holding Linux-only binaries; work wherever you see fit, as long as that holds.
   - Fix every failure and commit on `feature/compliance-hardening`.
2. **Click through the Vue UI**: `npm run dev` in `backend` + `frontend-vue`. Test as three users: an uploader
   (editor or owner), an approver and an outsider.
   - Create → upload → approve → download → reject → withdraw → restore.
   - Audit Log export and verify. System Settings Redis switch.
3. **Code that has never run against real infrastructure.** If something breaks, look here first:
   - The `excludeDeleted` query middleware passes a custom `includeDeleted` option through `setOptions()`. Confirm the
     MongoDB driver ignores it and that analytics aggregates still work with the auto-prepended `$match`.
   - `approvalService.publishVersion()` calls `doc.save()` on the document loaded by `requireDocumentAccess`. Watch
     for validation errors on legacy documents missing required fields.
   - The Lua `EVAL` in `config/redis.js` (`SLIDING_WINDOW_LUA`), on real Redis 7.
   - `createDocument` with a file: the initial upload goes through `submitVersion`, so a new document shows
     `currentVersion: 0` until it is approved. Check the Vue list and detail views handle that.
4. **Deploy to the Linode dev server** with `scripts/apache_production_update.sh`. It now runs the migration. Before
   deploying, add the new variables from `backend/.env.sample`, at least `APP_BASE_URL`.
5. Optional or known gaps (see `docs/compliance-and-redis.md` §10):
   - books, projects, teams and analytics still use role-only checks;
   - no approval gate on metadata edits;
   - no content diff between versions;
   - the React UI has no approval screens;
   - the pre-existing Jest suites are broken.

## Conventions to keep

- `@version` headers, `CHANGELOG.md`, and `node scripts/version-sync.js <ver>` keep versions in sync.
- Line endings are LF (`.gitattributes`).
- Commit identity: `Richard Bakos <resonance.designs.com@gmail.com>`.
- No Docker. No new runtime npm dependencies were needed for 2.3.0, so keep it that way where possible.
- Credentials stay in `backend/.env.prod` and are never stored in MongoDB.

Fresh-server dependency cross-check: no additional core runtime was identified from package manifests and backend subprocess/file-write usage. Added concrete Chrony install/internal-source setup, required outbound-service destinations, and DocMan file-log rotation/retention instructions. These are documentation changes, not verified remote configurations; retention examples require organization policy selection. No NMDOH commands were requested or run for this audit.

Updated NMDOH direction: user confirms Security team owns firewall configuration; leave host firewall changes to that team. ITSD NOC explicitly permits a self-signed certificate for this internal POC. Use existing CSR/private key, issue the self-signed certificate for docman-dev.doh.nm.gov, verify SAN/dates and establish explicit client trust before browser acceptance. Certificate creation is not yet confirmed; do not continue treating NOC issuance as the required next step.

Self-signed certificate creation confirmed: subject and issuer CN=docman-dev.doh.nm.gov, SAN DNS:docman-dev.doh.nm.gov, validity 2026-11-17 17:04:08 GMT through 2027-11-17 17:04:08 GMT. Next: enable prepared Apache site, validate configuration, reload, establish server/client trust, and test HTTPS. These steps are not yet confirmed.

Latest confirmed checkpoint: HTTPS curl from Ubuntu passed after adding the self-signed certificate (1 added). The ca-certificates.crt rehash warning did not prevent these tests. Next: transfer only the public certificate to the NMDOH workstation, compare its SHA-256 file hash, import into the intended Windows user trust store, then test browser login. Security team owns firewall configuration.

## Superadmin user-management implementation

Added Vue Users page and superadmin-only GET/POST /api/users/manage and PATCH /api/users/manage/:id. Supports search/pagination, creation, profile/role edits, password resets for other local users, and disable/enable preserving records. Self-registration configuration is unchanged/off on NMDOH. Existing superadmins are protected against demotion/disablement, including legacy profile demotion/delete paths. Existing accounts default active with sessionVersion zero; disabling/re-enabling and administrator password resets invalidate local JWTs and refresh/reset credentials. Disabled identities are rejected for local and Authentik access. API DTOs/audit payloads omit credentials. No deployment to NMDOH has occurred for this feature; server remains at e9df951. Deploy backend and rebuilt Vue together, retaining server .env files. Bootstrap helper remains for first-superadmin setup only; guide now documents the Users workflow.

User-management validation: 39 targeted Jest tests passed across userAdmin, identityService Authentik, and auditService suites; 25 checks against a disposable real MongoDB covered create/login/edit, lower-role denial, duplicate identities, disable/re-enable, password reset, access/refresh invalidation, protected superadmins, registration-off behavior, and valid credential-free audit chain. Vue production build passed. An isolated browser session verified superadmin navigation, successful user creation, and disabling with Enable action afterward. These tests did not use the NMDOH server.

## NMDOH user-management update checkpoint

User confirmed successful fast-forward pull from e9df951 to 67b1790 on feature/compliance-hardening. Backend stop was instructed before the pull, but its output was not supplied. Updated frontend build/publication and backend restart/API/browser checks remain pending. Dependency manifests/lockfiles did not change for this update. Do not mark deployment complete from the Git pull alone.

Update 67b1790: NMDOH frontend build confirmed successful (656 modules, Vite 8.0.8); Website build exists check passed. Publication of the new dist files, backend restart, HTTPS checks, and Users-page verification remain pending.

## PR 47 security-check triage

See [PR check triage](docs/pr-47-checks.md) for six exact GitGuardian incidents and classification evidence. Current smoke-test fallback removed; verification and relevant fixtures generate random credentials. Historical incidents still require maintainer classification and confirmation that the old admin default was not deployed/reused. No dismissal, history rewrite, push or merge was performed. Picomatch still has no patched version listed; audit remains failing. CodeRabbit review remains skipped due to file-count limit.

## My account self-service (2026-11-20)
Local implementation, not deployed: authenticated `/account` page for all roles; profile names/telephone/title/department/bio and current-password-verified local password changes. Password updates use current account policy and atomically revoke sessions, refresh tokens, and outstanding reset tokens. SSO profiles/passwords remain provider-managed. Username/email changes remain superadmin-managed; verified self-service email changes are deferred. Legacy profile endpoint rejects credential/identity/access fields. Verify profile persistence, incorrect current password, configured minimum, logout and new-password login on NMDOH after deployment.

Validation: 58 focused account/profile/invitation/admin tests passed; Vue production build passed (existing bundle-size warning). NMDOH browser validation remains pending.

## Public document links (2026-11-20)
Opt-in Public sharing card on document details, restricted by existing edit authorization. Anonymous `/public/documents/:token` page and `/api/docs/public/:token[/download]` endpoints require a random 256-bit link token, nondeleted document, and current approved file. Token is excluded from normal model selection; sharing management requires edit access. Downloads reuse integrity verification, encrypted storage decryption and audit logging. Disabling removes token; re-enabling rotates it. Existing downloaded copies cannot be revoked. No public listing/search, private metadata, draft/version history, or write access. Default existing documents remain private. Test in a signed-out browser after deployment, including disabling, deleting, and approving a replacement version. Public link tokens may appear in web-server access logs; protect those logs. Restore preserves sharing settings, so a restored document can reactivate its previous link.

Public sharing validation: 18 focused public-link/access-control tests passed; Vue production build passed. Anonymous browser download and encrypted-file end-to-end validation remain pending on NMDOH.

### Global public-sharing controls
Superadmins can use System Settings → Public document sharing:
- **Allow public document sharing**: off prevents creating or replacing public links.
- **Disable existing public links while sharing is off**: on also blocks anonymous public pages and downloads while the first switch is off. Off preserves existing links.
Both switches default to on (existing documents still remain private unless individually shared). Re-enabling global sharing restores existing links; this is a suspension, not permanent token deletion. Individual document revocation remains available regardless of global policy and permanently invalidates that link. Requests already authorized/in progress and downloaded copies cannot be recalled. Policy reads are uncached and failures deny public access. Only superadmins can read/write the global settings endpoint; authorized document editors receive policy status with their own sharing settings.
Validation: 22 focused public-sharing/access tests passed; Vue production build passed. Backend dependencies restored successfully after the earlier failed install. Live NMDOH verification remains pending.

## User and QA manuals - 2026-11-20

Created editable sources under docs/manuals and PDFs under output/pdf. User guide includes four labeled vector diagrams; these are not captured application screenshots. QA guide includes 60 scenario cases and 157 generated mounted-route cases, with all 217 result-template rows NOT RUN. It identifies browse-only Vue modules, missing reset UI, date display concern, and live-validation limits. No infrastructure workaround or credentials were included.

Rebuild using scripts/documentation/build_manuals.py; render/check using scripts/documentation/verify_manuals.py (dependencies and output conventions in docs/manuals/README.md). Keep actual run results separate: generation overwrites the blank template. Update both source guides and generated PDFs with feature changes. PDF visual/mechanical verification does not execute the described app tests.
