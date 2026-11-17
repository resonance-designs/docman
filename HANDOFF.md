# HANDOFF — DocMan 2.3.0 compliance hardening

**Repo:** `C:\Dev\Projects\docman` (WSL: `/mnt/c/Dev/Projects/docman`)
**Branch:** `feature/compliance-hardening` (based on `dev` @ `000274b`, "Merge pull request #46"). Not pushed.
**Owner:** Richard Bakos (Resonance Designs). DocMan is being pitched as a proof of concept for a secure document
management system at NMDOH (New Mexico Department of Health), to be self-hosted on agency Ubuntu LTS servers.
An earlier version (2.2.7) already runs on a Linode Ubuntu server (Apache + Node + local MongoDB, systemd services,
deployed with `scripts/apache_production_*.sh`). No Docker is used anywhere, and none should be introduced.

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
   git clone -b feature/compliance-hardening /mnt/c/Dev/Projects/docman ~/docman-verify
   cd ~/docman-verify && bash scripts/verify-linux.sh
   # if mongod requires auth:
   MONGO_URI='mongodb://user:pass@127.0.0.1:27017/?authSource=admin' bash scripts/verify-linux.sh
   # to also test self-hosted Redis (sudo apt install redis-server):
   REDIS_URL=redis://:pass@127.0.0.1:6379/0 bash scripts/verify-linux.sh
   ```
   - Clone to the Linux filesystem. **Do not run `npm ci` in `/mnt/c/...`**, because that replaces the user's
     Windows `node_modules`.
   - Logs land in `.verify-logs/`. Fix every failure, commit on the branch, then push or pull the fixes back to the
     Windows repo (`git pull ~/docman-verify feature/compliance-hardening` from the Windows checkout).
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
