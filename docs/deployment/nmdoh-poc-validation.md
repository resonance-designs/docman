# NMDOH POC update and end-to-end validation

Started November 18, 2026. This is the working execution record, not a statement that the new release has passed on NMDOH infrastructure.

## Scope and environment

- User authorized updating the internal NMDOH development server, testing the deployed application end to end, and documenting passes and failures before deciding subsequent work.
- Previously confirmed host: `dohr2simdocmdev`; URL: `https://docman-dev.doh.nm.gov`.
- Access: user operates the server through the NMDOH remote workstation. Local assistant checks are not server execution evidence.
- Previously used layout: checkout `/var/www/docman`, backend service `docman-backend`, published Vue assets `/var/www/html/docman/public_html`, uploads `/var/lib/docman/uploads`.
- Local candidate: commit `656c74c` (merged development baseline), package version 3.0.0. Verify remote availability and select an exact commit before updating. Local uncommitted changelog text is not part of that candidate.
- Server's current commit, current working-tree state, installed backup tooling and recoverable backup: awaiting inventory.
- Picomatch advisory GHSA-fc5q-39xc-vjpf is deferred by the user for this internal POC only. Keep audit failures visible; no production risk acceptance is implied.

## Execution rules

Follow the [Ubuntu walkthrough](ubuntu-server-installation.md), particularly update section 19. Confirm prerequisites rather than assuming backup services or keys exist. Capture the previous commit and a usable recovery backup before mutation. Preserve environment files, uploads, database and existing keys. Use harmless synthetic documents and dedicated test accounts. Do not run destructive fixture scripts against the live POC database. Do not record passwords, tokens, private keys or document contents here.

Use `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN` with observed evidence. A skipped test is not a pass. Record command/browser action, expected result, actual result and follow-up for each failure. Server-side restore and ciphertext-corruption testing must use an isolated restored copy, never alter the active POC's stored files for a test.

## Checkpoints

| Check | Status | Evidence / next action |
| --- | --- | --- |
| Current checkout, commit and service health | PASS | User-reported server output: clean `feature/compliance-hardening` checkout at `67b1790`; `docman-backend`, Apache, MongoDB and Redis all `active`; root filesystem 48 GB total, 37 GB available (21% used). |
| Backup prerequisites, consistent database/files backup and rollback record | NOT RUN | Determine what is actually installed before issuing backup commands. |
| Exact target commit and release configuration | NOT RUN | Confirm branch/commit, document key and proxy upload limits without exposing secrets. |
| Locked backend/Vue installs and production build | NOT RUN | Record exit status, versions and relevant warnings. |
| Migration preflight, migration and audit-chain verification | NOT RUN | Record results before restart. |
| Static publication, backend startup and HTTPS/API checks | NOT RUN | Confirm frontend and backend belong to the selected release. |
| Login, superadmin user management and logout/session revocation | NOT RUN | Use dedicated test accounts; protect the real administrator. |
| Document creation, assignments and ordinary metadata edits | NOT RUN | Record expected access for uploader, approver, reader and outsider. |
| Replacement upload, approval/rejection/withdrawal and publication | NOT RUN | Verify separation of duties, version/history/audit consistency. |
| Approved download and original-content checksum | NOT RUN | Verify bytes match the harmless original test file. |
| Transparent encryption, stored-byte checks and old-file compatibility | NOT RUN | Verify configured behavior and successful downloads; record legacy-file status separately. |
| Upload-size configuration and over-limit rejection | NOT RUN | Confirm application and Apache limits agree. |
| Permission removal, unauthorized access and disabled accounts | NOT RUN | Check direct API access as well as UI controls. |
| Soft delete and restore | NOT RUN | Use the synthetic test document only. |
| Audit search, export, revisions and final chain verification | NOT RUN | Confirm actor/action visibility and integrity. |
| SMTP configuration and actual inbox receipt | NOT RUN | Confirm relay authorization/sender/TLS details before sending the explicitly requested test. |
| Isolated backup restoration and encrypted-file recovery | NOT RUN | Verify database, uploaded files and original master key together in isolation. |
| Final demo readiness and unresolved issues | NOT RUN | Summarize evidence, failures, deferred items and next fixes. |

## Observations

Initial server inventory received: deployed commit `67b1790` (superadmin user management and Ubuntu guide), with no changed/untracked files reported. All four services are active. This is the rollback source baseline, not evidence that the latest release is deployed. Backup tooling and recovery readiness are the next checkpoint. No server changes have been requested yet.

## Separate fresh-installer work

The user additionally requested an interactive `install.sh` for new servers. Implemented locally with a [dedicated walkthrough](automated-installation.md), 15 passing configuration safety tests and a passing disposable-MongoDB bootstrap/retry test. Apache/systemd template parsing and shell/JavaScript syntax checks passed locally. Full fresh Ubuntu 26.04 VM acceptance remains pending. This work has not updated the NMDOH server, and the fresh installer must not be run over that existing deployment. The backup inventory above remains the next NMDOH checkpoint.

The user also requested an existing-deployment updater. `update.sh` now has a separate [update/recovery walkthrough](automated-updates.md), failure-ordering tests and a passing disposable MongoDB/restic backup/restore integration test. These are local checks only. NMDOH remains at the last user-reported deployment baseline; do not fetch/pull its live checkout merely to obtain the updater. Use a separate reviewed tools clone when the script is committed/pushed, then complete preflight/backup acceptance before deploying.
