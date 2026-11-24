"""Optional real Apache log test on loopback; no installed configuration is changed."""
import http.client
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import unittest


@unittest.skipUnless(shutil.which('apache2') and Path('/usr/lib/apache2/modules/mod_mpm_event.so').exists(), 'requires local Apache')
class ApacheLogsTests(unittest.TestCase):
    def test_public_path_query_and_referrer_credentials_are_not_logged(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with socket.socket() as probe:
                probe.bind(('127.0.0.1', 0))
                port = probe.getsockname()[1]
            template = Path(__file__).with_name('docman.conf.template').read_text()
            log_format = next(line for line in template.splitlines() if line.startswith('LogFormat '))
            config = root / 'httpd.conf'
            config.write_text(f'''ServerRoot "{root}"
ServerName localhost
Listen 127.0.0.1:{port}
PidFile "{root}/pid"
ErrorLog "{root}/error.log"
LoadModule mpm_event_module /usr/lib/apache2/modules/mod_mpm_event.so
LoadModule authz_core_module /usr/lib/apache2/modules/mod_authz_core.so
DocumentRoot "{root}"
<Directory "{root}">
Require all granted
</Directory>
{log_format}
CustomLog "{root}/access.log" docman_safe
''')
            child = subprocess.Popen(['apache2', '-X', '-f', str(config)], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            try:
                for _ in range(50):
                    self.assertIsNone(child.poll(), 'isolated Apache must own the listener')
                    try:
                        with socket.create_connection(('127.0.0.1', port), timeout=.2): break
                    except OSError: time.sleep(.05)
                secret = 'fixture-bearer-credential'
                for path in (f'/public/documents/{secret}', f'/api/docs/public/{secret}/download'):
                    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
                    connection.request('GET', path + '?token=' + secret, headers={'Referer': 'https://example.invalid/public/documents/' + secret})
                    response = connection.getresponse()
                    response.read()
                    connection.close()
                child.terminate()
                child.wait(timeout=5)
                logged = (root / 'access.log').read_text()
                self.assertNotIn(secret, logged)
                self.assertEqual(logged.count('GET HTTP/1.1'), 2)
                self.assertIn('404', logged)
            finally:
                if child.poll() is None:
                    child.kill()
                    child.wait(timeout=5)
                child.stderr.close()


if __name__ == '__main__': unittest.main()
