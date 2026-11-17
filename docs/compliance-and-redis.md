# DocMan 2.3.0 — Audit Log, Revision History, Change Approval, and Redis Options

This release prepares DocMan for regulated, self-hosted use (for example on agency-managed Ubuntu LTS servers).
It adds a tamper-evident audit log, full revision history, a change-approval workflow for document versions,
security fixes, and a switch between Upstash and a self-hosted Redis server for rate limiting.

## 1. What changed for users

| Area | Before | Now |
| --- | --- | --- |
| New file versions | Live as soon as an editor uploaded them | Enter **Awaiting approval**; published only after approval |
| Who approves | — | The document's **Approvers** (or its **Owners** if none are set) and admins. Nobody can approve a version they uploaded. |
| Rejections | — | Require a written reason, shown to the uploader |
| Downloads | Public `/uploads/<file>` URL, no login | Signed-in download with access check, checksum verification, and an audit entry |
| Document edits | Overwrote fields | Every change stored as a numbered revision with before/after values |
| Deleting | Permanent | Soft delete with a required reason; admins can restore from **System Settings** |
| Activity logging | Console output only | Append-only, hash-chained audit log with search, CSV/JSON export, and integrity verification |

New screens in the Vue interface:

* **Document detail** — Versions panel (download, approve, reject, withdraw, upload new version), Revision history, Audit trail.
* **Approvals** — inbox of versions waiting for your decision.
* **Audit Log** (admins) — search, export, and (superadmins) verify integrity.
* **System Settings** (admins) — Redis store status/switch (superadmins can switch) and deleted-document recovery.

> The legacy React UI still works for downloads but has no approval screens. Use the Vue UI (`DOCMAN_UI=vue`, the default).

## 2. Permission model

| Action | Who |
| --- | --- |
| View a document and its published versions | Admins, author, owners, stakeholders, approvers, review assignees |
| View versions awaiting approval / rejected / withdrawn | Editors of the document, its approvers, and the uploader |
| Edit metadata, upload new versions, mark reviewed | Admins, or users with the **editor** role who are the author or an owner |
| Approve / reject a version | Admins and the document's approvers (owners when no approvers are set), never the uploader |
| Withdraw a pending version | The uploader or an admin |
| Update a review assignment | The assigned reviewer or an admin |
| See a document's audit trail | Admins, author, owners, approvers |
| Search/export the full audit log | Admins |
| Verify audit-log integrity, switch Redis store | Superadmins |
| Delete / restore documents | Admins (soft delete only) |

Every denied attempt above is itself written to the audit log with outcome `denied`.

## 3. Audit log

* Collection: `auditlogs`. Each entry records: sequence, timestamp, action, outcome, actor (id, email, role, auth type),
  resource, document, a summary, field-level changes, extra metadata, client IP, user agent, method and path.
* **Append-only:** the application refuses to update or delete entries (Mongoose middleware).
* **Tamper-evident:** each entry stores the SHA-256 of the previous entry. Editing, deleting, or re-ordering any entry
  breaks the chain, which **Verify integrity** (or `npm run audit:verify`) detects and reports.
* Recorded actions include sign-in/out and failed sign-ins, Authentik account provisioning, document
  create/view/update/delete/restore, file upload/download, integrity failures, version submit/approve/reject/withdraw/publish,
  review assignment changes, user and role changes, system setting changes, audit exports and verifications.
* Set `AUDIT_LOG_READS=false` to stop logging document views (downloads are always logged).
* Set `AUDIT_STDOUT=true` to also emit each entry as one JSON line to stdout so journald / a SIEM keeps an off-server copy.

Recommended hardening:

1. Forward the journal (with `AUDIT_STDOUT=true`) to the agency SIEM or log server so a copy exists outside MongoDB.
2. Schedule a nightly integrity check (exit code `2` means tampering was detected):

   ```ini
   # /etc/systemd/system/docman-audit-verify.service
   [Service]
   Type=oneshot
   User=docman
   WorkingDirectory=/opt/docman/backend
   Environment=NODE_ENV=production
   ExecStart=/usr/bin/node src/scripts/verifyAuditChain.js

   # /etc/systemd/system/docman-audit-verify.timer
   [Timer]
   OnCalendar=*-*-* 02:30:00
   Persistent=true
   [Install]
   WantedBy=timers.target
   ```

