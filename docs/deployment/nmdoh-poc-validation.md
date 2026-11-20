# NMDOH POC update and end-to-end validation

Started November 18, 2026. This is the working execution record, not a statement that the new release has passed on NMDOH infrastructure.

## Scope and environment

- User authorized updating the internal NMDOH development server, testing the deployed application end to end, and documenting passes and failures before deciding subsequent work.
- Previously confirmed host: `dohr2simdocmdev`; URL: `https://docman-dev.doh.nm.gov`.
- Access: user operates the server through the NMDOH remote workstation. Local assistant checks are not server execution evidence.
- Previously used layout: checkout `/var/www/docman`, backend service `docman-backend`, published Vue assets `/var/www/html/docman/public_html`, uploads `/var/lib/docman/uploads`.
- Selected application update target: `656c74c` (`origin/dev`, merged development baseline), package version 3.0.0. User confirmed this remote commit after fetching on the server. The separate installer/updater branch is not part of this target.
- Rollback baseline: `67b1790`, saved under `/var/backups/docman-poc/20261118T122717Z`. Current checkout: `656c74c`; locked dependencies installed, migration completed, audit chain valid (14 entries), Vue assets published, backend started and Apache reloaded. Both services reported active. HTTPS and browser checks remain pending; the local backup has not been restore-tested.
- Picomatch advisory GHSA-fc5q-39xc-vjpf is deferred by the user for this internal POC only. Keep audit failures visible; no production risk acceptance is implied.

## Execution rules

Follow the [Ubuntu walkthrough](ubuntu-server-installation.md), particularly update section 19. Confirm prerequisites rather than assuming backup services or keys exist. Capture the previous commit and a usable recovery backup before mutation. Preserve environment files, uploads, database and existing keys. Use harmless synthetic documents and dedicated test accounts. Do not run destructive fixture scripts against the live POC database. Do not record passwords, tokens, private keys or document contents here.

Use `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN` with observed evidence. A skipped test is not a pass. Record command/browser action, expected result, actual result and follow-up for each failure. Server-side restore and ciphertext-corruption testing must use an isolated restored copy, never alter the active POC's stored files for a test.

## Checkpoints

