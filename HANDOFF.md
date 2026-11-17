# HANDOFF — DocMan 2.3.0 compliance hardening

**Repo:** `C:\Dev\Projects\docman` (WSL: `/mnt/c/Dev/Projects/docman`)
**Branch:** `feature/compliance-hardening` (based on `dev` @ `000274b`, "Merge pull request #46"). Not pushed.
**Owner:** Richard Bakos (Resonance Designs). DocMan is being pitched as a proof of concept for a secure document
management system at NMDOH (New Mexico Department of Health), to be self-hosted on agency Ubuntu LTS servers.
An earlier version (2.2.7) already runs on a Linode Ubuntu server (Apache + Node + local MongoDB, systemd services,
deployed with `scripts/apache_production_*.sh`). No Docker is used anywhere, and none should be introduced.

---

## Standing user requirement: deployment walkthrough

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
The current remote installation checkpoint below remains unchanged; documentation edits do not complete server tasks.

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

The user accesses an NMDOH workstation through NinjaOne, then connects to the internal development server.
They have sudo access. The server is internal-only, not in the DMZ; no application HTTPS setup has been completed.
The user explicitly wants application installation/local startup first, before DNS/certificate work.

User-provided output confirms Ubuntu 26.04.1 LTS (`resolute`), x86-64 with AVX, 7.3 GiB RAM and 39 GB free on `/`.
Basic build/download tools installed successfully. Installed versions: Node 22.22.1, npm 9.2.0, Redis 8.0.5 (`PONG`),
MongoDB Community 9.0.8 (`active`, `{ ok: 1 }`, bound to `127.0.0.1:27017`).

**Current account checkpoint:** both MongoDB accounts were created with `ok: 1`; authentication is enabled, the application account successfully listed collections (`[]`), and unauthenticated collection listing was denied. Redis failed because line 112 contained `port protected-mode yes`; after correction the user reported startup success. Redis authentication is now verified: the user supplied authenticated `PONG` and unauthenticated `NOAUTH Authentication required` results. Section 9.1 is confirmed: docman uid=999/gid=983; uploads and logs are docman:docman 750, checkout directory rbakos:rbakos 755, and public directory root:root 755. Repository cloning is confirmed at /var/www/docman. The initial clone selected master at 000274b (2.2.7 merge). The user then switched the server to feature/compliance-hardening tracking origin/feature/compliance-hardening at 4178135; git status confirms a clean working tree. Final deployment commit selection remains pending publication of the local fixes. Local uncommitted application fixes must be included in the deployment source before installing. Application deployment, HTTPS, email, and backups remain unconfirmed. Section 8 now includes the exact diagnostic/fix sequence, expected output, nano save steps, and password-test explanations.

**Explicit development-password requirement:** use passwords chosen by the user, at least 18 characters long. Do not prescribe generated hexadecimal passwords or manual transcription of long generated strings. Explain that `passwordPrompt()` inside `db.createUser` assigns a NEW password; it is not asking for a preexisting MongoDB credential. Preserve the user's working password. URI/configuration examples must correctly encode/quote punctuation and spaces. Machine signing keys (JWT) remain distinct from login passwords. Documentation changes do not change application password validators or live server credentials.

Earlier troubleshooting showed altered/control-character input through nested remote connections. That is historical context, not an instruction to repeat the failed password workflow. The user subsequently resumed guided deployment. Keep the guide and this checkpoint synchronized with confirmed results; do not treat proposed checks as completed.

The canonical guide now includes this internal POC sequence, exact package commands used, database account/authentication
steps, expected outputs, and the installation checkpoint. Keep it updated as guided deployment progresses.

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
