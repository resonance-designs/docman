# Update an existing DocMan server with update.sh

For the optional superadmin frontend, see [Update DocMan from System settings](web-updates.md). It uses this same runner and backup/recovery rules, with a one-time operator-installed privileged helper; an older deployment must receive the feature through this CLI procedure first.

`update.sh` updates the documented native-service deployment on **Ubuntu 26.04 LTS**. It supports both the manually installed development layout and the layout produced by `install.sh`. It builds the selected release before downtime, makes an encrypted backup while writers are stopped, applies migrations, publishes Vue, restarts the backend and checks HTTPS.

**Validation:** local safety tests and syntax checks pass. A real disposable-MongoDB/restic integration test recovered the backed-up database, uploaded bytes, frontend and original Git commit, and confirmed private environment/password files were excluded. Full update/reboot/failure-recovery acceptance on a disposable Ubuntu 26.04 VM is still required. Do not describe local tests as proof that The development deployment has been updated. The [development execution record](poc-validation.md) tracks that deployment separately.

Use `install.sh` for a fresh server and `update.sh` for this existing layout. The updater does not upgrade Ubuntu, change Node/MongoDB major versions, replace Apache/systemd configuration, reset accounts, or rotate existing secrets. It does not provide an automatic database rollback.

## 1. Confirm this is the supported layout

The updater expects:

| Component | Expected value |
| --- | --- |
| Checkout | `/var/www/docman`, with `.git` owned by a non-root deployment account such as `deploy` or `docman-build` |
| Backend | `docman-backend`, running as `docman`, working in `/var/www/docman/backend`, starting `/usr/bin/node /var/www/docman/backend/src/server.js` |
| Settings | `/var/www/docman/backend/.env.prod`, root-owned mode 640, readable by group `docman` |
| Vue settings | `/var/www/docman/frontend-vue/.env.production` |
| Uploads | `/var/lib/docman/uploads`, outside the checkout |
| Logs | `/var/www/docman/backend/logs` symlink to `/var/log/docman` |
| Published site | `/var/www/html/docman/public_html` |
| Database | Local MongoDB `docman`, accessed through `MONGO_URI` |
| Network | Node port 5001; HTTPS `APP_BASE_URL` on port 443; certificate trusted on the server |
| Services | Backend, Apache, MongoDB and Redis already active |
| Node | 22.12 or later within 22.x |