| Check | Status | Evidence / next action |
| --- | --- | --- |
| Current checkout, commit and service health | PASS | User-reported server output: clean `feature/compliance-hardening` checkout at `67b1790`; `docman-backend`, Apache, MongoDB and Redis all `active`; root filesystem 48 GB total, 37 GB available (21% used). |
| Backup-tool and scheduled-job inventory | PASS | User confirmed `mongodump`, `mongorestore` and `rsync` installed; `restic` NOT installed; `/usr/local/sbin/docman-backup` NOT installed; no `docman-backup*` or `docman-audit-verify*` systemd unit files listed. Inventory completion does not establish backup readiness. |
| Consistent database/files backup and rollback record | PASS | User reported `Backup complete: /var/backups/docman-poc/20261118T122717Z` after the documented stopped-backend backup block. Its completion follows dump/archive checksums and backend restart checks. Local rollback copy only; an actual restore has not been tested. No restic repository or scheduled backup setup. |
| Restic installation/version | PASS | User confirmed `restic 0.18.1 compiled with go1.25.0 on linux/amd64`. Subsequently excluded from this manual POC update by user direction; leave installed but do not configure it. |
| Exact target commit and release configuration | NOT RUN | Confirm branch/commit, document key and proxy upload limits without exposing secrets. |
| Remote fetch and target selection | PASS | User confirmed `git fetch origin` succeeded; clean live checkout remains `67b1790` on `feature/compliance-hardening`; `origin/dev` is `656c74c`. Use this exact target for the manual update. No checkout/switch has occurred. |
| Existing encryption-key inventory | PASS | User's non-secret check reports both `DOCUMENT_ENCRYPTION_KEY` and `EMAIL_SETTINGS_KEY` MISSING. Generation/configuration remains pending. |
| Encryption-key configuration | PASS | User confirmed `Both encryption keys configured; existing settings preserved.` Protected settings copy: `/var/backups/docman-poc/20261118T122717Z/backend.env.with-keys`. No key values disclosed. Source switch/dependency installation remain pending. |
| Selected source checkout | PASS | User confirmed `git switch --detach 656c74c` succeeded and `git log -1 --oneline` reports `656c74c (HEAD, origin/dev) Merge branch 'master' into dev`. Backend stop output was not included; explicitly stop it successfully before dependency replacement. |
| Backend stop and locked dependency installation | PASS | User ran `sudo systemctl stop docman-backend && npm ci` from `/var/www/docman/backend`; npm ran and completed: 561 packages added, 562 audited in 13s. Audit reports 37 high-severity vulnerabilities. Installation succeeded; this is not a clean audit or independent confirmation of individual advisory identities. No audit-fix command run. Backend remains intentionally stopped. |
| Locked backend/Vue installs and production build | PASS | Backend installation recorded above. User confirmed Vue npm ci: 121 packages added, 122 audited in 5s; 10 high-severity findings. Vue 3.0.0 production build with Vite 8.3.8 transformed 1,135 modules and completed in 1.56s. Assets include `index-DQ0-j_FJ.css` and `index-AlsryfuN.js`. Large-chunk warning is informational. Assets have not yet been published. |
| Migration preflight, migration and audit-chain verification | PASS | User confirmed actual migration completion with `dryRun:false` and all five counts zero, including `missingFiles:0`; indexes ensured. Audit verification returned `valid:true`, `checked:14`, `firstInvalidSequence:null`, `reason:null`. Existing-option skips for user email/username and category name remained nonfatal. Publication/restart still pending. |
| Migration dry run | PASS | User confirmed completion against local `docman`: `dryRun:true`, `filesMarkedApproved:0`, `checksumsRecorded:0`, `missingFiles:0`, `documentsUpdated:0`, `baselineRevisions:0`. Index initialization skipped `users_email`, `users_username` and `categories_name` because existing options differ; no failure reported. Actual migration and audit-chain verification remain pending. |
| Static publication and backend startup | PASS | User confirmed the publication/start block completed: Apache `Syntax OK`, then two `active` lines for backend and Apache. Global ServerName warning was nonfatal. |
| HTTPS/API checks | PASS | User confirmed normal certificate-verified curl requests at 2026-11-18 12:47:23 UTC: frontend `200 OK`; `/api/docs` returned `401 Unauthorized` and `{"message":"No token provided"}`. Confirms server-side TLS, static serving and unauthenticated API routing; browser login and authenticated workflows remain untested. |
| Browser login after update | PASS | User reported: "Logged in without issue." This confirms successful login; individual administrative screens and document workflows remain untested. |
| Document storage settings displayed | PASS | User confirmed encryption at rest ON, no missing DOCUMENT_ENCRYPTION_KEY warning, and maximum upload size 50 MB. This verifies displayed configuration, not stored ciphertext or upload-limit enforcement. |
| Superadmin user management and logout/session revocation | NOT RUN | Use dedicated test accounts; protect the real administrator. |
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

Backup inventory subsequently received: MongoDB dump/restore tools and rsync are present. Restic, the DocMan backup script, and backup/audit systemd units are absent. Next guided step: `sudo apt update`, `sudo apt install -y restic`, then `restic version`. Expected: apt completes without errors and a restic version is printed. Installation is pending user confirmation; no source pull, migration or application restart has been performed in this update sequence.

Restic installation subsequently confirmed by the user: `restic 0.18.1 compiled with go1.25.0 on linux/amd64`. Next decision: an available separate backup destination, or an explicitly temporary encrypted local POC recovery backup. No repository or snapshot has yet been confirmed; no source pull, migration or application restart has been performed.

## Separate fresh-installer work

The user additionally requested an interactive `install.sh` for new servers. Implemented locally with a [dedicated walkthrough](automated-installation.md), 15 passing configuration safety tests and a passing disposable-MongoDB bootstrap/retry test. Apache/systemd template parsing and shell/JavaScript syntax checks passed locally. Full fresh Ubuntu 26.04 VM acceptance remains pending. This work has not updated the NMDOH server, and the fresh installer must not be run over that existing deployment. The backup inventory above remains the next NMDOH checkpoint.

