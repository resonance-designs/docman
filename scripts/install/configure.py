#!/usr/bin/env python3
"""Private configuration and prompts for install.sh. No third-party Python modules."""
import getpass
import grp
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import time
from urllib.parse import quote

APP = Path('/var/www/docman')
STATE = Path('/var/lib/docman-installer')

def stop(message):
    raise RuntimeError(message)

def run(argv, **kwargs):
    return subprocess.run(argv, check=True, **kwargs)

def atom(path, content, mode=0o600):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.docman-new')
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    try:
        with os.fdopen(fd, 'w') as output:
            output.write(content)
        os.replace(temp, path)
        os.chmod(path, mode)
    finally:
        temp.unlink(missing_ok=True)

def load():
    return json.loads((STATE / 'state.json').read_text())

def save(config):
    atom(STATE / 'state.json', json.dumps(config))

def managed(path, content, mode=0o644, package_default=False):
    """Never overwrite a changed managed file on resume; save package defaults once."""
    path = Path(path)
    marker = STATE / ('managed-' + hashlib.sha256(str(path).encode()).hexdigest())
    if path.is_symlink():
        stop(f'Refusing to replace symlink {path}')
    if path.exists():
        if path.read_text() == content:
            os.chmod(path, mode)
            marker.touch(mode=0o600)
            return
        if marker.exists() or not package_default:
            stop(f'{path} differs from installer configuration. Preserve it and reconcile before resuming.')
        shutil.copy2(path, STATE / (marker.name + '.original'))
    atom(path, content, mode)
    marker.touch(mode=0o600)

def host_valid(value):
    return bool(re.fullmatch(r'(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?', value)) and '..' not in value and all(0 < len(label) <= 63 and not label.startswith('-') and not label.endswith('-') for label in value.split('.'))

def password_valid(value, maximum=72):
    return len(value) >= 18 and len(value.encode()) <= maximum and not any(ord(c) < 32 or 127 <= ord(c) <= 159 for c in value)

def backup_repository_valid(value):
    if any(ord(c) < 32 or 127 <= ord(c) <= 159 for c in value): return False
    if value == 'none' or value.startswith('/'): return True
    match = re.fullmatch(r'sftp:(?:[A-Za-z0-9_][A-Za-z0-9_.-]*@)?([A-Za-z0-9.-]+):/[A-Za-z0-9_./-]+', value)
    return bool(match and host_valid(match[1]))

def ask(label, default='', valid=lambda value: bool(value)):
    while True:
        value = input(f'{label}' + (f' [{default}]' if default else '') + ': ').strip() or default
        if valid(value):
            return value
        print('Invalid value. Please try again.')

def password(label):
    print(f'{label}: choose your own password, 18+ characters, at most 72 UTF-8 bytes. Characters are hidden.')
    while True:
        value = getpass.getpass('Password: ')
        if not password_valid(value):
            print('Use 18+ characters, at most 72 UTF-8 bytes, with no tabs/newlines/control characters.')
        elif value != getpass.getpass('Repeat password: '):
            print('Passwords differ. Try again.')
        else:
            return value

def file_prompt(label, optional=False):
    return ask(label, 'none' if optional else '', lambda value: (optional and value == 'none') or (Path(value).is_absolute() and Path(value).is_file()))

