import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock

spec=importlib.util.spec_from_file_location('apache_setup',Path(__file__).with_name('configure_web_apache.py'))
apache=importlib.util.module_from_spec(spec);spec.loader.exec_module(apache)
STANDARD='''<VirtualHost *:443>
    ProxyRequests Off
    RewriteCond %{REQUEST_URI} !^/(api|uploads)(/|$)
    RewriteRule ^ /index.html [L]
</VirtualHost>
'''

class ApacheSetupTests(unittest.TestCase):
    def test_standard_and_repeat_install(self):
        with tempfile.TemporaryDirectory() as directory:
            config=Path(directory)/'docman.conf';include=Path(directory)/'proxy.conf'
            config.write_text(STANDARD);validate=Mock()
            apache.configure(config,include,validate)
            first=config.read_bytes();self.assertIn(b'api|uploads|_docman-update',first)
            self.assertEqual(config.read_text().count(apache.INCLUDE),1)
            apache.configure(config,include,validate)
            self.assertEqual(first,config.read_bytes());self.assertEqual(validate.call_count,2)
    def test_unsupported_layout_does_not_write_either_file(self):
        for text in [STANDARD.replace('RewriteCond','CustomCondition'),STANDARD.replace(':443',':80')]:
            with tempfile.TemporaryDirectory() as directory:
                config=Path(directory)/'docman.conf';include=Path(directory)/'proxy.conf'
                config.write_text(text);include.write_text('operator configuration');validate=Mock()
                with self.assertRaises(ValueError):apache.configure(config,include,validate)
                self.assertEqual(config.read_text(),text);self.assertEqual(include.read_text(),'operator configuration')
                validate.assert_not_called()
    def test_failed_validation_restores_current_files_not_old_backup(self):
        for existing in [True,False]:
            with tempfile.TemporaryDirectory() as directory:
                config=Path(directory)/'docman.conf';include=Path(directory)/'proxy.conf'
                config.write_text(STANDARD+'# current operator changes\n');config.chmod(0o640)
                original=config.read_bytes()
                config.with_name('docman.conf.before-web-updater').write_text('obsolete backup')
                if existing:include.write_text('current include');include.chmod(0o600)
                def validate():
                    self.assertIn(apache.INCLUDE,config.read_text())
                    raise RuntimeError('configtest failed')
                with self.assertRaises(RuntimeError):apache.configure(config,include,validate)
                self.assertEqual(config.read_bytes(),original);self.assertEqual(config.stat().st_mode & 0o777,0o640)
                if existing:
                    self.assertEqual(include.read_text(),'current include');self.assertEqual(include.stat().st_mode & 0o777,0o600)
                else:self.assertFalse(include.exists())