The user also requested an existing-deployment updater. `update.sh` now has a separate [update/recovery walkthrough](automated-updates.md), failure-ordering tests and a passing disposable MongoDB/restic backup/restore integration test. These are local checks only. NMDOH remains at the last user-reported deployment baseline; do not fetch/pull its live checkout merely to obtain the updater. Use a separate reviewed tools clone when the script is committed/pushed, then complete preflight/backup acceptance before deploying.

## Approved temporary POC rollback copy

Execution result: user confirmed `Backup complete: /var/backups/docman-poc/20261118T122717Z`. Preserve this exact directory through deployment and end-to-end testing. Next action is `git fetch origin` and inspection of the current and `origin/dev` commits; do not switch or pull the deployed source until the target and required configuration changes are checked.

Fetch subsequently confirmed successful, with live HEAD still `67b1790` and clean. Selected target `656c74c` contains application version 3.0.0, transparent document encryption and UI-managed mail credentials. Next read-only check: report `DOCUMENT_ENCRYPTION_KEY` and `EMAIL_SETTINGS_KEY` as missing, valid 64-character hexadecimal, or invalid without displaying values. Preserve any existing key; do not generate replacements for configured keys. Target configuration/readiness remains pending.

The user explicitly declined separate backup storage and an encrypted local restic repository for this demonstration. Use only a dated, root-only local directory under `/var/backups/docman-poc/`; do not expand the manual update into backup infrastructure, scheduling or encryption setup. Restic is installed but is not used for this update. This is a temporary rollback copy, not a disaster-recovery deployment. The generic installer/updater's backup policies do not override this explicit manual POC scope.

The following block is the next guided server action (execution/result still pending). It uses the existing application database credentials without displaying them or asking the user to re-enter them. The backend is stopped for a matching database/files copy and restarted on success or failure. It includes installed node_modules for recovery without immediately reinstalling packages. Archives contain credentials/private keys and therefore remain inside a root-only directory. No source pull or migration is performed.

```bash
sudo bash <<'BASH'
set -euo pipefail
umask 077
systemctl is-active --quiet docman-backend
install -d -o root -g root -m 0700 /var/backups/docman-poc
backup_dir="/var/backups/docman-poc/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 0700 "$backup_dir"
echo "Backup directory: $backup_dir"
git -c safe.directory=/var/www/docman -C /var/www/docman rev-parse HEAD > "$backup_dir/commit.txt"
trap 'systemctl start docman-backend' EXIT
systemctl stop docman-backend
runuser -u docman -- /usr/bin/node --env-file=/var/www/docman/backend/.env.prod -e 'if (!process.env.MONGO_URI) process.exit(1); console.log("uri: " + JSON.stringify(process.env.MONGO_URI));' > "$backup_dir/mongodump.yml"
mongodump --config="$backup_dir/mongodump.yml" --db=docman --archive="$backup_dir/database.archive.gz" --gzip
rm -- "$backup_dir/mongodump.yml"
tar -C / -czf "$backup_dir/files.tar.gz" \
  var/www/docman var/lib/docman/uploads var/www/html/docman/public_html \
  etc/apache2/sites-available/docman.conf etc/systemd/system/docman-backend.service \
  etc/ssl/docman etc/mongod.conf etc/redis/redis.conf
gzip -t "$backup_dir/database.archive.gz" "$backup_dir/files.tar.gz"
(cd "$backup_dir" && sha256sum database.archive.gz files.tar.gz commit.txt > SHA256SUMS && sha256sum -c SHA256SUMS)
systemctl start docman-backend
systemctl is-active docman-backend
trap - EXIT
echo "Backup complete: $backup_dir"
BASH
```