3. Include `auditlogs` and `documentrevisions` in MongoDB backups and follow the agency records-retention schedule.

## 4. Revision history

* Collection: `documentrevisions` (immutable). Every create, update, delete, restore, publish and review-status change
  stores a full metadata snapshot plus the before/after diff.
* API: `GET /api/docs/:id/revisions`.

## 5. Change approval

Configuration (environment):

| Variable | Default | Meaning |
| --- | --- | --- |
| `APPROVAL_REQUIRED` | `true` | `false` publishes uploads immediately (still audited) |
| `APPROVAL_MIN_APPROVALS` | `1` | Distinct approvals needed to publish |
| `APPROVAL_ALLOW_SELF_APPROVAL` | `false` | Keep `false` for separation of duties |

Lifecycle: `pending_approval` → `approved` (published, becomes the document's `currentVersion`; the previous published
version becomes `superseded`) or `rejected` / `withdrawn`. Only one version per document can be pending at a time.
Every stored file gets a SHA-256 checksum at upload; downloads are blocked (HTTP 409) and logged if the file on disk no
longer matches.

API:

```text
GET  /api/docs/approvals/pending                 approval inbox for the current user
GET  /api/docs/:id/files                         versions the caller may see
GET  /api/docs/:id/files/:fileId/download        authenticated, audited, checksum-verified download
POST /api/docs/:id/upload                        upload a new version (multipart: file, versionLabel, changelog)
POST /api/docs/:id/versions/:version/approve     { comment }
POST /api/docs/:id/versions/:version/reject      { comment }  (required)
POST /api/docs/:id/versions/:version/withdraw    { comment }
GET  /api/docs/:id/revisions                     metadata revision history
GET  /api/docs/:id/audit                         audit trail for one document
DELETE /api/docs/:id                             soft delete { reason }
POST /api/docs/:id/restore                       restore (admin)
GET  /api/docs/deleted                           deleted documents (admin)
GET  /api/audit  /api/audit/export  /api/audit/verify
GET  /api/system/redis   PUT /api/system/redis   { provider: "upstash" | "local" | "memory" | null }
```

## 6. Redis: Upstash or self-hosted (switchable)

DocMan uses Redis only for rate-limit counters (client IP / user id keys with timestamps — no document content).

| Provider | Configure | Notes |
| --- | --- | --- |
| `upstash` | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Hosted by Upstash; counters leave the server |
| `local` | `REDIS_URL=redis://:<password>@127.0.0.1:6379/0` (`rediss://` for TLS) | Runs on agency infrastructure; no extra npm package needed |
| `memory` | nothing | Single-process only; counters reset on restart |

Selection order: the choice saved by a superadmin in **System Settings** → `REDIS_PROVIDER` → automatic
(Upstash if configured, else local, else memory). Credentials always stay in the environment file; the database only
stores which provider is selected. Switching tests the connection first and is written to the audit log. Both providers
can be configured at the same time so leadership can switch without a redeploy. If the active store becomes unreachable,
requests fall back to the in-memory limiter (shown as a warning on the System Settings page) instead of failing.

### Installing Redis on Ubuntu 24.04 LTS (same server as DocMan)

```bash
sudo apt update && sudo apt install -y redis-server
sudo sed -i 's/^supervised .*/supervised systemd/' /etc/redis/redis.conf
# Listen only on localhost, require a password, keep protected mode on
sudo sed -i 's/^bind .*/bind 127.0.0.1 -::1/' /etc/redis/redis.conf
sudo sed -i 's/^protected-mode .*/protected-mode yes/' /etc/redis/redis.conf
REDIS_PASS=$(openssl rand -hex 32)
echo "requirepass $REDIS_PASS" | sudo tee -a /etc/redis/redis.conf >/dev/null
sudo systemctl enable --now redis-server && sudo systemctl restart redis-server
redis-cli -a "$REDIS_PASS" ping   # PONG
echo "REDIS_URL=redis://:$REDIS_PASS@127.0.0.1:6379/0"   # add to backend/.env.prod
```

