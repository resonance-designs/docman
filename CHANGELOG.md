# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Add application-wide UI Customization under System Settings for admins and superadmins: link/heading/paragraph colors and sizes, raster logo upload/removal, left/right/top navigation, and configurable footer with preview, save/discard and default restoration.
- Persist validated branding in the database and expose only public appearance fields before sign-in; audit saves without logo bytes.

### Maintenance

- Generalize public deployment guidance, acceptance records, fixtures, and installer examples; rename environment-specific records and remove an unrelated IDE project mapping. Keep real deployment identities and infrastructure details in private operator records.

- Run audit and installation/update safety checks on every PR to support required master branch checks; document PR-only master updates with force pushes and deletion disabled.

## [3.0.5] - 2026-11-24

### Fixed

- Remove inactive Security section parameters when switching System Settings tabs, so shared Storage links remain accessible to admins after a superadmin visits Users or Authentik Linking (PR #59).

### Changed

- Move Users, Audit Log, and Authentik Linking from the main sidebar into System Settings → Security, preserving role restrictions and existing deep links.
- Group System Settings into Security, Email & Notifications, Storage, and Software Updates tabs. Preserve existing role restrictions, individual save actions, and form state when changing tabs.

### Documentation

- Record operator-confirmed development UI update acceptance from 3.0.3 to 3.0.4 and successful corrected-helper installation. Keep restore, failure-recovery, and future corrected-helper update drills explicitly pending.

## [3.0.4] - 2026-11-24

### Fixed

- Prevent stale updater polls from restoring answered prompts; start saved-ticket progress independently of backend status and release requests.
- Validate the helper's Apache rewrite/proxy layout before editing configuration and restore the current site's configuration and include if configtest fails.
- Replace backup destination prompt-text matching with an explicit CLI/web selection hook, preserving LOCAL/SAVED restrictions.
- Require preservation of retired-service data/configuration before suspension as well as deletion.
- Resolve all five PR #55 findings locally; 50 Linux updater tests, 20 frontend regressions, Vue build, and Bash syntax passed. Live update/restore acceptance remains pending.

### Documentation

- Record all five PR #55 CodeRabbit findings as deferred work for the UI-update testing branch, with source links and acceptance criteria; no associated fixes are included in this documentation pass.

## [3.0.3] - 2026-11-24

### Added

- Add a superadmin-only Software updates panel for newer stable GitHub tags, pinned release selection, interactive confirmations/encrypted backup prompts, and progress through backend downtime. Reuse CLI update safety checks and recovery behavior through a separately installed root-owned broker with restricted control and read-only progress sockets.
- Add one-time Ubuntu helper/Apache setup, web-update operations and recovery guidance, and focused API, broker, prompt, progress and frontend tests. Full Ubuntu end-to-end update/restore acceptance remains pending.

### Documentation

- Document recovery for a missing GitHub Pages site and the separate Render dashboard actions required to disable automatic deployment and retire an existing service.

### Fixed

- Reject interrupted updater responses instead of leaving backend requests pending.
- Serialize helper installation and broker starts, retaining the CLI update lock through helper restart to protect existing installations too.
- Offer and revalidate only published, non-draft, non-prerelease GitHub releases with newer stable version tags and pinned commits.
- Correct the deployment record: feature commit `e0da7c3` and helper setup passed development checks; full UI update and restore acceptance remain pending. PR #54 follow-up validation passed 46 Linux updater tests, 15 backend tests, and Bash syntax checks.

## [3.0.2] - 2026-11-24

### Documentation

- Record the eight PR #52 functional follow-up findings and validation; correct the handoff's committed/version status. Keep the optional migration cursor optimization deferred.
- Track all 42 PR #50 CodeRabbit findings with individual 3.0.2 dispositions and validation evidence. Correct update/restore/email setup ordering, lock recovery, existing repository password guidance, and generated manual metadata/QA heading verification.

### Fixed

- Repair existing project/team mismatches on no-op add/remove requests, retain pending-sync status during metadata edits, and rotate bounded recovery scans so failing projects cannot starve later work. Make concurrency mocks evaluate the actual revision predicate.
- Clear stale in-memory login state on tokenless HTTP 401 responses after cross-tab logout, while preserving subsequent logins.
- Persist project/team reconciliation with relationship changes; retry partial reciprocal writes with revision fences, coordinate team-side writers and project deletion, and report committed changes while cleanup is pending.
- Treat fail-open audit `null` results as audit failures after committed invitation activation, notification settings saves, and email retry requests, preserving successful mutation results and accurate warnings.
- Preserve a newer login when an older session hydration request fails or returns HTTP 401.
- Defer updater cancellation during child-process construction until cleanup owns the child, without blocking signals in the child. Reuse protected backup credentials for equivalent normalized local repository paths.
- Execute the installer from root-owned private state, persist completion and administrator-password removal atomically, and make interrupted configuration writes and invalid upload-size answers retryable.
- Remove public bearer tokens from serialized audit paths and Apache access logs; document applying the safe log format to existing deployments.
- Coordinate document category writes with book/category guards, retry holder-matched guard release, and prevent concurrent project date updates from creating invalid ranges.
- Prevent stale account/project saves from emitting false change notices; report committed invitation/settings changes accurately when audit or notification cleanup fails. Preserve legacy password verification and multiline biographies.
- Preserve consistent backups across pending service restarts; exclude incomplete snapshots from retention. Harden updater environment snapshots, backup destinations, ignored local files, read-only checks, TLS checks, and interruption recovery.
- Correct stale session/editor responses, project metadata edits with unchanged teams, public links under a router base, and uppercase reciprocal project IDs. Check missing uploads independently of checksum backfill.
- Isolate MongoDB test endpoints, verify child identity before fixture writes, and cancel stalled bootstrap processes. Add focused backend, frontend, installer, updater, Apache and manual-generation regressions.

## [3.0.1] - 2026-11-18

### Added

- Add Vue management interfaces for categories, books, teams and projects, including membership/collaborator roles, resource links, confirmation dialogs and Activity-based team invitation acceptance. Correct populated-member permissions, restrict organizational/document selectors, protect referenced categories, and clean linked references on deletion.
- Add illustrated end-user and end-to-end QA PDF manuals, editable sources, a generated mounted-API inventory, a blank execution worksheet, and reproducible PDF build/verification scripts.
- Add superadmin global public-sharing controls, with an optional existing-link suspension enforced on anonymous pages and downloads.
- Add opt-in anonymous public document links with current-approved-version downloads, revocation, and restricted metadata.
- Add My account profile editing and current-password-verified password changes with configured policy enforcement and session revocation. Restrict the legacy profile endpoint from changing credentials or access controls.
- Persistent in-app/email activity notifications for document assignments and lifecycle, account roles/status, team/project membership changes, and review tasks/due reminders; background retries and superadmin pause/status/retry controls.
- Notification event, delivery and hook regression tests and an operations/acceptance guide.
- Superadmin-created accounts now receive 24-hour single-use email invitations to choose their own passwords, with pending status, resend/revoke actions, and explicit delivery-failure recovery.
- Account settings for minimum password length (14–24, default 18) and local self-registration (off by default), with a viewer-only signup page and shared backend password policy. The existing 72 UTF-8 byte limit remains.
- Interactive `update.sh` for existing standard-layout Ubuntu deployments: staged unprivileged builds, encrypted pre-update snapshots, maintenance locking, preserved configuration/keys, migration/result checks, matching frontend publication and trusted HTTPS verification. Includes failure-boundary tests and beginner update/recovery documentation; full Ubuntu VM update acceptance remains pending.
- Interactive `install.sh` for fresh latest-LTS Ubuntu servers, with prerequisite installation, authenticated MongoDB/Redis, protected application keys, initial superadmin, Vue build, Apache/HTTPS, systemd startup, and optional encrypted backups/audit scheduling. Includes resumable configuration guards, beginner documentation and installer safety tests; full disposable-VM installation acceptance remains pending.
- development POC deployment/validation execution record, separating confirmed server evidence from pending checks.

### Changed

- Restrict `npm run version:sync` to an explicit allowlist of package manifests/lockfiles, README files, `DEVELOPER_ONBOARDING.md`, `project-config.json`, `App.jsx`, `install.sh`, and `update.sh` (at most 23 files). Stop recursively updating source-file version headers; existing comments outside the allowlist remain untouched to keep release PRs within review limits.
- Add version markers to `install.sh` and `update.sh` so subsequent version syncs include both scripts. Add an isolated regression test covering allowed updates, unchanged excluded files, dependency-version preservation, patch increments, and invalid-version rejection.
- Retire Render hosting guidance, docs navigation and legacy startup environment; retain self-hosted Ubuntu/Linode deployment and optional Atlas support.
- Fix review calendar dates displaying the previous day in timezones west of UTC, while retaining local-time activity timestamps.
- Close management permission and invitation-retry gaps; filter activity resource names by current access. Improve failed-load recovery, public-link route refresh and narrow-screen account actions; refresh both PDF manuals for the management interfaces.
- Database-managed registration policy replaces the legacy environment switch. Existing accounts and passwords remain valid; bootstrap provisioning remains independent of email.
- Allow an explicit backend `NODE_HOST`; fresh installations bind to loopback behind Apache while existing deployments retain the default when unset.

### Fixed

- Remove the initial administrator's plaintext password from persisted installer state after writing completion results and before marking installation complete; add regression coverage for cleanup and failed writes.
- Make the isolated-recovery email-disable command upsert a missing outbound settings record and require an acknowledged match or insert before reporting success. Preserve provider disabling and credential clearing; explicitly keep the recovery app stopped on failure.
- Keep newly created review-assignment alerts deliverable to reviewers without separate document access by queuing generic account notices after assignment save, without a document reference or access mutation. Preserve document-event access rechecks and recipient safeguards; add event, post-save and worker regression coverage.
- Serialize category deletion/type changes with book creation and category reassignment under one cross-process database guard, holding validation through the book save. Concurrent requests receive a retryable conflict. Add interleaving regression tests and document recovery for an interrupted non-expiring guard.
- Forward password-reset account-policy lookup failures to Express error middleware instead of leaving an unhandled rejected promise. Preserve input validation and configured password requirements; add regression tests for error forwarding and validation before policy lookup.

## [3.0.0] - 2026-11-18

Follow-up changes and verification recorded on 2026-11-17 and 2026-11-18; these do not represent a new release.

### Added

- Encryption at rest for stored document files, transparent to users: uploads stream to disk encrypted (chunked AES-256-GCM, per-file keys wrapped by `DOCUMENT_ENCRYPTION_KEY`), downloads stream and decrypt with per-chunk authentication. Superadmin **System Settings → Document storage** controls encryption and the maximum upload size (default 50 MB, ceiling `MAX_UPLOAD_MB_CEILING`). Replaces the short-lived per-version document passwords and user-held encryption keys, which were removed before release.
- Superadmins can demote or disable other superadmins (never themselves, never the last active superadmin), serialized by a cross-process lock; role changes revoke sessions.
- Superadmin-only outgoing email settings and test-email action: authenticated or IP-authorized SMTP relay, STARTTLS/direct TLS, AWS SES server credentials or stored API keys, legacy SES environment mode, and disabled sending. Existing password-reset/review callers use saved settings.
- Superadmin-only Users interface for account creation, profile/role editing, password resets, and disabling/re-enabling accounts, with pagination/search and audit records. Self-registration remains independently disabled.
- Complete beginner-oriented Ubuntu 26.04 LTS server installation and operations guide, including prerequisites, secure native services, local account provisioning, HTTPS, SES, encrypted off-server backups, restore drills, and safe updates. Supersedes the old manual checkout-deletion procedure.

### Security

- Remove the smoke-test administrator password fallback; require explicit test credentials and generate fresh verification/Redis-fixture passwords. Document PR 47 historical secret findings without suppressing checks.
- Plaintext of uploaded documents is never written to disk when encryption at rest is on; stored files are created with mode 0600. Existing passwords continue to unlock their versions.
- Encrypt UI-managed email credentials with AES-256-GCM and a dedicated server key; never return credentials/ciphertext to clients. Enforce TLS for SMTP login, certificate validation, revision conflict detection, audited operations, and test-email rate limits.
- Refreshed dependency lockfiles across backend, Vue, legacy React, documentation, and root tools; removed obsolete npm crypto and replaced unused vulnerable Nodemailer with patched 10.6.0 for the new SMTP transport. Backend production audit is clean and all trees have zero critical findings. Unpatched Picomatch findings remain open; see [dependency review](docs/dependency-security-review.md) for scope and counts.
- Repaired the cross-platform dependency audit to cover all five lockfiles and fail on unavailable/invalid reports; added weekly/change-triggered CI auditing without suppressing known findings.
- Enforced account-management authorization server-side; reject disabled accounts and invalidate local sessions after administrator password/status changes. Superadmins cannot be deleted, and only another superadmin can demote or disable one, provided at least one active superadmin remains.
- Applied document visibility rules to book/project responses, analytics exports, and custom document charts to prevent metadata exposure through related endpoints.
- Enforced token blacklisting for Authentik sessions and report logout failure when token invalidation cannot be persisted.
- Removed document-list and analytics response caching so permission changes take effect on subsequent requests; added no-store headers for API responses.
- Removed server file paths and internal publication snapshots from version and approval responses.

### Fixed

- Preserve real filesystem existence checks in the test setup so native bcrypt selects the correct Linux libc; include user-management tests in Linux verification.
- Prevented concurrent uploads from creating duplicate version numbers or multiple active versions using database uniqueness constraints.
- Made interrupted publication resumable through a durable `publishing` state and a Vue **Retry publication** action; retries preserve a single version-history entry and publication revision.
- Made successful publication audit events idempotent across concurrent server processes using a sparse unique database key. Retries reuse the existing event without consuming audit sequence numbers or emitting duplicate stdout records; historical entries and hashes remain unchanged.
- Updated the compliance migration to detect conflicting existing versions before changes and replace the old nonunique version index.
- Clear the Vue reactive session on HTTP 401 and display approver names in document details.
- Repaired the Authentik identity test suite for the existing Jest configuration and made Linux verification propagate test failures.

### Changed

- Documented the reported development another application SMTP endpoint (`smtp.example.org:25`) as a candidate for DocMan, with unconfirmed TLS/authentication, sender restrictions, network access, relay authorization, and delivery checkpoints.
- Aligned Jest/babel-jest, upgraded documentation tooling with explicit security overrides, and migrated legacy React validation to patched Zod/resolver versions with regression coverage.
- Completed time-service installation/internal-source guidance, outbound dependency-access requirements, and application file-log rotation/retention instructions after a fresh-server dependency cross-check.
- Reworked fresh-server preparation into ordered package/update/time checkpoints, documented stage completion criteria, separated backup-host prerequisites, protected existing settings and certificate requests on retries, and replaced conflicting handoff progress notes with a current-status table.
- Consolidated fresh-server prerequisite installation, added explicit tool/time and backup-tool checks, corrected backup-user prompt sequencing, and reconciled current development deployment status with confirmed evidence.
- Added an explicit Apache installation/version checkpoint before website configuration; clarified that the www-data permission check does not prove Apache is installed.
- Added an explicit save-before-edit checkpoint for encoded database/Redis credentials and the JWT key, with recovery after clearing the terminal or interrupting configuration editing.
- Expanded Redis deployment instructions with startup-error diagnosis, malformed-line correction, restart-limit recovery, and step-by-step authentication checks; updated confirmed development installation checkpoints.
- Replaced generated hexadecimal password instructions with user-chosen passwords of at least 18 characters for the development walkthrough; clarified new-password prompts and safe configuration quoting/URL encoding, and synchronized Redis guidance and the handoff.
- Revised the deployment walkthrough throughout for beginner usability: explicit prompts, file-edit commands, expected outputs, failure actions, and staged migration/backup/restore/update checks; corrected private-certificate Apache activation order.
- Recorded the standing deployment-documentation requirement: one complete beginner-followable walkthrough for the latest stable Ubuntu Server LTS, covering all prerequisites and kept synchronized with guided installation steps.
- Updated the Ubuntu deployment guide with a single Ubuntu 26.04 LTS installation path, the internal development POC installation sequence, MongoDB 9 repository commands, database authentication checks, and explicit completed/pending deployment checkpoints.
- Updated the GitHub deployment workflow to accept and validate Authentik build variables, run security/identity tests, build and publish the Vue remote bundle, and run migration preflight and migration.
- Raised the documented MongoDB minimum to 6.0 for the partial active-version index; verified with MongoDB 8.0.34.
- Expanded workflow smoke tests and added `backend/src/scripts/verifyWorkflowRecovery.js` for disposable-database recovery and signed-token revocation checks.

### Verification

- Email settings: 130 targeted backend tests pass on Windows and Linux/Node 22, including 31 new email tests. Verified local relay/TLS/STARTTLS delivery, certificate rejection, encryption/redaction, role enforcement, rate limits, concurrent saves, and browser save/reload/test flows. development mail delivery and live AWS SES remain pending.
- Dependency update: 99 targeted backend tests and five audit/schema checks pass on Windows and Linux/Node 22; Vue production/remote, legacy React, documentation builds, and Swagger generation pass. Disposable-MongoDB smoke tests pass all 24 checks plus concurrent publication recovery (memory rate-limit store). See the dependency review for fixture/verification limitations. Full-tree audits remain nonzero only for unpatched Picomatch.
- User management: passed 39 targeted tests and 25 disposable-MongoDB integration checks; built Vue and verified browser account creation and disabling. development deployment of this update remains pending.
- Passed 78 targeted security, compliance, and identity tests across seven suites.
- Forced two independent Node processes to retry the same publication simultaneously against MongoDB; verified one publication audit entry, one history entry, one revision, database uniqueness, and a valid gap-free audit chain (`verifyAuditConcurrency.js`).
- Passed 24 end-to-end checks against real MongoDB with both memory and local Redis 7 rate limiting, without Redis fallback.
- Completed clean Linux installs and production builds for Vue (Vite 8), the Vue remote bundle, and legacy React.
- Exercised browser sign-in, replacement upload, separate-user approval, authenticated download, revision history, and audit views.
- Restored a disposable MongoDB backup and uploaded files; verified checksums and audit integrity, recovered an injected publication failure without duplicate history/revisions, and tested revocation of a real RSA-signed test Authentik token.

### Upgrade Notes

- Stop writes and run the compliance migration before release. Conflicting existing versions require resolution before the new indexes can be created.
- The migration also creates the unique audit idempotency-key index. Install it before resuming writes and run the updated code on every application process; no historical audit backfill or deletion is needed.
- An interrupted publication requires an authorized retry; this is recovery across multiple writes, not a cross-collection transaction.
- Verification used isolated test services and synthetic data. Production deployment, live Authentik/Upstash configuration, and the unrelated failing legacy backend test suites were not verified as passing.

## [2.3.0] - 2026-11-16

### Added

- Append-only, hash-chained audit log (`AuditLog`) with admin search, CSV/JSON export, integrity verification (`GET /api/audit/verify`, `npm run audit:verify`), and per-document audit trails.
- Immutable document revision history (`DocumentRevision`) with full snapshots and field-level diffs for create, update, delete, restore, publish, and review changes.
- Change-approval workflow for file versions: pending → approved/rejected/withdrawn, designated approvers, separation of duties (no self-approval), configurable approval threshold, and an approvals inbox.
- SHA-256 checksums for stored files, verified on every download.
- Authenticated, audited file downloads (`GET /api/docs/:id/files/:fileId/download`).
- Soft delete with reasons and admin restore.
- Switchable rate-limit store: Upstash, self-hosted Redis (built-in RESP client, no new dependency), or in-memory; runtime switch for superadmins in System Settings.
- Vue screens: document versions/approvals/revisions/audit panels, Approvals inbox, Audit Log, System Settings.
- `npm run migrate:compliance` data migration and `docs/compliance-and-redis.md`.

### Security

- `/uploads` no longer serves document files publicly.
- Per-document access checks on all document routes; field allow-list on document updates.
- Review assignments restricted to the assignee or admins.
- Self-registration can no longer request elevated roles.
- Password reset hardened (hashed tokens, input type checks, no account enumeration, configurable link base URL).
- Admins can no longer change superadmin roles or their own role.
- `trust proxy` configured so audit and rate limiting see real client IPs.
- Swagger UI and destructive maintenance tools disabled in production by default.

### Removed

- Unused generic `POST /upload` endpoint.

## [2.2.7] - 2026-04-30

### Changed

- Changed the Authentik backend identity flow to auto-link existing local users by verified email on first sign-in.
- Changed the Authentik backend identity flow to just-in-time provision new local viewer accounts for verified Authentik identities that do not already exist in MongoDB.
- Changed the Vue login experience to expose `Create Resonance Account` when an Authentik enrollment URL is configured and to de-emphasize legacy local-only access.
- Added `LOCAL_SELF_REGISTRATION_ENABLED` so production can disable the legacy local `/auth/register` path when Authentik is the canonical suite registration authority.
- Updated deployment and recovery documentation to explain the new verified-email auto-linking path, JIT provisioning behavior, and the remaining manual `authentikSub` repair workflow.

## [2.2.6] - 2026-04-29

### Changed

- Hardened `apache_production_deploy.sh` to create a persistent full backup of the existing deployment tree, Apache publish root, and backend systemd unit before replacing them.
- Changed the deployment script to prompt for Authentik frontend/backend env values and materialize `frontend-vue/.env.production` before the Vite build.
- Hardened `apache_production_update.sh` and `apache_production_update_ni.sh` to restore from persistent local backups instead of relying on a fresh git clone during rollback.
- Updated `backend/.env.sample`, `frontend-vue/.env.production.example`, and README guidance to document the real frontend Authentik build env flow.

## [2.2.5] - 2026-04-29

### Added

- Added `.secrets/.env.prod` as a local ignored production env reference for recovery and deployment patching.
- Added `AUTHENTIK_JWKS_URL` support so the backend can verify Authentik RS256 tokens from JWKS instead of relying solely on a hard-coded PEM.

### Changed

- Updated `apache_production_deploy.sh` to preserve discovered `.env*` files under `~/docman/env-backups/` and keep `~/docman/previous-backend.env.prod` as the preferred recovery source.
- Changed the deployment script to detect and reuse existing production values more safely during recovery prompts instead of depending on placeholder `.env` content.
- Modernized `apache_production_update.sh` to rebuild the Vue frontend, publish the remote bundle, preserve prior env files, and follow the current `docman` service model.
- Modernized `apache_production_update_ni.sh` to match the current Vue/remote-bundle deployment path, preserve env backups, and require explicit SSL domain/email inputs for Certbot automation.
- Updated deployment documentation and README guidance to reflect the current Linode, Apache, Authentik, SES, Redis, and hybrid remote-bundle deployment path.
- Updated backend Authentik configuration examples and `.env.sample` to prefer JWKS-based validation with `AUTHENTIK_JWKS_URL`.
- Updated Swagger/OpenAPI metadata to use `info@resonancedesigns.dev`, label the live API correctly as production, and remove stale `docman.com` assumptions.
- Updated package metadata and backend email fallbacks to use the Resonance Designs contact address consistently.

## [2.2.4] - 2026-04-27

### Added

- Added Authentik migration architecture documentation in `docs/architecture/ADR-005-suite-identity-migration.md`.
- Added transitional backend identity resolution support for future Authentik-issued tokens.
- Added `authentikSub` and provider-linking support to the local DocMan user model.
- Added a CLI script and admin API/UI workflow for linking existing DocMan users to Authentik identities.
- Added an Authentik PKCE login path in `frontend-vue` for suite-level sign-in.
- Added a reusable MongoDB TLS helper script in `scripts/setup-mongodb-ssl/setup-mongodb-ssl.sh`.

### Changed

- Updated `apache_production_deploy.sh` to align with the current RDocMan architecture.
- Changed the deployment script to build and publish `frontend-vue` instead of the legacy frontend.
- Changed the deployment script to publish `frontend-vue/dist-remote/remote/` for the RDSysCMD hybrid desktop module.
- Changed the deployment script to recreate `docman-backend.service` with the `docman` service user.
- Changed the deployment script to detect and reuse an existing MongoDB server configuration when available.
- Changed the deployment script to reuse prior `.env.prod` values from the latest deployment backup as prompt defaults when available.
- Tightened the documented and scripted Node.js requirement to `20.19+` or `22.12+` for the current Vue/Vite toolchain.
- Updated deployment documentation and README guidance to reflect the current Vue/Vuetify, Authentik, and hybrid remote-bundle deployment path.

## [2.2.3] - 2026-04-25

### Added

- Added a project-specific Docusaurus documentation site under `docs-site/`.
- Added maintainer documentation for release workflow, version syncing, GitHub Actions, Render, Linode, Cloudflare, data safety, and frontend selection.
- Added a GitHub Pages workflow for publishing the Docusaurus docs site from `docs-site/`.
- Added `docs-site/package.json` and `docs-site/package-lock.json` to `npm run version:sync` coverage.

### Changed

- Updated README and developer onboarding documentation to link maintainers to the release/deployment guide and docs site.
- Updated the Linode GitHub Actions deployment workflow to build the selected UI and deploy the selected frontend bundle.
- Changed the Linode deployment workflow to manual-only with `workflow_dispatch` while server-side SSH setup is unfinished.
- Synchronized app version metadata to `2.2.3` across package files, lockfiles, project config, README badges, and tracked source headers.

### Verified

- Verified the docs site with `npm ci --prefix docs-site`.
- Verified the docs site production build with `npm run build --prefix docs-site`.

### Notes

- The docs build succeeds with a non-fatal webpack warning from `vscode-languageserver-types`.
- The docs dependency tree currently reports npm audit findings inherited from the Docusaurus install.

## [2.2.2] - 2026-04-25

### Added

- Added configurable production UI selection with `DOCMAN_UI=vue|react`, defaulting to the Vue/Vuetify interface.
- Added cross-platform build commands:
  - `npm run build`
  - `npm run build:vue`
  - `npm run build:react`
- Added backend production static serving support for the selected UI bundle.
- Added safe deployment seeding with `npm run seed:safe`.
- Added optional startup seeding with `SEED_ON_DEPLOY=true`.
- Added default account configuration for safe seeding:
  - `DOCMAN_DEFAULT_EMAIL`
  - `DOCMAN_DEFAULT_USERNAME`
  - `DOCMAN_DEFAULT_PASSWORD`
- Added production data clearing safeguards for all `clear:*` scripts.
- Added `npm run version:sync` to synchronize app version metadata from the root `package.json`.
- Added `npm run git:release` to create and push `release/X.X.X` branches and `vX.X.X` tags from the root package version.

### Changed

- Changed the default production build target from the legacy React frontend to the Vue/Vuetify frontend.
- Updated environment documentation for Render/Atlas deployment settings.
- Updated `.env.sample` with UI selection, safe seed, and default account settings.
- Synchronized tracked app version metadata across package files, lockfiles, README badges, project config, docs, scripts, and source headers.

### Safety

- Safe seeding now refuses to delete, drop, or recreate collections.
- Safe seeding only inserts sample data when the database is empty.
- If records exist but no users exist, safe seeding creates only the configured default superadmin account.
- Production clear scripts now refuse to run unless `CONFIRM_PRODUCTION_CLEAR=true` is explicitly set.
- Release automation refuses to run with a dirty worktree, detached HEAD, duplicate release branch, or duplicate tag.

### Notes

- `npm run git:release` intentionally requires committed changes before creating and pushing a release branch/tag.
- Jest verification is still blocked by the existing missing `jest-watch-typeahead/filename` configuration dependency.
