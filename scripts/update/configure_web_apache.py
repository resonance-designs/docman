"""Validate the supported vhost layout and roll back this invocation on failure."""
import os
from pathlib import Path
import re
import subprocess
import tempfile

INCLUDE = 'Include /etc/docman/web-updater-apache.conf'
PROXY = '''# Read-only progress socket. Control socket is never proxied by Apache.
ProxyPass /_docman-update/ unix:/run/docman-web-updater/progress.sock|http://localhost/ timeout=15
ProxyPassReverse /_docman-update/ http://localhost/
<Location /_docman-update/>
    Header always set Cache-Control "no-store"
    Header always set Referrer-Policy "no-referrer"
</Location>
'''

def prepare(text):
    hosts = list(re.finditer(r'<VirtualHost\s+[^>]*:443\s*>.*?</VirtualHost>', text, re.S | re.I))
    if len(hosts) != 1:
        raise ValueError('STOP: expected one HTTPS VirtualHost; configure the progress proxy manually.')
    host = hosts[0]; block = host.group()
    if len(re.findall(r'^\s*ProxyRequests Off\s*$', block, re.M)) != 1:
        raise ValueError('STOP: expected one ProxyRequests Off in the HTTPS VirtualHost.')
    pattern = r'^(\s*RewriteCond %\{REQUEST_URI\} !\^/\()api\|uploads(?:\|_docman-update)?(\)(?:\(/\|\$\))?\s*)$'
    if len(re.findall(pattern, block, re.M)) != 1:
        raise ValueError('STOP: unsupported SPA RewriteCond; exclude /_docman-update manually using the documented layout.')
    block = re.sub(pattern, lambda m: m[1]+'api|uploads|_docman-update'+m[2], block, flags=re.M)
    if INCLUDE not in block:
        if INCLUDE in text:
            raise ValueError('STOP: updater Include is outside the supported HTTPS VirtualHost.')
        block = block.replace('ProxyRequests Off', 'ProxyRequests Off\n    '+INCLUDE, 1)
    elif block.count(INCLUDE) != 1:
        raise ValueError('STOP: duplicate updater Include.')
    return text[:host.start()]+block+text[host.end():]

def atomic_write(path, data, mode):
    fd, name = tempfile.mkstemp(dir=path.parent, prefix='.'+path.name+'.')
    try:
        with os.fdopen(fd, 'wb') as stream: stream.write(data)
        os.chmod(name, mode)
        os.replace(name, path)
    finally:
        Path(name).unlink(missing_ok=True)

def configure(config, include, validate):
    original = config.read_bytes()
    updated = prepare(original.decode()).encode()  # Validate before any configuration write.
    paths = (config, include)
    snapshots = {p: (p.read_bytes(), p.stat().st_mode & 0o777) if p.exists() else None for p in paths}
    backup = config.with_name(config.name+'.before-web-updater')
    if not backup.exists(): atomic_write(backup, original, 0o600)
    try:
        atomic_write(include, PROXY.encode(), snapshots[include][1] if snapshots[include] else 0o644)
        atomic_write(config, updated, snapshots[config][1])
        validate()
    except BaseException:
        for path, snapshot in snapshots.items():
            if snapshot is None: path.unlink(missing_ok=True)
            else: atomic_write(path, *snapshot)
        raise

if __name__ == '__main__':
    try:
        configure(Path('/etc/apache2/sites-available/docman.conf'), Path('/etc/docman/web-updater-apache.conf'),
                  lambda: subprocess.run(['apache2ctl', 'configtest'], check=True))
    except Exception as error:
        raise SystemExit(f'STOP: Apache setup failed; configuration edits were not retained: {error}') from error
