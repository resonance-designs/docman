#!/usr/bin/env bash
# @author Richard Bakos
# @version 3.0.2
# @license UNLICENSED
# Interactive fresh-server installation. See docs/deployment/automated-installation.md.
set -Eeuo pipefail
umask 077
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
STATE=/var/lib/docman-installer
HELPER="$STATE/runner/configure.py"
APP=/var/www/docman
# Resume execution only from the private copy, never build-account-writable source.
if [[ "${BASH_SOURCE[0]}" == "$STATE/runner/install.sh" && "${1:-}" == --source-root ]]; then
  ROOT="$2"
  shift 2
fi
STAGE=preflight
usage() {
  cat <<'HELP'
Usage: sudo bash install.sh [--check]
  --check  Read-only prerequisites/inventory; no packages or configuration changed.
  --help   Show this help.
Installs a fresh dedicated Ubuntu 26.04 LTS x86_64 server interactively.
Resumes only this installer's incomplete installations; never upgrades an existing app.
Do not use bash -x, pipe this script from curl, or put credentials on the command line.
HELP
}
fail() { printf '\nSTOP: %s\n' "$*" >&2; exit 1; }
step() { STAGE="$1"; printf '\n== %s ==\n' "$STAGE"; }
npm_build() {
  # Dependency lifecycle scripts run without root privileges; runtime must be able to read their output.
  runuser -u docman-build -- env HOME=/var/lib/docman-build sh -c 'umask 022; exec npm "$@"' sh "$@"
}
on_error() {
  local code=$?
  printf '\nSTOP: stage "%s" failed (exit %s). No success has been recorded.\n' "$STAGE" "$code" >&2
  printf 'Correct the reported error, then rerun the same checkout with sudo bash install.sh.\nState and secrets are preserved in /var/lib/docman-installer (root only). Do not delete it to retry.\n' >&2
  exit "$code"
}
trap on_error ERR
[[ $# -le 1 ]] || fail 'Only --check or --help is supported.'
case "${1:-}" in --help|-h) usage; exit 0;; --check|'') ;; *) usage; exit 1;; esac
[[ -r /etc/os-release ]] || fail 'Ubuntu Server is required.'
# shellcheck disable=SC1091
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 26.04 ]] || fail 'This installer targets the latest supported LTS: Ubuntu 26.04. Do not use another release repository. Update installer support when a newer LTS is released.'
[[ "$(uname -m)" == x86_64 ]] || fail 'This installer currently supports x86_64 only.'
grep -qw avx /proc/cpuinfo || fail 'MongoDB requires a CPU exposing AVX.'
[[ -d /run/systemd/system ]] || fail 'Boot Ubuntu with systemd; containers/WSL are not installation targets.'
printf 'Ubuntu: %s\nArchitecture: %s\n' "$PRETTY_NAME" "$(uname -m)"
df -h /
for tool in git curl python3 node npm mongod mongosh mongodump mongorestore redis-cli apache2 restic; do
  if command -v "$tool" >/dev/null; then printf '%s: installed\n' "$tool"; else printf '%s: will need installation\n' "$tool"; fi
done
[[ "${1:-}" != --check ]] || { printf 'Read-only check complete. No installation performed.\n'; exit 0; }
[[ $EUID -eq 0 ]] || fail 'Run sudo bash install.sh from your cloned repository.'
[[ -t 0 ]] || fail 'An interactive terminal is required for prompts.'
[[ -d "$ROOT/.git" && -f "$ROOT/backend/package-lock.json" && -f "$ROOT/frontend-vue/package-lock.json" && -f "$ROOT/scripts/install/configure.py" ]] || fail 'Run from a complete standalone DocMan clone (not a linked worktree).'
exec 9>/run/lock/docman-install.lock
flock -n 9 || fail 'Another DocMan installer is running.'
[[ ! -L "$STATE" ]] || fail 'Installer state must not be a symlink.'
if [[ -d "$STATE" ]]; then
  [[ "$(stat -c '%u:%a' "$STATE")" == 0:700 ]] || fail 'Installer state must be root-owned with mode 700.'