Expected: MongoDB dump progress, three checksum `OK` lines, `active`, and `Backup complete: /var/backups/docman-poc/TIMESTAMP`. Stop on errors; do not pull code. Save the printed directory path. Compression/checksum checks are not a restore test. A failed/interrupted run may leave a partial directory; do not use it as a complete recovery copy or delete an earlier copy. Confirm backend service health if the restart reports an error.

### Add the missing machine keys before selecting new source

User confirmed both key names report `MISSING`. The running source is still `67b1790`, before document/mail encryption was introduced. The following action is pending execution. It refuses to replace an existing assignment, generates distinct machine keys, preserves the environment file's ownership/mode, and keeps the resulting settings in the existing root-only local rollback directory. Do not paste either settings file into chat.

```bash
sudo python3 <<'PY'
import os, re, secrets, tempfile
from pathlib import Path

os.umask(0o077)
env = Path('/var/www/docman/backend/.env.prod')
backup = Path('/var/backups/docman-poc/20261118T122717Z/backend.env.with-keys')
original = env.read_bytes().decode('utf-8')
keys = ['DOCUMENT_ENCRYPTION_KEY', 'EMAIL_SETTINGS_KEY']
for key in keys:
    if re.search(r'^\s*(?:export\s+)?' + key + r'\s*=', original, re.M):
        raise SystemExit(f'STOP: {key} already has an assignment; nothing changed.')
updated = original + '\n' + ''.join(f'{key}={secrets.token_hex(32)}\n' for key in keys)
info = env.stat()
fd, temporary = tempfile.mkstemp(prefix='.env.prod.update-', dir=env.parent)
try:
    with os.fdopen(fd, 'w') as output:
        output.write(updated)
        output.flush()
        os.fsync(output.fileno())
        os.fchown(output.fileno(), info.st_uid, info.st_gid)
        os.fchmod(output.fileno(), info.st_mode & 0o777)
    with backup.open('x') as output:
        output.write(updated)
        output.flush()
        os.fsync(output.fileno())
    os.replace(temporary, env)
finally:
    Path(temporary).unlink(missing_ok=True)
print('Both encryption keys configured; existing settings preserved.')
print(f'Protected settings copy: {backup}')
PY
```

Expected: the two success lines, with no key values displayed. Existing-assignment or existing-backup errors mean stop and inspect privately; do not delete/regenerate keys to force a retry. This step changes settings only; it does not switch code or restart the application. The original rollback archive still contains the pre-key settings; `backend.env.with-keys` preserves the newly generated keys for the upcoming release.

### Select the approved application commit

After the user confirmed successful key configuration, the next guided commands are below (execution pending). Stop the backend before replacing source/dependencies. Expected: `inactive` after stopping, successful detached checkout of `656c74c`, and the matching commit message. `systemctl is-active` normally exits nonzero when it prints `inactive`; that is the expected stopped-service result. Detached HEAD is intentional for this pinned deployment. Do not run npm until the switch succeeds; keep the backend stopped through dependency installation, build, migration and publication.

```bash
cd /var/www/docman
sudo systemctl stop docman-backend
systemctl is-active docman-backend
git switch --detach 656c74c
git log -1 --oneline
```

### Backend dependency installation

Source checkout at `656c74c` is confirmed. Next commands (execution pending):

```bash
cd /var/www/docman/backend
sudo systemctl stop docman-backend && npm ci
```

The `&&` runs npm only after the stop command succeeds. Run npm as the existing deployment login, not with sudo. Expected: installation completes without `npm ERR!`/`npm error`; dependency audit warnings may still report the documented Picomatch findings. Do not run `npm audit fix` or change lockfiles on the server. Record the completion summary and any error; keep the backend stopped afterward.

### Vue dependency installation and production build

Backend installation succeeded with the user-reported 37 high-severity audit findings retained. Next commands (execution pending):

```bash
cd /var/www/docman/frontend-vue
npm ci && npm run build
```

The build runs only if dependency installation succeeds. Expected: npm completes without errors, followed by a successful Vite production build and `built in ...`. A chunk-size warning alone does not mean the build failed. Record audit counts and build output; do not run npm audit fix. This step does not publish the website or restart the backend.