Then set `REDIS_PROVIDER=local` (or leave it empty and pick **Self-hosted Redis** in System Settings) and restart the
`docman` service.

## 7. Other security fixes in this release

* `/uploads` no longer serves document files; only profile pictures/background images referenced by a user record.
* Every `/api/docs/:id/...` route checks access to that specific document (previously only the role was checked).
* Document updates use an allow-list; clients can no longer overwrite version numbers, history, review completion, etc.
* Review assignments can only be changed by the assignee or an admin; users can only list their own assignments.
* Self-registration always creates a **viewer** (previously a registrant could request any role, including superadmin).
* Password reset: tokens are stored hashed, inputs are type-checked (NoSQL injection), the reset link uses
  `APP_BASE_URL`, responses no longer reveal whether an account exists, and other sessions are signed out.
* Admins can no longer change a superadmin's role or their own role.
* `trust proxy` is set (default `loopback`) so the audit log and rate limiter see the real client IP behind Apache.
* Swagger UI is off in production unless `ENABLE_API_DOCS=true`.
* Destructive maintenance endpoints (clear/restore collections, archive files, dummy data) are disabled unless
  `ALLOW_DESTRUCTIVE_ADMIN_TOOLS=true`, and every attempt is audited.
* The unused generic `POST /upload` endpoint (which created untracked files) was removed.

## 8. Upgrading an existing installation

```bash
cd /opt/docman/backend            # your backend directory
git pull && npm ci
# 1. Review new variables in .env.sample and add them to .env.prod (at minimum APP_BASE_URL)
# 2. Preview, then run the data migration (idempotent)
NODE_ENV=production npm run migrate:compliance:dry-run
NODE_ENV=production npm run migrate:compliance
# (scripts/apache_production_update.sh now runs step 2 for you)
# 3. Rebuild the Vue frontend and restart
sudo systemctl restart docman
# 4. Sign in as superadmin → Audit Log → Verify integrity
```

The migration marks existing file versions as approved (they were already live), records checksums for stored files,
reports files that are missing on disk, creates a baseline revision for every document, and writes a
`system.migration` audit entry.

## 9. Verifying on Linux (Ubuntu, WSL, CI)

Everything builds and runs on Linux; nothing depends on Windows. One script does a clean install, the unit tests,
both frontend builds, and an end-to-end smoke test against real MongoDB and Redis:

```bash
git clone <repo> ~/docman && cd ~/docman && git checkout <branch>
bash scripts/verify-linux.sh                     # uses Docker for MongoDB + Redis (docker-compose.yml)
MONGO_URI=mongodb://127.0.0.1:27017 REDIS_URL=redis://:pass@127.0.0.1:6379/0 bash scripts/verify-linux.sh   # your own services
SKIP_E2E=1 bash scripts/verify-linux.sh          # no database available
```

The smoke test (`backend/src/scripts/smokeTest.js`) can also be pointed at any running instance:
`SMOKE_BASE_URL=https://docman.example.gov SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... node src/scripts/smokeTest.js`.
It creates a category, a document, and test viewer accounts, so run it against a dev/staging server, not production.

`MONGO_URI` (or `MONGODB_URI`) now works for any environment, not only Atlas; the existing `MONGO_HOST`/`MONGO_PORT`/…
variables keep working when it is not set. The Apache update scripts now run the 2.3.0 data migration automatically.

## 10. Known limitations

* The audit hash chain is tamper-*evident*, not tamper-*proof*: someone with direct database write access can alter
  entries, but verification will detect it. Off-server copies (SIEM) provide recoverability.
* Approval applies to file versions. Metadata edits (title, owners, dates) are revisioned and audited but not gated
  behind approval.
* Version comparison reports metadata and whether content changed (checksum); it does not diff document contents.
* Books, projects, teams, and analytics endpoints were not part of this review and still use role-only checks.
* Approval UI exists only in the Vue frontend.
