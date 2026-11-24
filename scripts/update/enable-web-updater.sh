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
cat > /etc/docman/web-updater-apache.conf <<'APACHE'
# Read-only progress socket. Control socket is never proxied by Apache.
ProxyPass /_docman-update/ unix:/run/docman-web-updater/progress.sock|http://localhost/ timeout=15
ProxyPassReverse /_docman-update/ http://localhost/
<Location /_docman-update/>
    Header always set Cache-Control "no-store"
    Header always set Referrer-Policy "no-referrer"
</Location>
APACHE
python3 - <<'PY'
from pathlib import Path
import shutil
config=Path('/etc/apache2/sites-available/docman.conf')
text=config.read_text()
include='Include /etc/docman/web-updater-apache.conf'
if include not in text:
    if text.count('ProxyRequests Off') != 1:
        raise SystemExit('STOP: expected one ProxyRequests Off in the HTTPS virtual host. Add the Include there manually, then rerun.')
    backup=config.with_name('docman.conf.before-web-updater')
    if not backup.exists(): shutil.copyfile(config,backup); backup.chmod(0o600)
    text=text.replace('ProxyRequests Off', 'ProxyRequests Off\n    '+include)
    text=text.replace('RewriteCond %{REQUEST_URI} !^/(api|uploads)', 'RewriteCond %{REQUEST_URI} !^/(api|uploads|_docman-update)')
    config.write_text(text)
PY
apache2ctl configtest
systemctl daemon-reload
systemctl enable docman-web-updater
systemctl restart docman-web-updater
systemctl reload apache2
systemctl is-active docman-web-updater
echo 'PASS: updater service installed. Sign in as superadmin and open System settings > Software updates.'