fi
if [[ ! -f "$STATE/started" ]]; then
  for existing in "$APP/backend/.env.prod" /etc/systemd/system/docman-backend.service /var/lib/mongodb/WiredTiger /var/lib/redis/dump.rdb /etc/mongod.conf /etc/redis/redis.conf; do
    [[ ! -e "$existing" ]] || fail "Existing installation/data detected at $existing. Use walkthrough section 19; this is not an upgrade tool."
  done
  for account in docman docman-build; do
    ! getent passwd "$account" >/dev/null || fail "Existing $account account detected; use a fresh server."
  done
  if [[ -d "$APP" && "$ROOT" != "$APP" ]] && [[ -n "$(find "$APP" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then fail "$APP is not empty. Clone there or choose a fresh server; nothing will be deleted."; fi
fi
[[ ! -f "$STATE/complete" ]] || { printf 'This installer already completed. Use walkthrough section 19 for updates; no files changed.\n'; exit 0; }
if [[ -f "$STATE/state.json" ]]; then
  completion=$(python3 -c 'import json,sys; print("yes" if json.load(open(sys.argv[1])).get("complete") is True else "no")' "$STATE/state.json") || fail 'Cannot read installer state; preserve it and investigate.'
  if [[ "$completion" == yes ]]; then
    printf 'This installer already completed. Use the update guide; no files changed.\n'
    exit 0
  fi
fi
SOURCE_COMMIT=$(git -c safe.directory="$ROOT" -C "$ROOT" rev-parse HEAD)
git -c safe.directory="$ROOT" -C "$ROOT" cat-file -e HEAD:install.sh || fail 'The installer must be committed in the selected release.'
[[ -z "$(git -c safe.directory="$ROOT" -C "$ROOT" status --porcelain --untracked-files=no)" ]] || fail 'Use a committed, unchanged checkout for installation.'
if [[ -f "$STATE/started" ]]; then
  [[ "$(cat "$STATE/started")" == "$SOURCE_COMMIT" ]] || fail 'Resume with the original checkout commit; do not change source during installation.'
fi
printf '\nThis installs system packages, creates local MongoDB/Redis accounts and configures Apache on a dedicated server.\nIt does not configure your organization DNS, perimeter firewall, mail relay permissions, or backup server.\n'
if [[ "${BASH_SOURCE[0]}" != "$STATE/runner/install.sh" ]]; then
  read -r -p 'Continue on this dedicated server? Type INSTALL: ' answer
  [[ "$answer" == INSTALL ]] || fail 'Cancelled; no installation started.'
fi
install -d -m 0700 "$STATE"
if [[ ! -f "$STATE/started" ]]; then
  install -d -m 0700 "$STATE/runner"
  cp -a "$ROOT/scripts/install/." "$STATE/runner/"
  chown -R root:root "$STATE/runner"
  chmod -R go-rwx "$STATE/runner"
  printf '%s\n' "$SOURCE_COMMIT" > "$STATE/started"
fi
if [[ "${BASH_SOURCE[0]}" != "$STATE/runner/install.sh" ]]; then
  install -o root -g root -m 0700 "$ROOT/install.sh" "$STATE/runner/install.sh"
  exec bash "$STATE/runner/install.sh" --source-root "$ROOT"
fi
step 'Install operating-system prerequisites'
apt-get update
apt-get install -y python3 build-essential git curl ca-certificates gnupg openssl rsync nano jq dnsutils util-linux apache2 redis-server nodejs npm chrony logrotate restic distro-info distro-info-data openssh-client
# Fail rather than quietly install against an older LTS when the distro catalog changes.
[[ "$(ubuntu-distro-info --lts)" == "$VERSION_CODENAME" ]] || fail 'A newer Ubuntu LTS is listed by distro-info. Installer support must be updated; do not mix repositories.'
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major !== 22 || minor < 12) { console.error("Required system Node: 22.12 or newer within 22.x"); process.exit(1); }'
install -d -m 0700 "$STATE"
python3 "$HELPER" prompt "$STATE"
# Source only generated non-secret validated parameters; never a user-supplied shell file.
TLS_MODE=$(python3 "$HELPER" get "$STATE" tls_mode)
SITE_HOST=$(python3 "$HELPER" get "$STATE" hostname)
step 'Configure time synchronization'
python3 "$HELPER" time "$STATE"
systemctl enable --now chrony
systemctl restart chrony
if ! timeout 60 bash -c 'until [[ "$(timedatectl show -p NTPSynchronized --value)" == yes ]]; do sleep 2; done'; then fail 'Clock is not synchronized. Confirm NTP access/internal NTP settings, then rerun.'; fi
step 'Install MongoDB 9.0 from its signed Ubuntu repository'
if [[ ! -f /usr/share/keyrings/mongodb-server-9.gpg ]]; then
  curl --fail --silent --show-error --location https://pgp.mongodb.com/server-9.asc -o "$STATE/mongodb-server-9.asc"
  gpg --batch --yes --dearmor -o "$STATE/mongodb-server-9.gpg" "$STATE/mongodb-server-9.asc"
  install -m 0644 "$STATE/mongodb-server-9.gpg" /usr/share/keyrings/mongodb-server-9.gpg
fi
python3 "$HELPER" repository "$STATE"
apt-get update
apt-get install -y mongodb-org mongodb-database-tools
step 'Prepare application accounts, directories and source'
getent passwd docman >/dev/null || useradd --system --user-group --home-dir /var/lib/docman --shell /usr/sbin/nologin docman
getent passwd docman-build >/dev/null || useradd --system --user-group --create-home --home-dir /var/lib/docman-build --shell /usr/sbin/nologin docman-build
install -d -o docman -g docman -m 0750 /var/lib/docman/uploads /var/log/docman
install -d -o root -g root -m 0755 /var/www/html/docman/public_html /var/www/letsencrypt
install -d -o docman-build -g docman-build -m 0755 "$APP"
if [[ "$ROOT" != "$APP" ]]; then
  # Copy tracked source only, never local certificates, credentials, uploads or build artifacts.
  git -c safe.directory="$ROOT" -C "$ROOT" ls-files -z | rsync -a --from0 --files-from=- "$ROOT/" "$APP/"
  rsync -a "$ROOT/.git/" "$APP/.git/"
fi
# No .env exists at first run. On resume preserve ownership of existing protected secrets.
find "$APP" -path '*/.env*' -prune -o -exec chown -h docman-build:docman-build {} +
# A clone made with a restrictive umask must still be readable by the service account.
find "$APP" -path "$APP/.git" -prune -o -type d -exec chmod 0755 {} +
while IFS= read -r -d '' source_file; do
  [[ -L "$APP/$source_file" ]] || chmod a+rX -- "$APP/$source_file"
done < <(git -c safe.directory="$APP" -C "$APP" ls-files -z)
if [[ ! -e "$APP/backend/logs" && ! -L "$APP/backend/logs" ]]; then ln -s /var/log/docman "$APP/backend/logs"; fi
[[ "$(readlink -f "$APP/backend/logs")" == /var/log/docman ]] || fail 'Existing backend/logs is not the expected symlink; preserve it and investigate.'
step 'Configure and authenticate MongoDB and Redis'
python3 "$HELPER" databases "$STATE"
systemctl enable --now mongod redis-server
systemctl restart mongod redis-server
for service in mongod redis-server; do systemctl is-active --quiet "$service" || fail "$service did not start; inspect its journal locally."; done
python3 "$HELPER" mongo "$STATE"
python3 "$HELPER" redis-check "$STATE"
step 'Install locked application dependencies and build the Vue website'
npm_build ci --prefix "$APP/backend"
npm_build ci --prefix "$APP/frontend-vue"
python3 "$HELPER" application "$STATE"
npm_build run build --prefix "$APP/frontend-vue"
[[ -f "$APP/frontend-vue/dist/index.html" ]] || fail 'Vue build did not create dist/index.html.'
step 'Create the first superadmin, category and database indexes'
python3 "$HELPER" bootstrap "$STATE"
(cd "$APP/backend" && runuser -u docman -- env NODE_ENV=production /usr/bin/node src/scripts/migrateComplianceFields.js --dry-run)
(cd "$APP/backend" && runuser -u docman -- env NODE_ENV=production /usr/bin/node src/scripts/migrateComplianceFields.js)
(cd "$APP/backend" && runuser -u docman -- env NODE_ENV=production /usr/bin/node src/scripts/verifyAuditChain.js)
step 'Configure HTTPS'
install -d -o root -g root -m 0700 /etc/ssl/docman
case "$TLS_MODE" in
  selfsigned)
    if [[ ! -f /etc/ssl/docman/privkey.pem ]]; then
      openssl req -x509 -newkey rsa:3072 -noenc -sha256 -days 365 -keyout /etc/ssl/docman/privkey.pem -out /etc/ssl/docman/fullchain.pem -subj "/CN=$SITE_HOST" -addext "subjectAltName=DNS:$SITE_HOST"
    fi
    [[ -s /etc/ssl/docman/fullchain.pem ]] || fail 'Certificate missing while private key exists. Preserve the key and recover the certificate.'
    install -m 0644 /etc/ssl/docman/fullchain.pem /usr/local/share/ca-certificates/docman-selfsigned.crt
    update-ca-certificates
    ;;
  existing) python3 "$HELPER" certificates "$STATE";;
  letsencrypt)
    apt-get install -y certbot
    a2enmod rewrite headers proxy proxy_http ssl
    python3 "$HELPER" acme "$STATE"
    a2ensite docman-acme
    apache2ctl configtest
    systemctl enable --now apache2
    systemctl reload apache2
    python3 "$HELPER" certbot "$STATE"
    a2dissite docman-acme
    systemctl enable --now certbot.timer
    ;;