### Migration preflight

Vue installation and build are confirmed successful. Next command (execution pending), with the backend still stopped:

```bash
cd /var/www/docman/backend
sudo -u docman env NODE_ENV=production /usr/bin/node src/scripts/migrateComplianceFields.js --dry-run
```

Expected: `Dry run complete.` and a final summary with `"missingFiles":0`; proposed update counts can be nonzero. Stop on conflicts, missing-file reports or errors. The dry run skips migration changes to document/file records, but database connection/model initialization can still create indexes; it is not a strictly read-only database operation. The pre-update backup is already recorded. Review this result before running the actual migration or restarting/publishing the application.

### Apply migration and verify the audit chain

The user confirmed a successful dry run with all summary counts zero. Existing-option warnings for `users_email`, `users_username` and `categories_name` were nonfatal; no index deletion is directed. Next commands (execution pending), keeping the backend stopped:

```bash
cd /var/www/docman/backend
sudo -u docman env NODE_ENV=production /usr/bin/node src/scripts/migrateComplianceFields.js
```

Expected: `Migration complete.` and `"missingFiles":0`. Only if that completes without errors, run:

```bash
sudo -u docman env NODE_ENV=production /usr/bin/node src/scripts/verifyAuditChain.js
```

Expected: a final JSON result with `"valid":true`. A failure, missing-file count above zero, or invalid chain means stop before publishing/restarting. The migration and verifier can write audit events, so verification's checked count need not match earlier runs. Record both final summaries.

### Publish Vue and start the updated backend

Actual migration and audit verification are confirmed successful (`valid:true`, 14 entries checked). Next commands (execution pending):

```bash
cd /var/www/docman/frontend-vue
(
  set -e
  test -f dist/index.html
  sudo rsync -a --delete dist/ /var/www/html/docman/public_html/
  sudo chown -R root:root /var/www/html/docman/public_html
  sudo find /var/www/html/docman/public_html -type d -exec chmod 0755 {} +
  sudo find /var/www/html/docman/public_html -type f -exec chmod 0644 {} +
  sudo apache2ctl configtest
  sudo systemctl start docman-backend
  sudo systemctl reload apache2
  systemctl is-active docman-backend apache2
)
```

The subshell stops at the first failure without closing the interactive terminal. The delete option is confined to the established published static-asset directory, not uploads or the checkout. Expected: publication/permission commands usually silent, Apache `Syntax OK`, then two `active` lines. A previously observed Apache global ServerName warning may accompany `Syntax OK`; any actual configuration error blocks startup. Do not infer HTTPS/browser success from service state; those checks follow separately.

### HTTPS checks after publication

User confirmed frontend publication, Apache configuration validation, backend startup and Apache reload completed. Output: the existing global ServerName warning, `Syntax OK`, then `active` twice. This establishes service state, not browser workflow success.

Next commands on the NMDOH server (execution pending):

```bash
curl -I https://docman-dev.doh.nm.gov/
curl -i https://docman-dev.doh.nm.gov/api/docs
```

Expected: frontend `HTTP/1.1 200 OK`; API `HTTP/1.1 401 Unauthorized` with `{"message":"No token provided"}` because this request has no login token. Use normal certificate verification; do not add `-k`. A certificate error, connection error, 5xx response or unexpected response needs investigation before browser testing. These checks do not establish authenticated authorization or document workflow correctness.

### HTTPS results and browser login checkpoint

Both server-side HTTPS checks passed at 2026-11-18 12:47:23 UTC without disabling certificate verification. Frontend returned 200; unauthenticated documents API returned 401 with the expected missing-token message. API responses contain security headers from both Apache and the backend, including two CSP policies; record this for configuration review, not as a failed routing check.

Next manual browser check (NOT RUN): on the NMDOH workstation, open https://docman-dev.doh.nm.gov/, hard-refresh with Ctrl+Shift+R, sign out if an old session remains, and sign in using the existing RBakos account. Expected: login succeeds, dashboard renders without a blank page or visible error, and superadmin navigation is available. Record actual results before creating synthetic test accounts/documents. Server-side certificate trust does not establish workstation/browser certificate trust.

