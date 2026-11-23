"""Exercise backup control flow with isolated command doubles; no services or repositories touched."""
import json
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest


class BackupTests(unittest.TestCase):
    def run_backup(self, state='active', failure=False):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            staging = root / 'staging'
            staging.mkdir()
            log = root / 'calls'
            stub = '''#!/usr/bin/env python3
import json, os, sys
name=os.path.basename(sys.argv[0])
with open(os.environ['CALLS'], 'a') as f: f.write(json.dumps([name, *sys.argv[1:]])+'\\n')
if name=='systemctl' and sys.argv[1]=='show': print(os.environ['SERVICE_STATE'])
if name=='restic' and sys.argv[1]=='backup' and os.environ['FAIL_BACKUP']=='yes': sys.exit(3)
'''
            for name in ('systemctl', 'mongodump', 'restic', 'git'):
                path = root / name
                path.write_text(stub)
                path.chmod(0o700)
            source = Path(__file__).with_name('backup.sh').read_text()
            body = source[source.index('restart_backend=false'):]
            script = 'set -Eeuo pipefail\nRESTIC_OPTIONS=()\nSTAGING=' + shlex.quote(str(staging)) + '\n' + body
            result = subprocess.run(['bash', '-c', script], env={**os.environ, 'PATH': str(root) + ':' + os.environ['PATH'],
                'CALLS': str(log), 'SERVICE_STATE': state, 'FAIL_BACKUP': 'yes' if failure else 'no'}, capture_output=True, text=True)
            return result, [json.loads(line) for line in log.read_text().splitlines()]

    def test_pending_restart_is_cancelled_before_capture_and_restored(self):
        result, calls = self.run_backup('activating')
        self.assertEqual(result.returncode, 0, result.stderr)
        stop = calls.index(['systemctl', 'stop', 'docman-backend'])
        dump = next(i for i, c in enumerate(calls) if c[0] == 'mongodump')
        self.assertLess(stop, dump)
        self.assertIn(['systemctl', 'start', 'docman-backend'], calls)

    def test_inactive_service_is_not_started(self):
        result, calls = self.run_backup('inactive')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn(['systemctl', 'start', 'docman-backend'], calls)
        self.assertNotIn(['systemctl', 'stop', 'docman-backend'], calls)

    def test_partial_snapshot_never_enters_retention(self):
        result, calls = self.run_backup(failure=True)
        self.assertEqual(result.returncode, 3)
        backup = next(c for c in calls if c[:2] == ['restic', 'backup'])
        self.assertTrue(backup[3].startswith('docman-pending-'))
        self.assertFalse(any(c[:2] in (['restic', 'tag'], ['restic', 'forget']) for c in calls))
        self.assertIn(['systemctl', 'start', 'docman-backend'], calls)

    def test_success_promotes_only_its_unique_pending_snapshot(self):
        result, calls = self.run_backup()
        self.assertEqual(result.returncode, 0, result.stderr)
        backup = next(c for c in calls if c[:2] == ['restic', 'backup'])
        tag = ['restic', 'tag', '--tag', backup[3], '--add', 'docman', '--remove', backup[3]]
        self.assertIn(tag, calls)
        self.assertLess(calls.index(tag), next(i for i, c in enumerate(calls) if c[:2] == ['restic', 'forget']))


if __name__ == '__main__': unittest.main()
