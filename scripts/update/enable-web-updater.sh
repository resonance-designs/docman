#!/usr/bin/env bash
# One-time operator setup; never invoked by the web application.
set -Eeuo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'Run with sudo bash scripts/update/enable-web-updater.sh'; exit 1; }
SOURCE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
test -f "$SOURCE/runner.py"
test -f /etc/apache2/sites-available/docman.conf
id docman >/dev/null
id www-data >/dev/null
# Serialize broker starts and protect older helpers via the existing CLI lock.
# Hold both descriptors until installation and service restart finish.
exec 8>/run/lock/docman-web-updater-install.lock
flock -n 8 || { echo 'STOP: updater setup or start is in progress.'; exit 1; }
exec 9>/run/lock/docman-update.lock
flock -n 9 || { echo 'STOP: another update is running.'; exit 1; }
python3 - <<'PY'
import json
from pathlib import Path
state=Path('/var/lib/docman-web-updater/status.json')
if Path('/var/lib/docman-updates/ACTIVE').exists() or (state.exists() and json.loads(state.read_text()).get('status') in ('starting','running','waiting','interrupted','recovery-required')):
    raise SystemExit('STOP: finish the active update/recovery before installing updater support.')
PY
install -d -o root -g root -m 0755 /usr/local/lib/docman-web-updater
install -d -o root -g root -m 0700 /var/lib/docman-web-updater /var/backups/docman-update-restic /etc/docman
install -o root -g root -m 0644 "$SOURCE/runner.py" "$SOURCE/web_service.py" /usr/local/lib/docman-web-updater/
cat > /etc/systemd/system/docman-web-updater.service <<'UNIT'
[Unit]
Description=DocMan restricted web updater
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
UMask=0077
ExecStart=/usr/bin/python3 -I /usr/local/lib/docman-web-updater/web_service.py
RuntimeDirectory=docman-web-updater
RuntimeDirectoryMode=0755
Restart=no
KillMode=control-group
TimeoutStopSec=90

[Install]
WantedBy=multi-user.target
UNIT
python3 "$SOURCE/configure_web_apache.py"
systemctl daemon-reload
systemctl enable docman-web-updater
systemctl restart docman-web-updater
systemctl reload apache2
systemctl is-active docman-web-updater
echo 'PASS: updater service installed. Sign in as superadmin and open System settings > Software updates.'
