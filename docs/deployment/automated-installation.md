# Guided installation on a fresh Ubuntu server

`install.sh` installs DocMan on a **new, dedicated Ubuntu Server 26.04 LTS, x86_64 machine with AVX**. It asks for the information it needs and creates the configuration files. This is the current latest-LTS target; older releases are not alternative installation paths. When Ubuntu publishes a newer LTS, maintainers must update and test the installer and walkthrough together. The installer stops if the updated Ubuntu release catalog lists a newer LTS.

**Validation status:** shell/JavaScript syntax, 15 configuration safety tests, and bootstrap/retry integration against a disposable MongoDB database have passed locally. A complete installation and interrupted-install recovery on a disposable Ubuntu 26.04 VM are still pending. Do not describe this as a verified unattended deployment yet. Record VM acceptance results using the checklist at the end of this document.

**Existing DocMan server? Stop here.** This is not an updater. In particular, do not run it on the existing NMDOH server. Follow [walkthrough section 19](ubuntu-server-installation.md#19-existing-installations-and-updates), taking a matching database/uploads backup first. Its existing data, configuration and encryption keys must survive the update.

For future updates of an installer-created server, the checkout is owned by the non-login `docman-build` account. Run section 19's Git/npm commands as that account using `sudo -u docman-build -H` before the command (for example, `sudo -u docman-build -H git -C /var/www/docman status --short --branch`). Run service, backup and publication commands from your normal sudo-capable administrator login as documented. Do not give the build account sudo rights or transfer environment-file ownership to it.

## 1. Prepare the server and information

If Ubuntu itself is not installed, start with [the complete server walkthrough](ubuntu-server-installation.md), sections 1–4, for obtaining the latest-LTS installation image, installing Ubuntu, creating a sudo-capable account and connecting to it. Stop before manually installing the application prerequisites. You can run the installer from the server console; SSH is not required for the installer itself.

Have these ready:

| Item | What to obtain or decide |
| --- | --- |
| Dedicated server | Ubuntu 26.04 LTS, x86_64 CPU exposing AVX, systemd booted normally. Prefer at least 8 GB RAM and 40 GB available disk for a demonstration; allow additional capacity for documents, database, temporary backup archive and logs. |
| Administrator access | A login account allowed to use `sudo`. The sudo prompt asks for that Linux account's password. |
| Package access | Working DNS and access to Ubuntu package mirrors, `repo.mongodb.org`, `pgp.mongodb.com`, `registry.npmjs.org`, and GitHub. A locked-down network may need an approved proxy/allowlist or trusted organization CA first; walkthrough section 4 explains these prerequisites. |
| Website name | A DNS name pointing to this server, for example your organization's assigned application hostname. Enter the name only, without `https://`, a port or a slash. DNS is managed outside the installer. |
| Time source | An internal NTP hostname/IP, or permission to use Ubuntu's default time sources. Installation stops if the clock cannot synchronize. |
| HTTPS choice | An issued certificate plus its matching private key; approved internal-POC self-signed HTTPS; or a publicly reachable name for Let's Encrypt. Details below. |
| Account details | Your first and last name, email address, and chosen DocMan username. Usernames must contain 3–50 letters, numbers, dots, underscores or hyphens. |
| Password manager | Save separate passwords for MongoDB administrator, MongoDB application, Redis, and your DocMan login. Each is user-chosen, at least 18 characters and at most 72 UTF-8 bytes, without control characters. No 64-character password must be generated or typed manually. |
| Backup destination | An existing separate backup volume or SFTP backup server, plus its restic password. You can explicitly defer backups for a POC; the result report will say so. |

Do not manually install/configure MongoDB or Redis before using this installer. It deliberately refuses pre-existing database configuration, application configuration or service accounts. An Ubuntu installation that already hosts applications needs a separately planned deployment.

NOC/security continues to own network access rules. The installer does not enable UFW or change firewall rules. Administration must remain reachable, and demonstration clients need TCP 443 access. MongoDB, Redis and the DocMan backend are configured to listen on loopback; Apache exposes the website.

### HTTPS choices

- **`existing`:** have a PEM full-chain certificate and matching **unencrypted** PEM private key on the server. Enter their absolute paths when asked. For an internal CA, also supply its trusted CA certificate as a PEM file containing one CA certificate; a public CA normally uses `none`. If an intermediate CA is needed, include it in the full chain. Obtain files and transfer them using walkthrough section 14. Never send a private key in chat or email. The installer copies them into `/etc/ssl/docman`, checks hostname, expiry and key matching, then verifies HTTPS trust.
- **`selfsigned`:** use only where approved for an internal demonstration. The installer generates the key and hostname certificate, valid for 365 days. It trusts that certificate **on the server only**. Follow walkthrough section 14's internal-certificate/client-trust instructions on each demonstration workstation. Give clients only `fullchain.pem`, never `privkey.pem`.
- **`letsencrypt`:** requires public DNS and inbound TCP 80 reaching this server for certificate validation. Enter a renewal email and accept the certificate provider's terms when prompted. The installer installs Certbot, obtains the certificate, configures renewal, and adds an Apache reload hook. This route will not work for a name reachable only inside the agency network.

The installer does not request an organization certificate on your behalf. If you need an internal CA certificate, obtain it before selecting `existing`. For organization and self-signed certificates, assign someone to renew the certificate and verify client trust before expiry.

### Backups before running the installer

For SFTP, follow [walkthrough section 17.2](ubuntu-server-installation.md#172-prepare-the-separate-backup-server) to install/configure the backup server, create its repository directory, create the DocMan server's root-only SSH key, authorize its public key, and verify the server fingerprint. A working root SSH configuration alias such as `docman-backup` is supported. 

For example, after that setup:

```bash
sudo sftp -o BatchMode=yes -b /dev/null docman-backup
echo $?
```

**Success:** no password prompt and the last command prints `0`. **Failure:** `Permission denied`, `Host key verification failed`, connection errors or a nonzero number. Fix SSH before continuing; do not disable host-key verification.

At the installer's repository prompt, enter `sftp:docman-backup:/home/docmanbackup/repository` if you used that walkthrough layout, or `sftp:username@hostname:/absolute/repository/path` for your actual destination. Choose `yes` for NEW only for a repository that has not been initialized. For an existing repository, choose `no` and enter its existing password. The installer refuses to overwrite an initialized repository when credentials are wrong.

For a mounted backup volume, have your storage administrator mount it persistently, create its destination directory, and give root access. Enter its absolute directory path. The installer rejects a destination on the root filesystem and checks again before each backup; two directories on the same disk are not independent backups. A separate volume still needs protection against loss of the whole server; SFTP to a separate server is preferable.

Enter `none` only when consciously deferring backups for a POC, then type `DEFER` to acknowledge that choice. This does not create a backup schedule. Do not rerun the fresh installer later to add backups; use walkthrough section 17.

## 2. Clone the repository

Run these commands **in Bash on the new Ubuntu server**, not in Windows PowerShell. Copy the commands only; do not copy a prompt such as `username@server:~$`.

```bash
sudo apt update
sudo apt install -y git ca-certificates
git clone https://github.com/resonance-designs/docman.git ~/docman-install
cd ~/docman-install
git log -1 --oneline
```

**Success:** apt finishes without `E:` errors, Git reports that cloning completed, and the last command prints a commit ID and description. If access requires repository authentication, use your approved Git credentials; never put a token in the clone URL. Stop on certificate, DNS, authorization or package errors and resolve them using walkthrough section 4.

Use the reviewed branch/tag that includes `install.sh`. If the default branch does not yet include it, obtain the exact approved branch/tag from the release maintainer, switch to it with `git switch BRANCH_NAME` (replace `BRANCH_NAME`), and check `git log -1 --oneline` again. Do not deploy an uncommitted local edit. The installer uses this checkout; it does not silently pull a different version.

## 3. Run the read-only check

```bash
bash install.sh --check
```

**Success:** it prints Ubuntu/architecture, disk capacity, a tool inventory, and `Read-only check complete. No installation performed.` Missing tools are expected on a fresh server; the installer installs them next. A `STOP:` message means the OS, architecture, CPU or boot environment is unsupported. Fix that first; do not bypass the check or mix Ubuntu release repositories.

This check does not prove that network, certificates or backup credentials work. Those are tested during installation.

## 4. Start installation and answer the prompts

```bash
sudo bash install.sh
```

Enter your Linux sudo password if requested. At the dedicated-server confirmation, type `INSTALL` in capital letters. The script then installs prerequisites and asks its configuration questions.

- Type each answer and press **Enter**. A value shown in square brackets is the default; press Enter to accept it.
- Password prompts are asking you to **choose/create** that account's password, except an existing restic repository password. Nothing appears while you type or paste. Enter it again when asked to repeat it.
- Enter the **original password**, with its punctuation, without wrapping it in quotes. The installer performs URL encoding automatically where needed. Save the original labeled passwords in your password manager before continuing.
- If a nested remote-desktop paste adds control characters, the prompt rejects it and asks again. Use the remote session's supported clipboard/paste mechanism; do not add quote marks or terminal escape sequences.
- The first DocMan login password is separate from the MongoDB and Redis service passwords.
- Approval mode defaults to requiring a different assigned approver. Choose `no` only if this deployment should publish versions without that approval requirement.
- Upload size defaults to 50 MiB and can be set from 1 to 250 MiB. Storage encryption is enabled. Superadmins can later change storage settings in the UI; Apache allows 260 MiB requests to leave multipart overhead above the application's 250 MiB ceiling.
- JWT, document-encryption and email-credential machine keys are generated automatically. They are never printed and are preserved during retries.

The installer performs these stages:

1. Installs Node/npm, native-build tools, Python, Apache, Redis, MongoDB and database tools, time synchronization, restic and supporting utilities.
2. Creates separate service/build accounts and prepares `/var/www/docman`, uploads and logs. npm lifecycle scripts run as the build account, not root.
3. Enables MongoDB access control, creates separate administrator/application/backup accounts, configures Redis authentication, and tests both permitted and rejected access.
4. Installs the locked backend and Vue dependencies, writes protected environment files, builds Vue, and creates the first superadmin, General category and encrypted-storage defaults. Self-registration stays off. Initial account creation is audited.
5. Runs the compliance migration and verifies the audit chain.
6. Configures HTTPS, Apache's API proxy and website routing, and the backend systemd service. It publishes Vue and checks frontend `200`, anonymous API `401`, and HTTP-to-HTTPS redirection.
7. Schedules daily audit verification. If backups were selected, verifies/initializes the restic repository, makes the first backup and schedules daily backups.
8. Writes a root-only results report and prints the website address.

`npm ci` may report dependency warnings/findings without failing installation. The installer does not run `npm audit fix`, change lockfiles or suppress the repository audit. Consult [the dependency review](../dependency-security-review.md); any POC deferral remains a documented exception, not production approval.

**Successful finish:** the final line begins `PASS: DocMan is installed at https://...`. Read the report:

```bash
sudo cat /var/lib/docman-installer/RESULTS.txt
```

It contains outcomes and outstanding checks, not passwords. A `STOP:` message or return to the shell without the final PASS is an incomplete installation.

## 5. If installation stops

The failed stage is printed. Fix the reported prerequisite and rerun **the same checkout and commit**:

```bash
cd ~/docman-install
sudo bash install.sh
```

Saved configuration and keys are reused. An interruption before the configuration questions finish causes those questions to restart; no application credentials have been created at that point. After successful completion, rerunning exits without reconfiguring the server. Changed generated files cause a stop instead of being overwritten.

| Message/problem | What to do |
| --- | --- |
| Existing installation/data detected | Do not delete it. This server needs the existing-install update procedure, or select a genuinely fresh server. |
| Package download/DNS/TLS failure | Fix access to the reported package endpoint/proxy/CA using walkthrough section 4; rerun. Do not disable certificate validation. |
| Node version or newer-LTS compatibility stop | Use a release of DocMan whose installer has been updated and tested for the current LTS; do not substitute an older Ubuntu repository. |
| Clock not synchronized | Have NOC confirm the selected NTP source/network access; check `timedatectl status`. Success is `System clock synchronized: yes`. |
| MongoDB/Redis cannot start | Run `sudo journalctl -u mongod -u redis-server -n 50 --no-pager`. Fix the reported path/configuration error; do not recreate accounts or disable authentication. |
| Certificate mismatch/expiry/trust failure | Obtain the matching key/full chain/trusted CA from the issuer. Correct DNS/CA placement; do not use curl's insecure flag to bypass the check. |
| Backend/Apache health failure | Run `sudo journalctl -u docman-backend -u apache2 -n 50 --no-pager` and `sudo apache2ctl configtest`. `Syntax OK` is the expected Apache result. |
| Backup failure | Verify the mounted volume or root SFTP access, the repository password and free space. The backup attempts to restart DocMan on failure and does not mark the installer complete. |
| Generated file differs from installer configuration | Preserve both the file and installer state. Reconcile the specific change with the saved intended configuration before retrying; do not delete state or regenerate keys. |
| Interrupted atomic write (`FileExistsError`) | A root-only `*.docman-new` file may remain beside a target. Preserve it and the original. Have the administrator compare the files and resolve that one temporary file before retrying; never remove installer state to force a restart. |

Do not run the script with `bash -x`: shell tracing is inappropriate for credential setup. Do not publish `.env.prod`, state.json, database configuration, SSH private keys or TLS private keys. If seeking help, share only the failed stage and redacted diagnostic output.

State lives at `/var/lib/docman-installer`, root-owned mode 0700, with `state.json` mode 0600. It contains credentials and recovery keys. Do not delete it during a partial installation. Keep the original clone until installation is complete. The installed source is `/var/www/docman`; privileged retry helpers are held separately in root-only installer state so npm builds cannot modify them.

## 6. Open DocMan and configure email

From a workstation allowed to reach the server, open the HTTPS address printed by the installer. For a self-signed/internal CA certificate, complete workstation trust first. Sign in with the **DocMan username and password** you chose, not the MongoDB administrator account.

**Expected:** the application loads and your superadmin can open user management and system settings. Create a second test account, sign in as that account in a separate browser session, and test the document workflow. Use disposable, non-sensitive demonstration files until acceptance is complete.

Email is deliberately **disabled**, not silently pointed at AWS. Configure **System Settings → Outgoing email** using [walkthrough section 16](ubuntu-server-installation.md#16-configure-outgoing-email-in-system-settings). It covers SMTP relay by IP, SMTP username/password, TLS/STARTTLS, SES, sender permissions, CA trust, saving settings and verifying test-email receipt. Password-reset mail will not work until delivery is configured.

For NMDOH, `webmail.state.nm.us:25` is a reported candidate only. Authentication, TLS, allowed sender addresses and server-IP relay authorization still need confirmation from the mail administrators. The installer neither contacts this server nor sends mail.

## 7. Protect keys, check schedules and prove recovery

Before putting documents into service, securely copy `/var/www/docman/backend/.env.prod` into the organization's approved password/secret store using its secure file-transfer/import process. Also preserve the restic repository password and SSH/TLS recovery material. Do not paste these into a ticket or this chat. The secret store and backup repository must be independently recoverable if this server is lost. Losing `DOCUMENT_ENCRYPTION_KEY` makes encrypted document backups unrecoverable; generating a replacement does not recover old files.

The installer backup intentionally excludes environment files, installer state, SSH keys and TLS private keys. It includes:

- `/var/lib/docman-backup-staging/database.archive`: compressed MongoDB archive of `docman`.
- `/var/lib/docman-backup-staging/source-commit.txt`: matching application commit.
- `/var/lib/docman-backup-staging/source.bundle`: Git bundle for recovering that code without depending on GitHub availability.
- `/var/lib/docman/uploads`: stored files.
- Apache's DocMan site configuration and the backend systemd unit.

The staging archive is removed after the backup attempt. MongoDB users/service passwords must be recovered or reprovisioned separately on a replacement server; the app-only dump is not an operating-system image.

When backups are enabled, they run at **03:00 server time** and briefly stop DocMan so its database and uploaded files form a consistent pair. Do not run other writers during that interval. Retention keeps 7 daily, 4 weekly and 6 monthly snapshots tagged `docman`; pruning stored unused data is a separate administrator action. Audit-chain verification runs at **04:00 server time**. Both jobs use `/run/lock/docman-maintenance.lock` because verification itself records an audit event. Review these maintenance times and retention with the organization.

```bash
systemctl list-timers 'docman-*' --all --no-pager
sudo journalctl -u docman-backup -u docman-audit-verify -n 50 --no-pager
```

**Expected:** future trigger times for enabled timers. The first backup is run directly by the installer, so it appears in the installation output; its service journal may be empty until the timer runs. Audit verification may have no entries before its first run. If backups were deferred, the backup timer is absent by design. Have operations monitor failed services, certificate expiry, storage capacity and audit results; scheduling a job is not failure notification.

For an immediate backup:

```bash
sudo /usr/local/sbin/docman-backup
```

**Expected:** a new restic snapshot and a final `PASS: encrypted backup snapshot created...` message. This pauses the application, so announce the maintenance window first.

### Restore an installer backup on a separate recovery VM

Use a **separate recovery VM**, never the live server. Follow manual walkthrough section 18.1 to prepare Ubuntu, authenticated MongoDB/Redis, the service account/directories, restic access and the original repository password file. Do not run `install.sh` on this recovery database: its account bootstrap would populate the database you need to restore into. Keep recovery mail, schedulers and production DNS disconnected. Stop any recovery backend/audit/backup units that are already installed, as shown in section 18.3.

The following commands replace the manual guide's timestamp/tar/checksum archive steps **for installer-created snapshots only**. Run them on the recovery VM as your normal sudo-capable login, not from a root shell.

First list backups, using the same repository address as the original server:

```bash
read -r -p 'Restic repository address: ' recovery_repository
sudo restic -r "$recovery_repository" --password-file /etc/docman/restic-password snapshots
```

**Expected:** a table of snapshot IDs and dates. Choose a known successful snapshot. A password or connection error means stop; do not initialize a new repository.

```bash
read -r -p 'Exact snapshot ID to recover: ' recovery_snapshot
sudo install -d -m 0700 /srv/docman-installer-restore
sudo restic -r "$recovery_repository" --password-file /etc/docman/restic-password \
  restore "$recovery_snapshot" --target /srv/docman-installer-restore
sudo ls /srv/docman-installer-restore/var/lib/docman-backup-staging
```

Use an empty recovery target for each drill. **Expected:** restic completes without errors, then the listing contains `database.archive`, `source-commit.txt`, and `source.bundle`. Restic checks restored content against its authenticated repository data. Missing files or integrity errors mean stop.

Recover source into an **empty** `/var/www/docman` (do not clone over an existing checkout):

```bash
recovery_user=$(id -un)
recovery_group=$(id -gn)
recovery_commit=$(sudo cat /srv/docman-installer-restore/var/lib/docman-backup-staging/source-commit.txt)
sudo git clone /srv/docman-installer-restore/var/lib/docman-backup-staging/source.bundle /var/www/docman
sudo chown -R "$recovery_user:$recovery_group" /var/www/docman
git -C /var/www/docman checkout --detach "$recovery_commit"
git -C /var/www/docman remote set-url origin https://github.com/resonance-designs/docman.git
git -C /var/www/docman rev-parse HEAD
```

**Expected:** checkout succeeds and the printed commit matches `source-commit.txt`. If `/var/www/docman` already has files, stop and select an empty recovery layout; do not delete an unknown checkout. Recreate the log symlink, install locked backend/Vue dependencies, and configure the recovery frontend using manual sections 9–10. Do **not** create a new DocMan user/category or run a migration as part of a same-version recovery.

Restore the database archive using the **recovery VM's MongoDB administrator password**, entered at the hidden prompt:

```bash
sudo mongorestore --host 127.0.0.1 --username docman_db_admin \
  --authenticationDatabase admin --password \
  --archive=/srv/docman-installer-restore/var/lib/docman-backup-staging/database.archive \
  --gzip --nsInclude='docman.*' --stopOnError
```

**Expected:** zero failed documents and a successful count consistent with the backed-up application. Duplicate-key errors usually mean the target was not empty: stop; do not add `--drop` to overwrite it. The recovery database's service users were created separately in section 18.1.

Only after that succeeds, copy the recovered uploads into the recovery VM's empty uploads directory:

```bash
sudo rsync -a /srv/docman-installer-restore/var/lib/docman/uploads/ /var/lib/docman/uploads/
sudo chown -R docman:docman /var/lib/docman/uploads
sudo ls -la /var/lib/docman/uploads
```

**Expected:** the copy and ownership commands finish without errors; the listing shows recovered files owned by `docman`. Do not use these commands to mix a snapshot with a live upload directory.

Retrieve the original `.env.prod` from the approved **separate secret store** and transfer it privately to this recovery server. It is not in the installer snapshot. Install it using its actual absolute path:

```bash
read -r -p 'Absolute path to recovered private environment file: ' recovery_env
sudo install -o root -g docman -m 0640 "$recovery_env" /var/www/docman/backend/.env.prod
sudo nano /var/www/docman/backend/.env.prod
sudo stat -c '%U %G %a %n' /var/www/docman/backend/.env.prod
```

Before saving in nano, preserve the **original `DOCUMENT_ENCRYPTION_KEY` and `EMAIL_SETTINGS_KEY`**, but update MongoDB/Redis credentials and the recovery hostname to the recovery VM's values. Section 10 explains URL encoding if those new passwords contain punctuation. Keep local login enabled. Save with Ctrl+O, Enter, then exit with Ctrl+X. **Expected permissions:** `root docman 640`. Never display the environment file in shared logs.

Disable restored outgoing email **on the recovery VM only** before any application service starts:

```bash
cd /var/www/docman/backend
sudo -u docman /usr/bin/node --env-file=.env.prod --input-type=module <<'JS'
import mongoose from 'mongoose';
import EmailSetting from './src/models/EmailSetting.js';
try {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await EmailSetting.updateOne({ _id: 'outbound' }, {
    $set: { 'config.provider': 'disabled', encryptedSecrets: '' },
    $inc: { revision: 1 }
  }, { upsert: true });
  if (!result.acknowledged || (result.matchedCount !== 1 && result.upsertedCount !== 1)) {
    throw new Error('STOP: outgoing email was not confirmed disabled. Keep the recovery application stopped.');
  }
  console.log('Recovery email disabled');
} finally { await mongoose.disconnect(); }
JS
```

**Expected:** `Recovery email disabled`, printed only after an acknowledged update matches the existing outbound record or inserts it if missing. This deliberately removes saved mail credentials from the isolated recovery copy; it does not touch the original server or snapshot. If the command reports an error or does not print the success message, stop and keep the recovery application stopped until this step succeeds.

Use manual sections 12–14 to build/publish Vue, install the service and configure a valid certificate for the private recovery hostname. Keep timers disabled. Follow section 18.4 to verify the audit chain (`"valid":true`), start the backend (`active`), sign in with restored accounts, test permissions and download old/new document versions. Compare recovered downloads with known originals, including encrypted files. Record snapshot ID, source commit, checks, results and elapsed recovery time. A successful backup command alone does not establish recoverability.

## Maintainer acceptance checklist

Run on a disposable **fresh Ubuntu 26.04 LTS VM**, not NMDOH's existing deployment. Record the exact DocMan commit and installed package versions.

- [ ] Clean install: package installation, authenticated databases, account/category bootstrap, migration, build and protected file permissions.
- [ ] HTTPS: self-signed path and issued-certificate path; hostname/key/trust failures stop; public Let's Encrypt issuance/renewal where available.
- [ ] Reboot: all required services start; login, upload, replacement/approval and download work; anonymous/unauthorized access is denied.
- [ ] Interrupt at package install, after credentials, after key creation and after service start; rerun same commit without changed passwords/keys or duplicate administrator/audit records.
- [ ] Rerun after success does nothing; an existing deployment and changed generated files are rejected without modification.
- [ ] Backup: SFTP and separate mounted-volume paths; missing mount, wrong password and unavailable destination fail without losing data or leaving DocMan stopped.
- [ ] Restore a selected snapshot to a separate host with the original document key; compare original bytes and audit chain.
- [ ] SMTP configuration/test delivery and browser checks recorded separately from installer checks.

Local automated checks:

```bash
bash -n install.sh
bash -n scripts/install/backup.sh
python3 -B -m unittest discover -s scripts/install -p 'test_*.py' -v
node --check scripts/install/bootstrap.mjs
bash install.sh --help
```

**Expected:** syntax checks exit silently, unit tests finish with `OK`, and help prints usage. These commands do not install software or change services. Backend/bootstrap integration and the VM checks above have their own evidence; syntax/unit checks alone are not deployment acceptance.

Local template checks also passed: Apache parsed the generated virtual host using a temporary test certificate, and systemd parsed the backend unit with a temporary Redis dependency stub (Redis is not installed in that test environment). These checks did not start services and do not prove the target Ubuntu VM boots successfully.

Reference: restic's [SFTP and repository configuration](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html) documents repository addresses and SSH arguments used by the installer.

Bootstrap integration (Linux with Node 22, backend `npm ci` already completed, and `mongod` available):

```bash
node --test scripts/install/test-bootstrap.mjs
```

This starts its own loopback MongoDB process in a temporary directory and stops/removes it afterward. It verifies initial account/password hashing, category, encrypted-storage defaults, disabled mail, retry preservation, a single creation audit, and refusal to promote a conflicting existing account. It does not use an existing database or prove the Ubuntu service installation works.
