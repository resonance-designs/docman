"""Run on Linux: python3 -m unittest discover -s scripts/install -p 'test_*.py' -v."""
import importlib.util
import json
import os
from pathlib import Path
import secrets
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import unquote, urlsplit

spec = importlib.util.spec_from_file_location('installer', Path(__file__).with_name('configure.py'))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)

class ConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.state = self.root / 'state'
        self.state.mkdir(mode=0o700)
        self.app = self.root / 'app'
        self.app.mkdir()
        self.patches = [patch.object(installer, 'STATE', self.state), patch.object(installer, 'APP', self.app)]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

    def test_hostname_rejects_config_injection(self):
        for name in ['https://example.org', 'x\nServerName evil', '-x.example', 'x..org', 'x.org/anything', '*.example.org', 'x;id']:
            self.assertFalse(installer.host_valid(name), name)
        self.assertTrue(installer.host_valid('docman-dev.doh.nm.gov'))
        self.assertTrue(installer.host_valid('192.0.2.10'))

    def test_backup_destinations_accept_ssh_aliases_and_reject_injection(self):
        for value in ['none', '/mnt/backup/docman', 'sftp:docman-backup:/home/docmanbackup/repository', 'sftp:backup@backup.example.org:/repository']:
            self.assertTrue(installer.backup_repository_valid(value), value)
        for value in ['sftp:-oProxyCommand:/repository', 'sftp:x:/repo;id', '/mnt/backup\nsecret', 'http://example.org']:
            self.assertFalse(installer.backup_repository_valid(value), value)

    def test_password_length_bytes_and_control_characters(self):
        self.assertFalse(installer.password_valid('a' * 17))
        self.assertTrue(installer.password_valid(secrets.token_hex(32)))
        self.assertFalse(installer.password_valid('é' * 37))
        self.assertFalse(installer.password_valid('x' * 20 + '\x1b[200~'))
        self.assertFalse(installer.password_valid('x' * 20 + '\n'))
        self.assertTrue(installer.password_valid(' A@ #!"\\é' + secrets.token_hex(10)))

    def test_uri_roundtrip_preserves_special_characters(self):
        password = ' @()#!$%/?:\\"é' + secrets.token_hex(8)
        c = {'mongo_app_password': password, 'mongo_backup_password': password}
        for kind, username, auth in [('app', 'docman_app', 'docman'), ('backup', 'docman_backup', 'admin')]:
            parsed = urlsplit(installer.database_uri(c, kind))
            self.assertEqual(unquote(parsed.password), password)
            self.assertEqual(parsed.username, username)
            self.assertEqual(parsed.query, 'authSource=' + auth)
            self.assertNotIn(password, installer.database_uri(c, kind))

    def test_managed_preserves_unrecognized_file(self):
        target = self.root / 'existing.conf'
        target.write_text('owned by administrator')
        with self.assertRaises(RuntimeError): installer.managed(target, 'replacement')
        self.assertEqual(target.read_text(), 'owned by administrator')

    def test_package_default_saved_and_retry_cannot_overwrite_edits(self):
        target = self.root / 'package.conf'
        target.write_text('package default')
        installer.managed(target, 'generated', package_default=True)
        self.assertEqual(next(self.state.glob('*.original')).read_text(), 'package default')
        installer.managed(target, 'generated', package_default=True)
        target.write_text('operator correction')
        with self.assertRaises(RuntimeError): installer.managed(target, 'generated', package_default=True)
        self.assertEqual(target.read_text(), 'operator correction')

    def test_identical_existing_file_gets_resume_marker(self):
        target = self.root / 'package.conf'
        target.write_text('generated')
        installer.managed(target, 'generated', package_default=True)
        target.write_text('changed')
        with self.assertRaises(RuntimeError): installer.managed(target, 'generated', package_default=True)

    def test_symlink_is_never_replaced(self):
        original = self.root / 'original'
        original.write_text('keep')
        target = self.root / 'symlink'
        target.symlink_to(original)
        with self.assertRaises(RuntimeError): installer.managed(target, 'replacement')
        self.assertEqual(original.read_text(), 'keep')

    def test_state_and_secret_file_permissions(self):
        c = {'document_key': secrets.token_hex(32)}
        installer.save(c)
        self.assertEqual(installer.load(), c)
        self.assertEqual((self.state / 'state.json').stat().st_mode & 0o777, 0o600)
        with patch('builtins.input', side_effect=AssertionError('must not reprompt')), patch.object(installer.secrets, 'token_hex', side_effect=AssertionError('must not rotate')):
            installer.prompt()
        self.assertEqual(installer.load(), c)

    def test_interrupted_atomic_write_does_not_truncate_target(self):
        target = self.root / 'secret'
        target.write_text('keep')
        target.with_name('secret.docman-new').write_text('interrupted')
        with self.assertRaises(FileExistsError): installer.atom(target, 'replacement')
        self.assertEqual(target.read_text(), 'keep')

    def test_application_config_contains_no_raw_credentials(self):
        pwd = ' @#$%()' + secrets.token_hex(12)
        c = dict(mongo_app_password=pwd, redis_password=pwd, jwt=secrets.token_hex(64),
                 hostname='docman.example.org', approvals=True, document_key=secrets.token_hex(32), email_key=secrets.token_hex(32))
        with patch.object(installer.grp, 'getgrnam') as group, patch.object(installer.os, 'chown'):
            group.return_value.gr_gid = 123
            installer.application(c)
        env = (self.app / 'backend/.env.prod').read_text()
        self.assertNotIn(pwd, env)
        self.assertIn('NODE_HOST=127.0.0.1\n', env)
        self.assertIn('LOCAL_SELF_REGISTRATION_ENABLED=false\n', env)
        self.assertIn('DOCUMENT_ENCRYPTION_KEY=' + c['document_key'], env)
        vue = (self.app / 'frontend-vue/.env.production').read_text()
        self.assertEqual(vue, 'VITE_AUTHENTIK_ENABLED=false\n')
        self.assertEqual((self.app / 'backend/.env.prod').stat().st_mode & 0o777, 0o640)

    def test_existing_repository_failure_never_initializes(self):
        c = {'backup_repository': 'sftp:backup@example.org:/backups', 'restic_new': False}
        with patch.object(installer, 'run') as run, patch.object(installer.subprocess, 'run') as subprocess_run:
            subprocess_run.return_value.returncode = 1
            with self.assertRaises(RuntimeError): installer.restic_init(c)
            run.assert_not_called()

    def test_backup_on_root_filesystem_is_rejected(self):
        c = {'backup_repository': str(self.root), 'restic_new': True}
        with patch.object(installer, 'run') as run:
            with self.assertRaises(RuntimeError): installer.restic_init(c)
            run.assert_not_called()

    def test_failed_https_check_never_reports_success(self):
        with patch.object(installer.subprocess, 'check_output', return_value='503'):
            with self.assertRaises(RuntimeError): installer.health({'hostname': 'docman.example.org'})

    def test_https_checks_validate_certificate_and_expected_responses(self):
        with patch.object(installer.subprocess, 'check_output', side_effect=['200','401','301 https://docman.example.org/']) as check:
            installer.health({'hostname': 'docman.example.org'})
            for call in check.call_args_list:
                self.assertNotIn('-k', call.args[0])
                self.assertNotIn('--insecure', call.args[0])

if __name__ == '__main__': unittest.main()