Custom paths, linked worktrees, Atlas, multiple backend processes, custom systemd commands and older Ubuntu layouts need the [manual update procedure](ubuntu-server-installation.md#19-existing-installations-and-updates). Do not rename paths or reset configuration merely to bypass a check.

Announce a maintenance window and ensure nobody runs account provisioning, imports or other database/file writers during the update. The script stops the known backend and backup/audit jobs and holds their shared maintenance lock; it cannot discover every custom cron job or remote database client.

The updater checks free space for its staging and recovery copies. These are estimates, not a guarantee against a growing filesystem. It retains artifacts after success/failure for recovery; plan capacity and review old artifacts after acceptance rather than deleting unknown backups to make space.

## 2. Obtain the updater without changing the deployed release first

**Do not run `git pull` in `/var/www/docman` to obtain this script.** That would move the source baseline before the updater records its pre-update backup. On a server that does not already contain the reviewed updater, use a separate tools clone.

Run the following **on the Ubuntu server as your normal sudo-capable login**. Get the reviewed branch name from the release maintainer; `dev` is an example only if that branch contains the approved updater.

```bash
cd ~
read -r -p 'Branch containing the reviewed updater: ' updater_branch
git clone --branch "$updater_branch" https://github.com/resonance-designs/docman.git ~/docman-update-tools
cd ~/docman-update-tools
git log -1 --oneline
bash update.sh --help
```

**Success:** cloning finishes, Git prints the expected reviewed commit, and help prints `Usage: sudo bash update.sh...`. Stop if the branch/commit is wrong or the script is absent. These files must first be committed/pushed to the selected branch; local development files are not automatically available on the server.

If `~/docman-update-tools` already exists, do not delete or clone over it. Inspect `git -C ~/docman-update-tools status --short --branch`, preserve any edits, and fetch/select the next approved updater revision there. The tools clone is separate from the running application's checkout. Never run npm or copy its configuration into the live app by hand as part of obtaining the updater.

The existing checkout can invoke its own `update.sh` on later updates when that is the reviewed updater version. Python loads the update runner before the live checkout changes; it does not continue reading a Bash script while Git overwrites it.

## 3. Run read-only checks

```bash
sudo bash ~/docman-update-tools/update.sh --check
```

Enter your Linux login password if sudo asks. **Success:** `PASS: read-only checks completed; nothing fetched, built or changed.` The check verifies the layout, clean tracked files, deployment owner, service health, Node version and trusted HTTPS/API responses. It does not select a target or test backup credentials yet.

If a required utility is missing, install the utility first. For the existing signed MongoDB repository and Ubuntu package sources established by the installation guide:

```bash
sudo apt update
sudo apt install -y python3 git curl rsync tar util-linux restic mongodb-database-tools
```

**Success:** apt completes without `E:` or package-resolution errors; “already the newest version” is also success. This command installs update/backup tools, not a new MongoDB server or Node major release. `mongodb-database-tools` comes from the already configured MongoDB repository. If apt cannot find it, verify that repository using walkthrough section 7 rather than adding a repository for a different Ubuntu release. Rerun `--check` afterward.

The script stops for local tracked changes or unexpected untracked files. Preserve and review them; it does not run `git reset --hard`, `git clean`, or discard your work. The established `backend/logs` symlink is allowed. It also refuses a target release that tracks protected environment/upload/build paths or application symlinks.

## 4. Prepare an encrypted backup destination

Every update requires a successful restic snapshot. There is no “skip backup” option. You can use an existing restic repository; the script never calls the installed backup script while holding its lock, so the manual-guide and installer backup implementations do not deadlock the updater.

**Preferred: separate storage.** Use a mounted independent volume or an SFTP repository. [Walkthrough section 17.2](ubuntu-server-installation.md#172-prepare-the-separate-backup-server) covers creating the backup account/directory, authorizing the root SSH key and verifying the host fingerprint. For an existing root SSH alias, test:

```bash
sudo sftp -o BatchMode=yes -b /dev/null docman-backup
echo $?
```

**Success:** no password prompt and `0`. Use an address such as `sftp:docman-backup:/home/docmanbackup/repository`, replacing the alias/path with your actual setup. Fix access or host-key errors first; the updater does not disable host-key checking or configure a remote server.

**Internal POC alternative: encrypted local recovery snapshot.** If independent backup storage is not ready, explicitly approve the limitation and prepare a directory:

```bash
sudo install -d -o root -g root -m 0700 /var/backups/docman-update-restic
```

Silent completion is normal. Enter that path at the backup prompt. Because it is on the server's root filesystem, the updater additionally requires typing `LOCAL-POC`. The report records this limitation. This can help recover a failed application update; it does **not** protect against losing the server/disk and is not production disaster recovery.

For an existing repository, use its **existing** restic password. If `/etc/docman/restic-repository` and a protected `/etc/docman/restic-password` are present, the updater offers to reuse them. Otherwise it asks for the password twice. For a new repository choose your own password of at least 18 characters and save it outside this server in your password manager. It is a restic password, not a MongoDB or DocMan account password.

The interactive password prompt currently requires at least 18 characters even for an existing repository. If its existing password is shorter, keep it unchanged and use the protected password-file route:

1. Run `sudo install -d -m 0700 /etc/docman`.
2. Run `sudo nano /etc/docman/restic-repository`. Save the existing repository address on one line.
3. Run `sudo nano /etc/docman/restic-password`. Save its existing password on one line. In Nano, press **Ctrl+O**, **Enter**, then **Ctrl+X** to save and exit. Do not paste this password into chat or a shell command.
4. Run `sudo chown root:root /etc/docman/restic-repository /etc/docman/restic-password`, then `sudo chmod 0600 /etc/docman/restic-repository /etc/docman/restic-password`. These commands normally print nothing on success.
5. Run `sudo stat -c '%U %G %a %n' /etc/docman/restic-repository /etc/docman/restic-password`. Expect `root root 600` for both files. Stop and fix permissions if either differs.
6. Rerun the updater, accept the saved repository address, and answer `yes` to reuse its protected password file. Repository validation must succeed before the update proceeds.

Never change an existing repository password just to satisfy the prompt.

If the repository cannot be opened, initialization requires typing `INITIALIZE`. Use that only for a genuinely new/empty destination. For wrong passwords, connection errors or an existing inaccessible repository, press Enter to stop and resolve the cause. Restic refuses to initialize over an existing repository. The script checks repository integrity before downtime and again after making the snapshot.

## 5. Select the approved release and run

```bash
sudo bash ~/docman-update-tools/update.sh
```

The script fetches origin as the checkout owner and asks for the approved target. Examples are `origin/dev`, an approved release tag, or a full commit ID. It resolves that value to an exact commit and shows the old and proposed commits before asking you to type `UPDATE`. A later branch change does not silently change the selected target.

Alternatively, supply the already approved reference:

```bash
sudo bash ~/docman-update-tools/update.sh --ref origin/dev
```

Use `origin/dev` only when that is the release you intend to deploy. This still prompts for confirmation and backup settings. The target must descend from the installed commit; a downgrade or divergent history requires manual review. If the commit is already installed, the script stops without rebuilding or changing services.

It then performs these stages:

1. Saves a root-only execution record and original configuration.
2. Opens/checks the backup repository.
3. Exports the selected Git commit into an isolated build directory. Runs backend/Vue `npm ci` and the Vue production build as the existing non-root deployment owner. The running app is unchanged while this happens; package/build output goes to the private run log. This can take several minutes.
4. Acquires `/run/lock/docman-maintenance.lock`, rechecks that source/configuration have not changed, records timer states and stops known writers/backend.
5. Copies a matching database archive, uploads, published frontend and old Git source bundle into an encrypted restic snapshot. No migration, including its dry-run index setup, is allowed before backup succeeds.
6. Switches the live checkout to the exact selected commit in detached-HEAD mode and installs the staged locked dependencies/build. It preserves environment files; it only appends safely generated missing machine keys as explained below.
7. Runs migration dry-run, migration and audit-chain verification. Missing stored files stop the update even if the migration command exits with status zero.
8. Publishes Vue, validates Apache syntax, starts the backend and reloads Apache.
9. Checks local API `401`, trusted HTTPS frontend `200`, HTTPS API `401`, and that HTTPS serves the exact newly built index bytes.
10. Restarts only the backup/audit timers that were active before the update and records the result.

The updater does not run `npm audit fix` or suppress the dependency-audit workflow. Review the release's [documented dependency findings](../dependency-security-review.md) before approving it. Successful package installation and health checks are not security acceptance.

### Missing machine keys on an older deployment

If `DOCUMENT_ENCRYPTION_KEY` or `EMAIL_SETTINGS_KEY` is absent, the script checks for existing encrypted file/mail records first. It generates separate machine keys only when the corresponding encrypted records do not exist, lists which settings will be added before confirmation, and saves them in the protected run directory. Existing keys are never regenerated.

If encrypted data exists but its original key is missing or invalid, the update stops: **recover that original key**. A replacement cannot decrypt old data. An explicitly empty key assignment also stops for deliberate configuration correction rather than silently creating duplicate assignments. New keys are applied only after the backup succeeds. This does not retroactively encrypt old files or override a superadmin's stored encryption setting.

Credentials and keys are not printed. Preserve the final environment file securely in the organization's approved secret store. New keys are not sent to users and do not act as per-document passwords.

## 6. Read the result and test the app

**Automated success:** the script prints `PASS: updated to ...`, a report path and a backup snapshot ID. The report's status is **service checks passed; browser validation pending**.

For the run ID printed by the script:

```bash
read -r -p 'Run ID printed by the updater: ' update_run
sudo cat "/var/lib/docman-updates/$update_run/report.json"
systemctl is-active docman-backend apache2 mongod redis-server
```

**Expected:** the report shows the intended old/target commits and a successful backup; the four services print `active`. The report omits passwords and keys. `commands.log`, `environment.before`, `environment.after`, `frontend.before`, `mongodump.yml` and `restic-password` in that directory are private: do not post them. Command diagnostics can contain sensitive data.

From a permitted workstation, verify login, superadmin user management, a second account's access, document upload/replacement/approval/download, unauthorized access denial, history/audit, and any configured email delivery. Compare downloaded bytes with the original harmless test file. Record passes/failures and the deployed commit in the [development validation record](poc-validation.md) for that deployment. Do not declare the POC ready solely because services are active.

Apache upload-size limits and TLS lifecycle settings remain unchanged. If you raise the application upload limit in System Settings, follow manual section 15.1 to align `LimitRequestBody`. Outgoing mail settings/accounts are preserved; the updater sends no mail.

## 7. Failure handling and recovery

| Failure point | What the script does | What you do |
| --- | --- | --- |
| Check/fetch/backup destination/build, before maintenance | Leaves running app/source alone. May retain a private preparation report/build directory. | Resolve the prerequisite, preserve changes and run again. |
| Lock unavailable | Does not stop services or start backup. | Let the current backup/audit/update finish. |
| Backup fails before source/config/database changes | Attempts to restart the original backend, checks its original frontend and restores prior timer states. | Confirm the report and service health, fix the backup and retry. |
| Git switch/dependency publication/config/migration/health fails after changes begin | Attempts to stop backend and known timers/writers; retains recovery artifacts and `ACTIVE`. It does not roll back only code. | Keep writes stopped and use the matched recovery procedure below. |
| Disk full, power loss, forced kill or inability to stop a unit | Recovery may be incomplete. `ACTIVE` is a guard, not proof services stopped. | Inspect services, prevent further writes, read the last report and recover deliberately. |

`/var/lib/docman-updates/ACTIVE` contains the unfinished run ID. A later invocation refuses to begin a second update while it exists. Do not delete it to bypass a failed migration. The run directory retains the original snapshot and private settings; the build is under `/var/www/docman-update-builds/RUN_ID`. The script does not prune old backup snapshots or remove recovery directories automatically.

Inspect privately:

```bash
sudo cat /var/lib/docman-updates/ACTIVE
sudo journalctl -u docman-backend -u apache2 -n 50 --no-pager
systemctl is-active docman-backend docman-backup.timer docman-audit-verify.timer
```

After a post-change failure, expect the backend and known timers to be `inactive`. If a stop failed or any writer remains active, stop/isolate those writes before restoring. A `STOP:` message is not a successful update.

### Recover a failed update

A code checkout alone is not a rollback after migration. Prefer a tested forward fix, or restore **the matching database, uploads, code and configuration together**. Restoring the pre-update snapshot loses any writes made after it, including changes made if users accessed the new version before a later failure. Agree on that recovery decision explicitly. Test restoration on an isolated recovery VM first; manual section 18 explains provisioning that VM, its authenticated database identities and private recovery website.

The updater snapshot contains one absolute source directory:

```text
/var/lib/docman-updates/RUN_ID/snapshot/
  database.archive
  uploads/
  public_html/
  source.bundle
  commit.txt
```

It **does not contain** environment files, TLS/SSH private keys or the restic password. Those remain in protected local state and must also be independently recoverable from the approved secret store. Do not confuse updater snapshots with the installer/manual-guide backup layouts.

On the isolated recovery server, restore access to the original restic repository and create `/etc/docman/restic-password` containing its original password, root-owned mode 600, as in manual section 18.1. Then:

```bash
read -r -p 'Backup repository address: ' recovery_repository
read -r -p 'Snapshot ID from report.json: ' recovery_snapshot
read -r -p 'Original updater run ID: ' recovery_run
sudo restic -r "$recovery_repository" --password-file /etc/docman/restic-password snapshots
sudo install -d -m 0700 /srv/docman-update-restore
sudo restic -r "$recovery_repository" --password-file /etc/docman/restic-password \
  restore "$recovery_snapshot" --target /srv/docman-update-restore
recovery_path="/srv/docman-update-restore/var/lib/docman-updates/$recovery_run/snapshot"
sudo ls "$recovery_path"
```

Use a new, empty restore target. **Expected:** the listed snapshot exists, restoration reports no errors, and the final listing shows the five artifacts above. Wrong password, missing snapshot/files or integrity errors mean stop. `recovery_path` is a shell variable; keep this terminal open for the following commands.

Recover code into an empty `/var/www/docman` on that recovery VM:

```bash
recovery_user=$(id -un)
recovery_group=$(id -gn)
recovery_commit=$(sudo cat "$recovery_path/commit.txt")
sudo git clone "$recovery_path/source.bundle" /var/www/docman
sudo chown -R "$recovery_user:$recovery_group" /var/www/docman
git -C /var/www/docman checkout --detach "$recovery_commit"
git -C /var/www/docman remote set-url origin https://github.com/resonance-designs/docman.git
git -C /var/www/docman rev-parse HEAD
```

**Expected:** the printed commit matches `commit.txt`. Setting `origin` replaces the temporary bundle source with the normal repository address for future updates; it does not fetch or change this recovered commit. Do not clone over an existing directory. Install that commit's locked backend/Vue dependencies as the deployment account and recreate the log symlink using manual sections 9–10.

With the recovery backend and scheduled writers stopped and an **empty recovery `docman` database**, restore the archive. Enter the recovery VM's MongoDB administrator password at the hidden prompt:

```bash
sudo mongorestore --host 127.0.0.1 --username docman_db_admin \
  --authenticationDatabase admin --password \
  --archive="$recovery_path/database.archive" --gzip --nsInclude='docman.*' --stopOnError
```

**Expected:** zero failed documents and a successful count consistent with the original backup. Do not add `--drop` against a live database to bypass duplicate-key errors. Then restore the files into the recovery VM's empty uploads/publication directories:

```bash
sudo rsync -a "$recovery_path/uploads/" /var/lib/docman/uploads/
sudo chown -R docman:docman /var/lib/docman/uploads
sudo rsync -a "$recovery_path/public_html/" /var/www/html/docman/public_html/
sudo chown -R root:root /var/www/html/docman/public_html
```

**Expected:** commands finish without errors. Recover the matching `environment.before` and `frontend.before` from the protected original run directory/secret store. Install the backend settings root:docman mode 640 and adapt only the recovery server's database/Redis credentials and private hostname, as in manual section 18.3. Preserve the original document/email keys. A recovery copy must keep outgoing email and scheduled writers disabled; see the explicit email-disable steps in the [installer recovery guide](automated-installation.md#restore-an-installer-backup-on-a-separate-recovery-vm).

Follow manual section 18.4: verify the audit chain (`"valid":true`), start the recovered app, check accounts/permissions and download/checksum representative documents. Do not run a new migration just to make a same-version recovery work. Only after isolated recovery passes should you apply an agreed recovery plan to the original server or replace it. Do not point production DNS at the recovery VM during a drill.

After a tested forward fix or complete recovery on the original server, re-enable only timers recorded as active in `report.json`, repeat service/browser checks, and record the recovery decision/result. Only then archive the active marker, preserving the run evidence:

```bash
read -r -p 'Resolved run ID: ' resolved_run
sudo mv /var/lib/docman-updates/ACTIVE "/var/lib/docman-updates/$resolved_run/ACTIVE.resolved"
```

Confirm the marker contains that exact run ID before moving it. Do not run this command solely to silence the guard. The recovered/current app must be healthy before a new update is attempted.

## Maintainer checks and acceptance

Local checks (no services modified):

```bash
bash -n update.sh
bash update.sh --help
python3 -B -m unittest discover -s scripts/update -p 'test_*.py' -v
```

**Expected:** syntax succeeds silently, help prints usage, and tests finish with `OK`. The tests inject failures before and after mutation to verify the recovery boundary, protect keys/configuration, reject unsafe target paths, and reject missing-file migration results.

Optional real backup integration requires `mongod`, `mongosh`, MongoDB database tools, Git, rsync and restic on a Linux test machine:

```bash
python3 -B scripts/update/integration_backup.py
```

This starts a disposable loopback MongoDB process and creates a temporary encrypted restic repository. It restores and verifies fixture database records, file bytes, frontend and Git commit, and checks that private environment/password files were excluded. It does not use system services or existing databases.

Still required on a disposable Ubuntu 26.04 VM: an older supported release to current release; installer-owned and manually owned checkouts; no-change/dirty-worktree refusal; missing-key and existing-key cases; real systemd timers/locks; failed network/build/backup/migration/health checks; process interruption and recovery; SFTP/off-server restore; reboot; browser permissions and document workflows. Record exact commits, package versions, outcomes and remaining risks before claiming deployment validation.