### First synthetic document: corrected required fields

User encountered the required `Opens For Review` field; earlier chat instructions omitted it and also omitted the required Author selection. This is a walkthrough omission, not evidence of upload failure. Creation remains NOT RUN/unconfirmed.

For `POC Validation — Test Document`, use description `Synthetic document for deployment testing`, Author Richard Bakos (the existing RBakos account), Category General, Opens For Review November 18, 2026 (today for this test), and the synthetic `docman-poc-test.docx` file. Keep Review Interval Quarterly and Review Period 2 weeks at their defaults; the due-date fields calculate automatically. Leave optional assignments empty for this initial test. Click Create Document and record the resulting page/status or exact error. Storage configuration was confirmed ON with no missing-key warning and a 50 MB limit; actual encrypted storage/download verification remains pending.

### Initial document creation result

PASS: user confirmed the synthetic document saves and opens the document details page after completing the required fields. This confirms initial creation/navigation only; file approval status, download integrity, actual ciphertext and multi-user access checks remain unverified.

Next check: inspect the uploaded file row in the document's Versions section and report its status. If Download is available, download and open the synthetic file; expected content is `DocMan POC test — version 1`. If download is unavailable or an error occurs, record that result before any approval or permission changes. Opening the downloaded file verifies readability/content at a basic level; byte-for-byte checksum verification remains a separate check.

### Screenshot evidence: initial version and follow-up findings

User screenshots confirm initial version v1 (`docman-poc-test.docx`, 11.2 KB) displays `Encrypted at rest`, `Awaiting approval`, and `Approval required (1)`. No published version exists; Download and Withdraw are available, and replacement upload is disabled while approval is pending. Revision 1 records creation. Download success and actual stored ciphertext remain unverified.

Findings to investigate after recording the download result:
- Approval setup gap: the form accepted no owners or approvers although approval is required. Details show `No owners assigned` and `Owners approve new versions`; no Approve action is visible for the uploader. Earlier test guidance left assignments empty. Assign a separate eligible test approver before testing publication; do not disable approval to bypass this test.
- Date display defect: revision history records opensForReview `2026-11-18T00:00:00.000Z` and nextReviewDueOn `2027-02-18T00:00:00.000Z`, while details display Nov 17, 2026 and Feb 17, 2027. Likely UTC-to-local conversion of calendar dates; root cause not yet verified. Record as FAIL for calendar-date display consistency.

Next action remains downloading v1 as its uploader and opening it to confirm expected synthetic content. No download result has yet been reported.

Date-display finding confirmed by user: Edit shows Opens for Review 11/18, while the document details page shows 11/17 for the same document. Together with the revision history's November 18 UTC value, this establishes an inconsistent calendar-date display (FAIL), not evidence that the user entered the wrong date. Keep the saved date unchanged. Fix and regression testing remain pending; investigate timezone handling in date-only rendering.

### Initial encrypted-version download

PASS: user confirmed Download retrieves the initial uploaded file and it opens with the expected synthetic content. The version is still awaiting approval and the downloader is its uploader/superadmin; this does not prove ordinary-reader access rules. UI metadata indicates encrypted at rest; direct stored-byte inspection and byte-for-byte checksum comparison remain pending. Next: create a separate test approver and assign it to the synthetic document to exercise approval without using the uploader's identity.

### SMTP validation prioritized — November 19, 2026

User paused document/approver testing to validate NMDOH SMTP delivery without username/password. Candidate relay from existing REDCap configuration: webmail.state.nm.us, port 25. IP authorization, allowed sender and TLS capabilities remain unverified. DocMan UI supports SMTP with `IP-authorized relay — no username/password` and a saved-settings test message. Begin with STARTTLS; lack of password authentication does not require plaintext transport. Proposed test sender and recipient: user's existing richard.bakos@doh.nm.gov address, display name DocMan POC. No message has been sent and no settings change is confirmed. Require observed relay result and inbox receipt before marking delivery PASS. Test success for this sender/recipient would not establish arbitrary-sender or external-recipient relay permission.