def prompt():
    if (STATE / 'state.json').exists():
        print('Resuming saved configuration. Existing passwords and encryption keys are preserved.')
        return
    print('\nSave your chosen passwords in your password manager, labeled by account. No URL encoding is needed; the installer handles that.')
    c = {'hostname': ask('Website DNS hostname (DNS must point to this server)', valid=host_valid).lower()}
    c['ntp'] = ask('Internal NTP hostname/IP, or default for Ubuntu time sources', 'default', lambda x: x == 'default' or host_valid(x))
    c['tls_mode'] = ask('HTTPS: existing, selfsigned (approved internal POC), or letsencrypt', 'existing', lambda x: x in ['existing', 'selfsigned', 'letsencrypt'])
    if c['tls_mode'] == 'existing':
        c['certificate'] = file_prompt('Absolute path to issued full-chain PEM certificate')
        c['private_key'] = file_prompt('Absolute path to matching unencrypted PEM private key')
        while Path(c['private_key']).resolve().is_relative_to(APP):
            print('Keep the private key outside /var/www/docman. Copy it to a protected administrator directory first.')
            c['private_key'] = file_prompt('Absolute path to matching unencrypted PEM private key outside the app checkout')
        c['ca'] = file_prompt('Absolute path to trusted organization CA PEM (none for public CA)', True)
    elif c['tls_mode'] == 'letsencrypt':
        c['certificate_email'] = ask('Certificate renewal email', valid=lambda x: bool(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', x)))
        print('Public DNS and inbound TCP 80 are required. Certificate issuance failure will stop installation; fix DNS/network and rerun.')
        ask('Accept Let\'s Encrypt terms at https://letsencrypt.org/repository/ ? Type yes', valid=lambda x: x == 'yes')
    else:
        print('Self-signed HTTPS requires separately trusting the public certificate on each demonstration workstation. It expires after 365 days.')
    c['mongo_admin_password'] = password('MongoDB administrator docman_db_admin')
    c['mongo_app_password'] = password('MongoDB application account docman_app (use a different password)')
    while c['mongo_app_password'] == c['mongo_admin_password']:
        print('Use a separate application password.')
        c['mongo_app_password'] = password('MongoDB application account')
    c['redis_password'] = password('Redis service (use a separate password)')
    c['person'] = {key: ask(label, valid=lambda x: 0 < len(x) <= 254 and not any(ord(ch) < 32 or ord(ch) == 127 for ch in x)) for key, label in [('firstname', 'First superadmin first name'), ('lastname', 'Last name')]}
    c['person']['username'] = ask('DocMan username (3-50 letters, numbers, dots, underscores or hyphens)', valid=lambda x: bool(re.fullmatch(r'[A-Za-z0-9_.-]{3,50}', x)))
    c['person']['email'] = ask('DocMan email address', valid=lambda x: bool(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', x))).lower()
    c['person']['password'] = password('First DocMan superadmin login')
    c['approvals'] = ask('Require another assigned user to approve file versions? yes/no', 'yes', lambda x: x in ['yes', 'no']) == 'yes'
    c['upload_mb'] = int(ask('Maximum upload size in MiB (1-250)', '50', lambda x: x.isdigit() and 1 <= int(x) <= 250))
    print('Document storage encryption is enabled. Its machine key and a separate email-credential key are generated automatically and never displayed.')
    c['jwt'] = secrets.token_hex(64)
    c['document_key'] = secrets.token_hex(32)
    c['email_key'] = secrets.token_hex(32)
    c['mongo_backup_password'] = secrets.token_urlsafe(32)
    print('Backups: provide an absolute path on a separately mounted backup volume, or an existing restic sftp:user@host:/absolute/path destination.')
    print('For SFTP, provision the backup server and root SSH key/known_hosts first (walkthrough section 17). The installer will not modify a remote server.')
    print('Scheduled backups briefly stop DocMan each day at 03:00 server time. Retention: 7 daily, 4 weekly, 6 monthly snapshots.')
    c['backup_repository'] = ask('Restic repository, or none to explicitly defer backups for a POC', 'none', backup_repository_valid)
    if c['backup_repository'] != 'none':
        c['restic_password'] = password('Restic repository encryption password (save separately from this server)')
        c['restic_new'] = ask('Is this a NEW repository to initialize? yes/no', 'no', lambda x: x in ['yes', 'no']) == 'yes'
    else:
        ask('No backups: installation is POC-only until backups and restore are verified. Type DEFER', valid=lambda x: x == 'DEFER')
    c['commit'] = (STATE / 'started').read_text().strip()
    c['schema'] = 1
    save(c)
    print('Configuration saved root-only. Secret values were not printed. Reruns preserve this configuration.')

def database_uri(c, account='app'):
    username = 'docman_app' if account == 'app' else 'docman_backup'
    authdb = 'docman' if account == 'app' else 'admin'
    return f'mongodb://{username}:{quote(c["mongo_" + account + "_password"], safe="")}@127.0.0.1:27017/docman?authSource={authdb}'

def application(c):
    settings = {
        'NODE_ENV': 'production', 'ENV': 'Production', 'ACTIVE_ENV': '1', 'ATLAS': 'no', 'NODE_PORT': '5001', 'NODE_HOST': '127.0.0.1',
        'DOCMAN_UI': 'vue', 'MONGO_URI': database_uri(c), 'JWT_SECRET': c['jwt'], 'TOKEN_KEY': c['jwt'],
        'APP_BASE_URL': 'https://' + c['hostname'], 'FRONTEND_URL': 'https://' + c['hostname'], 'PRODUCTION_URL': 'https://' + c['hostname'],
        'TRUST_PROXY': 'loopback', 'UPLOAD_DIR': '/var/lib/docman/uploads', 'SEED_ON_DEPLOY': 'false', 'LOCAL_SELF_REGISTRATION_ENABLED': 'false',
        'ENABLE_API_DOCS': 'false', 'ALLOW_DESTRUCTIVE_ADMIN_TOOLS': 'false', 'REDIS_PROVIDER': 'local',
        'REDIS_URL': 'redis://:' + quote(c['redis_password'], safe='') + '@127.0.0.1:6379/0', 'REDIS_KEY_PREFIX': 'docman:ratelimit:',
        'APPROVAL_REQUIRED': str(c['approvals']).lower(), 'APPROVAL_MIN_APPROVALS': '1', 'APPROVAL_ALLOW_SELF_APPROVAL': 'false',
        'AUDIT_FAIL_CLOSED': 'true', 'AUDIT_LOG_READS': 'true', 'AUDIT_STDOUT': 'false', 'VERIFY_FILE_INTEGRITY_ON_DOWNLOAD': 'true',
        'DOCUMENT_ENCRYPTION_KEY': c['document_key'], 'EMAIL_SETTINGS_KEY': c['email_key'], 'MAX_UPLOAD_MB_CEILING': '250',
    }
    env = APP / 'backend/.env.prod'
    managed(env, ''.join(f'{key}={value}\n' for key, value in settings.items()), 0o640)
    os.chown(env, 0, grp.getgrnam('docman').gr_gid)
    # Same-origin API and local login; no secrets in the browser build.
    managed(APP / 'frontend-vue/.env.production', 'VITE_AUTHENTIK_ENABLED=false\n', 0o644)

MONGO_JS = r'''
const c = JSON.parse(require('fs').readFileSync('/var/lib/docman-installer/state.json', 'utf8'));
const admin = db.getSiblingDB('admin');
try {
  let authenticated = false;
  try { authenticated = Boolean(admin.auth('docman_db_admin', c.mongo_admin_password)); } catch {}
  if (!authenticated) {
    // Localhost exception allows only initial administrator creation; never disable access control.
    admin.createUser({user:'docman_db_admin', pwd:c.mongo_admin_password, roles:[{role:'root',db:'admin'}]});
    if (!admin.auth('docman_db_admin', c.mongo_admin_password)) throw new Error('Authentication failed');
  }
  const app = db.getSiblingDB('docman');
  if (!app.getUser('docman_app')) app.createUser({user:'docman_app',pwd:c.mongo_app_password,roles:[{role:'readWrite',db:'docman'}]});
  if (!admin.getUser('docman_backup')) admin.createUser({user:'docman_backup',pwd:c.mongo_backup_password,roles:[{role:'backup',db:'admin'}]});
  print('PASS: MongoDB accounts exist; access control remains enabled.');
} catch { print('STOP: MongoDB account provisioning failed. Existing accounts/passwords were not reset.'); quit(1); }
'''

def databases(c):
    managed('/etc/mongod.conf', '''storage:
  dbPath: /var/lib/mongodb
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
net:
  port: 27017
  bindIp: 127.0.0.1
security:
  authorization: enabled
processManagement:
  timeZoneInfo: /usr/share/zoneinfo
''', 0o644, True)
    # JSON strings provide Redis's supported quoted escapes, preserving punctuation and spaces.
    managed('/etc/redis/redis.conf', '''bind 127.0.0.1 ::1
protected-mode yes
port 6379
supervised systemd
daemonize no
dir /var/lib/redis
logfile /var/log/redis/redis-server.log
save 900 1
''' + 'requirepass ' + json.dumps(c['redis_password'], ensure_ascii=False) + '\n', 0o640, True)
    os.chown('/etc/redis/redis.conf', 0, grp.getgrnam('redis').gr_gid)

def mongo(c):
    # systemd "active" precedes MongoDB accepting connections on a new data directory.
    for attempt in range(15):
        ready = subprocess.run(['mongosh', '--quiet', 'mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=2000', '--eval', 'db.runCommand({ping:1})'], capture_output=True)
        if ready.returncode == 0: break
        if attempt == 14: stop('MongoDB did not accept connections. Inspect journalctl -u mongod.')
        time.sleep(2)
    script = STATE / 'mongo-bootstrap.js'
    atom(script, MONGO_JS)
    try:
        run(['mongosh', '--quiet', '--host', '127.0.0.1', '--file', str(script)])
        # Positive and negative authenticated checks; credentials stay in a private script/config.
        atom(script, "const c=JSON.parse(require('fs').readFileSync('/var/lib/docman-installer/state.json','utf8')); try { const app=db.getSiblingDB('docman'); if(!app.auth('docman_app',c.mongo_app_password)) quit(1); app.getCollectionNames(); print('PASS: MongoDB application login'); } catch { quit(1); }")
        run(['mongosh', '--quiet', '--host', '127.0.0.1', '--file', str(script)])
        result = subprocess.run(['mongosh','--quiet','--host','127.0.0.1','--eval', "db.getSiblingDB('docman').getCollectionNames()"], capture_output=True)
        if result.returncode == 0:
            stop('MongoDB accepted an unauthenticated collection listing.')
    finally:
        script.unlink(missing_ok=True)

def redis_check(c):
    env = {**os.environ, 'REDISCLI_AUTH': c['redis_password']}
    result = run(['redis-cli','-h','127.0.0.1','ping'], env=env, capture_output=True, text=True)
    if result.stdout.strip() != 'PONG': stop('Redis authenticated ping did not return PONG.')
    clean = {key: value for key, value in os.environ.items() if key != 'REDISCLI_AUTH'}
    result = run(['redis-cli','-h','127.0.0.1','ping'], env=clean, capture_output=True, text=True)
    if 'NOAUTH' not in result.stdout + result.stderr: stop('Redis did not reject an unauthenticated ping.')
    print('PASS: Redis authenticated PONG and unauthenticated NOAUTH.')

def certificate_paths(c):
    base = Path('/etc/letsencrypt/live') / c['hostname'] if c['tls_mode'] == 'letsencrypt' else Path('/etc/ssl/docman')
    return base / 'fullchain.pem', base / 'privkey.pem'

def certificates(c):
    cert, key = certificate_paths(c)
    for source, target, mode in [(c['certificate'], cert, 0o644), (c['private_key'], key, 0o600)]:
        if Path(source).resolve() != target.resolve(): managed(target, Path(source).read_text(), mode)
    if c['ca'] != 'none':
        managed('/usr/local/share/ca-certificates/docman-organization.crt', Path(c['ca']).read_text())
        run(['update-ca-certificates'])

def verify_certificate(c):
    cert, key = certificate_paths(c)
    run(['openssl','x509','-in',str(cert),'-noout','-checkhost',c['hostname']])
    run(['openssl','x509','-in',str(cert),'-noout','-checkend','86400'])
    pub_cert = subprocess.check_output(['openssl','x509','-in',str(cert),'-pubkey','-noout'])
    pub_key = subprocess.check_output(['openssl','pkey','-in',str(key),'-pubout','-passin','pass:'])
    if pub_cert != pub_key: stop('Certificate and private key do not match.')
    os.chmod(key, 0o600)
    os.chown(key, 0, 0)


def services(c):
    cert, key = certificate_paths(c)
    template = (Path(__file__).parent / 'docman.conf.template').read_text()
    for token, value in {'HOST': c['hostname'], 'CERT': str(cert), 'KEY': str(key), 'BODY_LIMIT': str((250 + 10) * 1024 * 1024)}.items():
        template = template.replace('@@' + token + '@@', value)
    managed('/etc/apache2/sites-available/docman.conf', template)
    managed('/etc/systemd/system/docman-backend.service', (Path(__file__).parent / 'docman-backend.service').read_text())
    managed('/etc/logrotate.d/docman', '/var/log/docman/*.log {\n  weekly\n  rotate 8\n  compress\n  missingok\n  notifempty\n  copytruncate\n  su docman docman\n}\n')

def operations(c):
    managed('/etc/systemd/system/docman-audit-verify.service', '''[Unit]
Description=Verify DocMan audit chain
After=mongod.service
[Service]
Type=oneshot
WorkingDirectory=/var/www/docman/backend
ExecStart=/usr/bin/flock -w 3600 /run/lock/docman-maintenance.lock /usr/sbin/runuser -u docman -- /usr/bin/node --env-file=/var/www/docman/backend/.env.prod /var/www/docman/backend/src/scripts/verifyAuditChain.js
TimeoutStartSec=infinity
UMask=0077
''')
    managed('/etc/systemd/system/docman-audit-verify.timer', '''[Unit]
Description=Daily DocMan audit verification
[Timer]
OnCalendar=*-*-* 04:00:00
Persistent=true
[Install]
WantedBy=timers.target
''')
    if c['backup_repository'] == 'none': return
    Path('/etc/docman').mkdir(mode=0o700, exist_ok=True)
    managed('/etc/docman/mongodump.yml', 'uri: ' + json.dumps(database_uri(c, 'backup')) + '\n', 0o600)
    managed('/etc/docman/restic-password', c['restic_password'] + '\n', 0o600)
    managed('/etc/docman/restic-repository', c['backup_repository'] + '\n', 0o600)
    managed('/usr/local/sbin/docman-backup', (Path(__file__).parent / 'backup.sh').read_text(), 0o700)
    managed('/etc/systemd/system/docman-backup.service', '[Unit]\nDescription=Consistent encrypted DocMan backup\n[Service]\nType=oneshot\nExecStart=/usr/local/sbin/docman-backup\nTimeoutStartSec=infinity\nUMask=0077\n')
    managed('/etc/systemd/system/docman-backup.timer', '[Unit]\nDescription=Daily DocMan backup\n[Timer]\nOnCalendar=*-*-* 03:00:00\nPersistent=true\n[Install]\nWantedBy=timers.target\n')

def restic_init(c):
    env = {**os.environ, 'RESTIC_REPOSITORY': c['backup_repository'], 'RESTIC_PASSWORD_FILE': '/etc/docman/restic-password'}
    repo = c['backup_repository']
    command = ['restic']
    if repo.startswith('sftp:'):
        # Enforce noninteractive, pinned-host SSH for restic itself, including SFTP-only accounts.
        command += ['-o', 'sftp.args=-oBatchMode=yes -oStrictHostKeyChecking=yes']
    else:
        path = Path(repo)
        if not path.is_dir(): stop('Backup destination must be an existing mounted directory.')
        if path.stat().st_dev == Path('/').stat().st_dev: stop('Backup destination is on the root filesystem. Mount separate backup storage first.')
    result = subprocess.run(command + ['snapshots','--json'], env=env, capture_output=True)
    if result.returncode:
        if not c['restic_new']: stop('Cannot open existing restic repository. Check credentials/storage; no initialization attempted.')
        # restic init refuses to overwrite an initialized repository.
        run(command + ['init'], env=env)
    run(command + ['check'], env=env)

def health(c):
    for route, expected in [('/', '200'), ('/api/docs', '401')]:
        result = subprocess.check_output(['curl','--noproxy','*','--retry','5','--retry-delay','2','--retry-connrefused','--connect-timeout','10','--max-time','30','--silent','--show-error','--output','/dev/null','--write-out','%{http_code}', '--resolve', c['hostname'] + ':443:127.0.0.1', 'https://' + c['hostname'] + route], text=True)
        if result != expected: stop(f'HTTPS {route}: expected {expected}, received {result}.')
    redirect = subprocess.check_output(['curl','--noproxy','*','--max-time','30','--silent','--show-error','--output','/dev/null','--write-out','%{http_code} %{redirect_url}', '--resolve', c['hostname'] + ':80:127.0.0.1', 'http://' + c['hostname'] + '/'], text=True)
    if redirect != '301 https://' + c['hostname'] + '/': stop('HTTP did not redirect to the expected HTTPS website.')
    print('PASS: HTTP redirects to HTTPS; trusted HTTPS frontend 200 and unauthenticated API 401.')

def finish(c):
    versions = subprocess.check_output(['dpkg-query', '-W', '-f=${Package} ${Version}\n', 'nodejs', 'npm', 'mongodb-org-server', 'redis-server', 'apache2', 'restic'], text=True)
    report = f'''DocMan installer completed service checks.
Website: https://{c['hostname']}
Installed source commit: {c['commit']}
Administrator username: {c['person']['username']}
PASS: authenticated MongoDB/Redis and rejected anonymous access; Vue build;
application bootstrap/migration; audit verification; HTTPS frontend 200/API 401.
Required browser checks: login, second account, assignment, upload, separate-user
approval (if enabled), download and checksum, access denial, Activity and audit.
Email is DISABLED until a superadmin configures System Settings > Outgoing email.
Confirm relay authorization/TLS/sender details with mail administrators and test delivery.
Backup status: {'DEFERRED; POC ONLY. Configure backups before production.' if c['backup_repository'] == 'none' else 'Initial restic backup completed and daily timer installed. Isolated restore drill is still required.'}
Export /var/www/docman/backend/.env.prod securely to the approved secret store,
separate from the backup repository. It contains the document encryption master key.
The backup deliberately excludes environment files and TLS private keys. A database
and files restore without the original environment/master key is insufficient.
TLS mode: {c['tls_mode']}. Self-signed/organization certificates require client trust
and an owner for renewal; Lets Encrypt uses certbot.timer.
Check DNS from the actual workstation. Local --resolve checks do not prove client DNS.
Firewall rules were NOT changed. NOC must permit required HTTPS and administration access.
Review dependency audit findings; installation success does not imply a clean audit.
Root-only resumable installer state contains credentials: protect it as a secret.
The installer is not an updater; follow Ubuntu walkthrough section 19 for updates.
Installed package versions:
{versions}
'''
    atom(STATE / 'RESULTS.txt', report)
    c['person'].pop('password', None)
    save(c)
    (STATE / 'complete').touch(mode=0o600)
    print(report)

def main():
    global STATE
    if os.geteuid() != 0: stop('Installer configuration requires root.')
    action = sys.argv[1]
    STATE = Path(sys.argv[2])
    if STATE != Path('/var/lib/docman-installer'): stop('Unexpected installer state path.')
    if action == 'prompt': return prompt()
    c = load()
    if action == 'get':
        key = sys.argv[3]
        if key not in ['tls_mode', 'hostname', 'backup_repository']: stop('Cannot print secret configuration.')
        print(c[key]); return
    if action == 'repository':
        managed('/etc/apt/sources.list.d/mongodb-org-9.0.list', 'deb [arch=amd64 signed-by=/usr/share/keyrings/mongodb-server-9.gpg] https://repo.mongodb.org/apt/ubuntu resolute/mongodb-org/9.0 multiverse\n')
    elif action == 'time':
        if c['ntp'] != 'default':
            managed('/etc/chrony/chrony.conf', f'server {c["ntp"]} iburst\ndriftfile /var/lib/chrony/chrony.drift\nmakestep 1.0 3\nrtcsync\n', package_default=True)
    elif action == 'databases': databases(c)
    elif action == 'mongo': mongo(c)
    elif action == 'redis-check': redis_check(c)
    elif action == 'application': application(c)
    elif action == 'bootstrap':
        run(['runuser','-u','docman','--','env','NODE_ENV=production','/usr/bin/node','--env-file='+str(APP/'backend/.env.prod'),str(APP/'scripts/install/bootstrap.mjs')], input=json.dumps({'person': c['person'], 'uploadMB': c['upload_mb']}), text=True)
    elif action == 'certificates': certificates(c)
    elif action == 'verify-certificate': verify_certificate(c)
    elif action == 'services': services(c)
    elif action == 'operations': operations(c)
    elif action == 'restic-init': restic_init(c)
    elif action == 'health': health(c)
    elif action == 'finish': finish(c)
    elif action == 'acme':
        managed('/etc/apache2/sites-available/docman-acme.conf', f'<VirtualHost *:80>\nServerName {c["hostname"]}\nDocumentRoot /var/www/letsencrypt\n<Directory /var/www/letsencrypt>\nRequire all granted\n</Directory>\n</VirtualHost>\n')
    elif action == 'certbot':
        run(['certbot','certonly','--webroot','-w','/var/www/letsencrypt','-d',c['hostname'],'--email',c['certificate_email'],'--agree-tos','--non-interactive','--keep-until-expiring'])
        managed('/etc/letsencrypt/renewal-hooks/deploy/docman-apache', '#!/bin/sh\napache2ctl configtest && systemctl reload apache2\n', 0o755)
    else: stop('Unknown installer stage.')

if __name__ == '__main__':
    try: main()
    except (RuntimeError, OSError, subprocess.CalledProcessError, ValueError) as error:
        # Never include subprocess output, input, config values or credential-bearing URIs.
        if isinstance(error, RuntimeError): print('STOP:', str(error), file=sys.stderr)
        else: print('STOP: configuration step failed (' + type(error).__name__ + '). Inspect the preceding non-secret diagnostic; state is preserved.', file=sys.stderr)
        sys.exit(1)