esac
python3 "$HELPER" verify-certificate "$STATE"
step 'Publish the application and configure services'
rsync -a --delete "$APP/frontend-vue/dist/" /var/www/html/docman/public_html/
chown -R root:root /var/www/html/docman/public_html
find /var/www/html/docman/public_html -type d -exec chmod 0755 {} +
find /var/www/html/docman/public_html -type f -exec chmod 0644 {} +
python3 "$HELPER" services "$STATE"
a2enmod proxy proxy_http headers rewrite ssl
a2dissite 000-default
a2ensite docman
apache2ctl configtest
systemd-analyze verify /etc/systemd/system/docman-backend.service
systemctl daemon-reload
systemctl enable --now docman-backend apache2
systemctl reload apache2
step 'Verify HTTP, HTTPS and database authentication'
if ! timeout 60 bash -c 'until [[ "$(curl --noproxy "*" --max-time 5 --silent --output /dev/null --write-out "%{http_code}" http://127.0.0.1:5001/api/docs || true)" == 401 ]]; do sleep 2; done'; then fail 'Backend did not return the expected unauthenticated HTTP 401. Inspect journalctl -u docman-backend.'; fi
python3 "$HELPER" health "$STATE"
step 'Install audit and backup schedules'
python3 "$HELPER" operations "$STATE"
systemctl daemon-reload
systemctl enable --now docman-audit-verify.timer
if [[ "$(python3 "$HELPER" get "$STATE" backup_repository)" != none ]]; then
  python3 "$HELPER" restic-init "$STATE"
  /usr/local/sbin/docman-backup
  systemctl enable --now docman-backup.timer
  python3 "$HELPER" health "$STATE"
fi
python3 "$HELPER" finish "$STATE"
printf '\nPASS: DocMan is installed at https://%s\nRead /var/lib/docman-installer/RESULTS.txt for required browser/backup/email checks.\n' "$SITE_HOST"
