#!/usr/bin/env bash
# Installed root-only at /usr/local/sbin/docman-backup. No credentials in argv/logs.
set -Eeuo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'STOP: run this backup with sudo.' >&2; exit 1; }
exec 9>/run/lock/docman-maintenance.lock
flock -n 9 || { echo 'STOP: another backup is running.' >&2; exit 1; }
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE=/etc/docman/restic-password
RESTIC_REPOSITORY=$(cat /etc/docman/restic-repository)
RESTIC_OPTIONS=()
if [[ "$RESTIC_REPOSITORY" == sftp:* ]]; then RESTIC_OPTIONS=(-o 'sftp.args=-oBatchMode=yes -oStrictHostKeyChecking=yes'); fi
[[ -n "$RESTIC_REPOSITORY" && -r "$RESTIC_PASSWORD_FILE" && -r /etc/docman/mongodump.yml ]]
if [[ "$RESTIC_REPOSITORY" == /* ]]; then
    [[ -d "$RESTIC_REPOSITORY" && "$(stat -c %d "$RESTIC_REPOSITORY")" != "$(stat -c %d /)" ]] || { echo 'STOP: separate backup storage is not mounted.' >&2; exit 1; }
fi
# Verify destination before taking the application offline.
restic "${RESTIC_OPTIONS[@]}" snapshots --latest 1 >/dev/null
STAGING=/var/lib/docman-backup-staging
[[ ! -L "$STAGING" ]] || { echo 'STOP: backup staging must not be a symlink.' >&2; exit 1; }
install -d -o root -g root -m 0700 "$STAGING"
restart_backend=false
cleanup() {
    local status=$?
    trap - EXIT
    if [[ "$restart_backend" == true ]]; then
        if ! systemctl start docman-backend; then
            echo 'STOP: backup finished/failed but backend restart failed; inspect its journal.' >&2
            status=1
        fi
    fi
    # Only known transient files in this fixed, root-owned directory are removed.
    rm -f -- "$STAGING/database.archive" "$STAGING/source-commit.txt" "$STAGING/source.bundle"
    if [[ $status -ne 0 ]]; then echo 'STOP: backup did not complete successfully; inspect journalctl -u docman-backup.' >&2; fi
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
backend_state=$(systemctl show docman-backend --property=ActiveState --value)
if [[ "$backend_state" == active || "$backend_state" == activating || "$backend_state" == reloading || "$backend_state" == deactivating ]]; then
    restart_backend=true
    systemctl stop docman-backend
fi
# Consistency requires no other application processes writing this database/uploads.
mongodump --config=/etc/docman/mongodump.yml --db=docman --archive="$STAGING/database.archive" --gzip
git -c safe.directory=/var/www/docman -C /var/www/docman rev-parse HEAD > "$STAGING/source-commit.txt"
git -c safe.directory=/var/www/docman -C /var/www/docman bundle create "$STAGING/source.bundle" HEAD
pending_tag="docman-pending-$(cat /proc/sys/kernel/random/uuid)"
restic "${RESTIC_OPTIONS[@]}" backup --tag "$pending_tag" "$STAGING" /var/lib/docman/uploads /etc/apache2/sites-available/docman.conf /etc/systemd/system/docman-backend.service
# Only a successful capture becomes eligible for retention. Failed partial snapshots
# retain their unique pending tag and cannot displace a complete daily snapshot.
restic "${RESTIC_OPTIONS[@]}" tag --tag "$pending_tag" --add docman --remove "$pending_tag"
if [[ "$restart_backend" == true ]]; then
    systemctl start docman-backend
    restart_backend=false
fi
# Fixed snapshot paths allow retention grouping. Never prune unrelated snapshot tags.
restic "${RESTIC_OPTIONS[@]}" forget --tag docman --group-by host,tags --keep-daily 7 --keep-weekly 4 --keep-monthly 6
# Pruning is deliberately an administrator operation, not part of an initial install.
echo 'PASS: encrypted backup snapshot created; application restart requested if it was running.'
