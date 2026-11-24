"""Run as root in a disposable Linux environment to verify private installer execution."""
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest


@unittest.skipUnless(os.geteuid() == 0, 'requires root for ownership and unprivileged attack simulation')
class InstallerExecutionTests(unittest.TestCase):
    def test_build_user_cannot_change_running_private_copy(self):
        source = Path(__file__).parents[2].joinpath('install.sh').read_text()
        start = source.index('if [[ "${BASH_SOURCE[0]}" != "$STATE/runner/install.sh" ]]; then\n  install')
        block = source[start:source.index('\nfi', start) + 3]
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            root.chmod(0o755)
            state = root / 'state'
            (state / 'runner').mkdir(parents=True, mode=0o700)
            state.chmod(0o700)
            checkout = root / 'checkout'
            checkout.mkdir(mode=0o755)
            script = checkout / 'install.sh'
            attack = 'from pathlib import Path; import sys; Path(sys.argv[1]).write_text("echo COMPROMISED\\n");\ntry: Path(sys.argv[2]).write_text("echo COMPROMISED\\n")\nexcept PermissionError: sys.exit(0)\nsys.exit(1)'
            script.write_text('set -eu\nROOT=' + shlex.quote(str(checkout)) + '\nSTATE=' + shlex.quote(str(state)) + '\n' + block + '\n' +
                'runuser -u nobody -- python3 -c ' + shlex.quote(attack) + ' "$ROOT/install.sh" "$STATE/runner/install.sh"\n' +
                "printf 'ORIGINAL PRIVATE SCRIPT FINISHED\\n'\n")
            script.chmod(0o666)
            result = subprocess.run(['bash', str(script)], capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), 'ORIGINAL PRIVATE SCRIPT FINISHED')
            self.assertEqual(script.read_text(), 'echo COMPROMISED\n')
            private = state / 'runner/install.sh'
            self.assertEqual(private.stat().st_uid, 0)
            self.assertEqual(private.stat().st_mode & 0o777, 0o700)


if __name__ == '__main__': unittest.main()
