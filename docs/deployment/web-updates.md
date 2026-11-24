# Update DocMan from System settings

Superadmins can open **System settings → Software updates** to list newer stable GitHub tags and run the existing updater interactively. Other roles cannot use its API or UI. Tags such as `v3.1.0-rc1`, older versions, and the installed version are excluded. The selected tag is pinned to its commit and checked again before deployment; a moved tag requires a fresh selection. The source is fixed to `https://github.com/resonance-designs/docman.git`.

This is an optional frontend for the [existing updater](automated-updates.md), with the same supported Ubuntu/native-service layout, Node 22 requirements, encrypted backup, migration checks, maintenance lock, and failure recovery. It does not add an automatic database rollback or upgrade the OS. Tags must come from trusted repository maintainers; version checks do not constitute code-signature verification.

## One-time setup on an existing server

The current server must first receive a release containing this feature through the CLI updater. Older releases cannot install a UI that they do not contain. Do not pull the live checkout to bootstrap the feature: follow the separate-tools-clone instructions in the CLI walkthrough. After that update passes its service checks, run these commands **on the Ubuntu server as the sudo-capable deployment operator**, not on your workstation:

```bash
cd /var/www/docman
sudo bash scripts/update/enable-web-updater.sh
```

This installs root-owned copies of the reviewed updater and web broker into `/usr/local/lib/docman-web-updater`, creates a `docman-web-updater` systemd service, and adds a read-only progress proxy to the existing HTTPS Apache site. It also prepares the local POC restic directory. No broad sudo rule is granted to the web app, and no new TCP port is opened. The script refuses to replace the helper during an active update or unresolved recovery.

**Expected:** Apache prints `Syntax OK` (an unrelated global ServerName warning may also appear), the service prints `active`, and the script prints `PASS: updater service installed...`. If any step prints STOP or exits with an error, do not start a web update. A custom Apache file without exactly one `ProxyRequests Off` needs the operator to add `Include /etc/docman/web-updater-apache.conf` inside its HTTPS virtual host before running the setup script again. The original standard site file is retained as `/etc/apache2/sites-available/docman.conf.before-web-updater`.

Verify:

```bash
systemctl is-active docman-web-updater
sudo stat -c '%U %G %a %n' /run/docman-web-updater/control.sock /run/docman-web-updater/progress.sock
curl -i https://YOUR-DOCMAN-HOST/_docman-update/status
```

Replace `YOUR-DOCMAN-HOST` with the application's existing HTTPS hostname. Expect `active`; `root docman 660` for the control socket; `root www-data 660` for progress; and HTTP **403** with an expired-access message for the unauthenticated progress request. That 403 is intentional. Never disable certificate verification to make this test pass. In the UI, **Check for updates** must show an installed version and a release list (or explicitly say no newer stable releases).

Helper code is deliberately outside the application checkout and is not replaced by web updates. If a later release requires a helper upgrade, the server operator must rerun this setup from that reviewed release while no update/recovery is active. The ordinary app remains unprivileged; the installed helper is privileged and should be treated as deployment infrastructure.

## Interactive update

1. Sign in as a superadmin and open **System settings → Software updates**. Click **Check for updates**.
2. Choose a newer stable release. Read the release/commit and downtime confirmation, then choose **Start interactive update**. The UI verifies its independent progress route before starting.
3. Preflight checks run without changing the installed source. At the confirmation prompt, type `UPDATE` only after ensuring other administrators, imports and custom writers are stopped for the maintenance window.
4. For backup destination, enter `LOCAL` or `SAVED`. `LOCAL` uses `/var/backups/docman-update-restic`; `SAVED` uses the operator-controlled `/etc/docman/restic-repository`. Web users cannot enter arbitrary filesystem destinations or remote repository URLs. Configure a separate-storage destination through the CLI guide first if needed.
5. For local root-disk storage, type `LOCAL-POC` at the next prompt. It is an encrypted recovery backup, not protection against loss of the server or disk.
6. Reuse the protected saved password when offered, or enter the repository password twice. For a new repository, choose your own password of at least 18 characters and keep it in your password manager. This is a **backup password**, not a MongoDB or login password. Answers are not written to the audit log or browser storage.
7. Type `INITIALIZE` only if the selected backup destination is genuinely new/empty. If an existing repository cannot be opened, cancel and fix its credentials/connectivity instead.
8. Watch progress. The updater builds first, then stops DocMan for backup and migration. This page uses a separate read-only status connection, so it can show success or recovery-required status even with the backend stopped. Keep the page open. A refresh in the same browser tab retains its read-only progress ticket; control prompts still require a valid superadmin login and the backend.
9. Success means **Service checks passed. Browser acceptance testing is still required.** Choose **Reload updated application**, then test login, document permissions/upload/approval/download, audit history and email. Record the actual deployed commit and results.

Cancel is available only while the updater is waiting for a pre-deployment answer. An unanswered prompt cancels after 30 minutes. Once backup/migration starts, do not kill processes or restart the updater service to cancel it. A lost browser connection does not cancel an active deployment. Progress tickets are read-only and valid for four hours; signing in again while the backend is available restores observation. If the backend remains down after a failure or a ticket expires during recovery, contact the server operator.

## Failure and operator recovery

- Missing helper/socket: install or repair the one-time setup; no update begins.
- Cannot list releases: check outbound HTTPS/DNS access to GitHub from the server. This is separate from SMTP connectivity.
- Changed tag, concurrent update, or invalid prompt: refresh status; do not resubmit blindly. Another superadmin may already have answered the prompt.
- Failed before deployment: the report distinguishes an untouched deployment from an original service restored after a failed pre-mutation backup. Review the private report before retrying.
- Recovery required: the backend may intentionally remain stopped to prevent writes against a partially migrated database. Follow the matching snapshot/source/environment recovery in the CLI guide. Do not switch Git back without restoring the corresponding data.

The browser exposes stage/status, selected commit, backup snapshot and recovery run ID, never command logs or environment files. Root-only broker state and diagnostics are in `/var/lib/docman-web-updater`; full update reports and backup credentials remain under `/var/lib/docman-updates/<run-id>`. Do not paste these private files into chat. The audit log records an authenticated **request** to start an update; the private helper report records its actual result.

If the helper itself restarts during a job, it marks the job interrupted and refuses another start. An operator must inspect `/var/lib/docman-updates/ACTIVE`, perform any required recovery, verify the application is healthy and confirm no worker remains. Only then stop `docman-web-updater`, preserve its root-only `status.json` under a dated name, and restart the service. Do not delete the CLI ACTIVE marker merely to bypass recovery checks.

## Validation boundary

Local tests cover superadmin API authorization, fixed tag/commit input, audit failure, secret-answer handling, stable numeric version ordering, tag changes, prompt replay, read-only Unix progress access, worker prompt/completion pipes, interrupted-job blocking, frontend progress/secret behavior, and the existing CLI safety suite. Vue builds successfully. A full Ubuntu/systemd/Apache update and restore drill through this UI remains required before claiming deployment acceptance. No NMDOH deployment has been performed by these source changes.

November 24 local results: 33 existing CLI safety tests, 10 broker/Unix-socket/worker tests, 12 backend API tests, and 13 frontend update/review regressions passed (68 total). The Vue production build and Bash syntax checks passed; the existing bundle-size advisory remains. These fixtures do not run a real systemd/Apache deployment or restore.