SMTP test approach corrected by user: test directly from the NMDOH server command line first, without changing DocMan UI/settings. Proposed Python standard-library SMTP test connects to webmail.state.nm.us:25, sends EHLO, uses certificate-verified STARTTLS if advertised, and sends one harmless test message from/to richard.bakos@doh.nm.gov without calling login. If STARTTLS is absent it reports plaintext transport explicitly. Results and inbox receipt remain pending; command-line success alone does not validate DocMan integration.

### SMTP command-line result — DNS blocked

User's Python SMTP test failed with `gaierror: [Errno -3] Temporary failure in name resolution` before printing the connection-success message. No SMTP connection or message submission occurred; no conclusion about authentication, STARTTLS or relay authorization can be drawn. SMTP delivery validation is BLOCKED on resolving webmail.state.nm.us from the application server.

Next read-only diagnostics on NMDOH Ubuntu: `resolvectl query webmail.state.nm.us`, `resolvectl status`, and `getent ahosts webmail.state.nm.us`. Inspect configured DNS servers and lookup errors before making any resolver changes. Do not replace agency DNS with public DNS or guess a relay IP.

### DNS comparison — November 20, 2026

User supplied Windows nslookup: resolver 9.9.9.9 returned webmail.state.nm.us = 164.64.16.144 (non-authoritative). Ubuntu resolvectl query failed with `Lookup failed due to system error: No route to host`. Ubuntu ens192 uses DNS servers 10.8.101.3 and 10.135.2.12; current server 10.8.101.3. This establishes a DNS-path failure on Ubuntu, not a confirmed SMTP relay rejection. Do not infer that either configured resolver is permanently unavailable or that changing to public DNS is appropriate.

Next diagnostic (pending): connect from Ubuntu directly to user-observed 164.64.16.144 TCP/25 using Python smtplib with a 15-second timeout, issue EHLO, print greeting/capabilities, and quit without AUTH or message submission. This isolates SMTP connectivity from hostname resolution. Success does not prove sender/recipient acceptance or delivery. Keep existing resolver and DocMan settings unchanged.

### Direct-IP SMTP connectivity result — November 20, 2026

PASS: Ubuntu connected to 164.64.16.144:25; SMTP greeting 220 identified webmail.state.nm.us, EHLO returned 250. Advertised STARTTLS, SIZE 36700160, PIPELINING, DSN, ENHANCEDSTATUSCODES, 8BITMIME, BINARYMIME, CHUNKING and SMTPUTF8. Server greeted client as 164.64.16.238 (observed source, potentially NAT). No AUTH capability was listed; no authentication or message submission was attempted. DNS failure remains unresolved. Relay permission and delivery remain NOT RUN.

Next: one direct-IP test message from/to richard.bakos@doh.nm.gov without login, using a Python SMTP subclass to override only TCP destination while retaining webmail.state.nm.us for STARTTLS certificate verification. Do not disable TLS validation or persist an IP-based application setting. Record submission result and inbox receipt separately.

### Direct-IP SMTP delivery confirmed — November 20, 2026

PASS: user reported `I got the email` after the direct-IP, no-login SMTP test. Confirms delivery from the DocMan server for sender and recipient richard.bakos@doh.nm.gov without SMTP credentials. The supplied test requires certificate-verified STARTTLS before sending; console output was not supplied. Do not generalize this result to arbitrary senders or external recipients.

Outstanding: Ubuntu resolution of webmail.state.nm.us still failed in the last observed hostname lookup. Direct-IP delivery is a diagnostic workaround, not a persistent configuration change. DocMan email settings remain unchanged; application test delivery remains NOT RUN. Next: have NOC investigate access to configured DNS servers 10.8.101.3 and 10.135.2.12 and restore hostname resolution; then test SMTP through DocMan using hostname, port 25, STARTTLS and no credentials. Existing evidence does not indicate that additional relay allowlisting is needed for the tested sender/recipient.
