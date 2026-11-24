#!/usr/bin/env python3
"""Interactive standard-layout updater. No third-party Python dependencies.
Never source environment files, run npm as root, discard edits, or roll back only code.
"""
import argparse
import fcntl
import getpass
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import secrets
import shutil
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlsplit

APP = Path('/var/www/docman')
ENV = APP / 'backend/.env.prod'
VUE_ENV = APP / 'frontend-vue/.env.production'
UPLOADS = Path('/var/lib/docman/uploads')
PUBLIC = Path('/var/www/html/docman/public_html')
STATE = Path('/var/lib/docman-updates')
BUILDS = Path('/var/www/docman-update-builds')
TIMERS = ('docman-backup.timer', 'docman-audit-verify.timer')
KEYS = ('DOCUMENT_ENCRYPTION_KEY', 'EMAIL_SETTINGS_KEY')
RESTIC_REPOSITORY_FILE = Path('/etc/docman/restic-repository')
RESTIC_PASSWORD_FILE = Path('/etc/docman/restic-password')

class Stop(RuntimeError): pass

class Cancelled(KeyboardInterrupt): pass

def cancel_update(signum, frame):
    # Recovery must not itself be interrupted by repeated termination requests.
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    raise Cancelled('Update cancelled by SIGTERM')

def run_command(args, **kwargs):
    """Reap the command and terminate its process group before recovery can run."""
    input_value = kwargs.pop('input', None)
    previous = {sig: signal.getsignal(sig) for sig in (signal.SIGTERM, signal.SIGINT)}
    pending = []
    def defer_cancel(signum, frame):
        if previous[signum] != signal.SIG_IGN:
            pending.append(signum)
    def restore_handlers():
        for sig, handler in previous.items():
            signal.signal(sig, handler)
    try:
        # Do not mask signals: a blocked mask would survive exec in the child.
        # Python handlers reset on exec; defer only the parent's cancellation until
        # Popen returns and cleanup owns the process, including its constructor gap.
        for sig in previous:
            signal.signal(sig, defer_cancel)
        child = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                 stderr=subprocess.PIPE, start_new_session=True, **kwargs)
    except BaseException:
        restore_handlers()
        if pending: signal.raise_signal(pending[0])
        raise
    with child:
        try:
            restore_handlers()
            if pending: signal.raise_signal(pending[0])
            stdout, stderr = child.communicate(input_value)
        except BaseException:
            try: os.killpg(child.pid, signal.SIGTERM)
            except ProcessLookupError: pass
            try: child.communicate(timeout=5)
            except subprocess.TimeoutExpired: pass
            finally:
                try: os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError: pass
                child.communicate()
            raise
        return subprocess.CompletedProcess(args, child.returncode, stdout, stderr)

def validate_backup_destination(destination):
    destination = Path(destination).resolve()
    for tree in (APP, PUBLIC, BUILDS, STATE, UPLOADS):
        tree = tree.resolve()
        require(not (destination.is_relative_to(tree) or tree.is_relative_to(destination)),
                'Backup repository overlaps an application, staging, state or upload tree. Choose separate storage.')
    return destination

def same_backup_repository(selected, saved):
    if selected.startswith('/') and saved.startswith('/'):
        return Path(selected).resolve() == Path(saved).resolve()
    return selected == saved

def require(condition, message):
    if not condition: raise Stop(message)

def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def private_write(path, value):
    path = Path(path)
    require(not path.is_symlink(), 'Refusing a symlink for a private state file.')
    temporary = path.with_name(path.name + '.new')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, 'w') as output: output.write(value)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)

def valid_ref(value): return bool(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._/-]{0,200}', value))

def validate_target_paths(entries):
    protected = ('backend/.env.prod','frontend-vue/.env.production','backend/logs','backend/uploads',
                 'backend/node_modules','frontend-vue/node_modules','frontend-vue/dist')
    for mode, name in entries:
        require(not any(name == path or name.startswith(path+'/') for path in protected),
                'Target tracks protected configuration/data/build paths; routine update refused.')
        require(not (mode == '120000' and (name in ('backend','frontend-vue') or name.startswith(('backend/','frontend-vue/')))),
                'Target contains an application symlink; routine update requires manual review.')

def migration_summary(output):
    lines = [line for line in output.splitlines() if line.startswith('[migrateComplianceFields]') and ' complete.' in line]
    require(bool(lines), 'Migration did not report its completion summary.')
    summary = json.loads(lines[-1][lines[-1].index('{'):])
    require(type(summary.get('missingFiles')) is int and summary['missingFiles'] == 0,
            'Migration reports missing stored files. Service remains stopped; recover/investigate before proceeding.')
    return summary

def prepare_environment(original, values, encrypted_counts):
    """Append only missing machine keys; existing bytes/keys are never replaced."""
    additions = {}
    for key, count in zip(KEYS, encrypted_counts):
        if values.get(key):
            require(bool(re.fullmatch(r'[a-fA-F0-9]{64}', values[key])), f'{key} is invalid. Restore the original valid key; do not replace it.')
        else:
            require(count == 0, f'{key} is missing but encrypted data exists. Recover the ORIGINAL key before updating.')
            # An explicitly empty assignment is not silently shadowed by a duplicate variable.
            require(not re.search(r'^\s*(?:export\s+)?' + key + r'\s*=', original, re.M),
                    f'{key} has an empty assignment. Resolve that configuration explicitly before updating.')
            additions[key] = secrets.token_hex(32)
    suffix = ''.join(f'{key}={value}\n' for key, value in additions.items())
    return original + ('\n' if suffix and original and not original.endswith('\n') else '') + suffix, list(additions)

def transaction(ops):
    """Backup precedes every source/config/database mutation, including dry-run indexes."""
    mutated = False
    try:
        ops.pause()
        ops.backup()
        # Persist uncertainty BEFORE the first write: a failed switch may have partially applied.
        ops.mark_mutating()
        mutated = True
        ops.deploy()
        ops.migrate()
        ops.publish()
        ops.start()
        ops.health()
        ops.restore_timers()
        ops.complete()
    except BaseException:
        if mutated:
            ops.quarantine()
        else:
            ops.restore_original()
        raise

class Updater:
    def __init__(self):
        self.report = {'schema': 1, 'status': 'preflight', 'browser_tests': 'NOT RUN'}
        self.run_dir = None
        self.timer_states = {}
        self.paused = False
        self.backend_stopped = False
        self.lock = None

    def interactive(self): return sys.stdin.isatty()
    def ask(self, prompt): return input(prompt)
    def ask_password(self, prompt): return getpass.getpass(prompt)

    def say(self, stage):
        self.report['stage'] = stage
        print('\n== ' + stage + ' ==', flush=True)
        self.save()

    def save(self):
        if self.run_dir: private_write(self.run_dir / 'report.json', json.dumps(self.report, indent=2) + '\n')

    def run(self, args, *, input=None, cwd=None, env=None, check=True, binary=False):
        result = run_command(args, input=input, cwd=cwd, env=env, text=not binary)
        if self.run_dir:
            try:
                with (self.run_dir / 'commands.log').open('a') as log:
                    # No argv/environment logging. Diagnostics are private and may contain secrets.
                    log.write(f'\n[{self.report.get("stage")}] exit={result.returncode}\n')
                    output = result.stdout + result.stderr
                    log.write(output.decode(errors='replace') if binary else output)
            except OSError:
                # In particular, disk exhaustion must not prevent emergency service stop/restart.
                print('WARNING: could not append private diagnostics.', file=sys.stderr)
        if check: require(result.returncode == 0, 'Command failed during ' + self.report.get('stage', 'preflight') + '. Inspect the private commands.log / service journal; do not post credentials.')
        return result

    def owner_run(self, args, **kwargs):
        return self.run(['runuser', '-u', self.owner.pw_name, '--', 'env', 'HOME=' + self.owner.pw_dir,
                         'sh','-c','umask 022; exec "$@"','sh',*args], **kwargs)

    def git(self, *args): return self.owner_run(['git', '-c', 'diff.autoRefreshIndex=false', '-C', str(APP), *args]).stdout.strip()

    def snapshot_environment(self):
        original_bytes = ENV.read_bytes()
        self.original_env = original_bytes.decode('utf-8')
        self.env_hash = hashlib.sha256(original_bytes).hexdigest()
        # Parse the exact snapshot with Node's own dotenv grammar, not a second file read.
        parsed = self.run(['/usr/bin/node', '--input-type=module', '-e',
            "import {parseEnv} from 'node:util'; let input=''; for await(const chunk of process.stdin) input+=chunk; console.log(JSON.stringify(parseEnv(input)));"],
            input=self.original_env)
        self.values = json.loads(parsed.stdout)

    def active(self, unit): return self.run(['systemctl', 'is-active', '--quiet', unit], check=False).returncode == 0

    def node(self, program):
        result = self.run(['runuser','-u','docman','--','/usr/bin/node','--env-file=' + str(ENV),'--input-type=module'],
                          input=program, cwd=APP / 'backend')
        try: return json.loads(result.stdout.strip())
        except ValueError: raise Stop('Application configuration/database probe did not return valid JSON.') from None

    def preflight(self):
        self.say('Read-only deployment checks')
        os_info = dict(line.split('=',1) for line in Path('/etc/os-release').read_text().splitlines() if '=' in line)
        require(os_info.get('ID','').strip('"') == 'ubuntu' and os_info.get('VERSION_ID','').strip('"') == '26.04', 'This updater targets the documented Ubuntu 26.04 LTS deployment. OS upgrades are separate.')
        for tool in ('git','node','npm','rsync','tar','mongodump','restic','flock','curl','systemctl','apache2ctl','runuser'):
            require(shutil.which(tool), f'Missing prerequisite: {tool}. See automated-updates.md for installation commands.')
        for path in (APP, APP / '.git', ENV, VUE_ENV, UPLOADS, PUBLIC):
            require(path.exists() and path.resolve() == path, f'Expected standard path without symlink ancestors: {path}. Use the manual update guide for other layouts.')
        for path in (APP/'backend', APP/'frontend-vue', APP/'backend/node_modules', APP/'frontend-vue/node_modules', APP/'frontend-vue/dist'):
            require(not path.is_symlink(), f'Refusing a symlink at {path}.')
        require(ENV.stat().st_uid == 0 and ENV.stat().st_mode & 0o027 == 0, 'Protect .env.prod: root ownership, group docman, mode 640 (no group write/world access).')
        self.owner = pwd.getpwuid((APP / '.git').stat().st_uid)
        require(self.owner.pw_uid != 0, 'The checkout must have a non-root deployment owner; npm will not run as root.')
        require(self.git('diff', '--name-only') == '' and self.git('diff','--cached','--name-only') == '', 'Tracked files have local changes. Preserve/review them before updating; nothing will be reset.')
        untracked = self.git('ls-files','--others','--exclude-standard').splitlines()
        require(all(name == 'backend/logs' for name in untracked), 'Untracked files exist in the checkout. Preserve/review them before updating.')
        require((APP / 'backend/logs').is_symlink() and (APP / 'backend/logs').resolve() == Path('/var/log/docman'), 'Expected backend/logs symlink to /var/log/docman.')
        require(self.run(['systemctl','show','docman-backend','-p','User','--value']).stdout.strip() == 'docman', 'Backend service must run as docman.')
        require(self.run(['systemctl','show','docman-backend','-p','WorkingDirectory','--value']).stdout.strip() == str(APP / 'backend'), 'Unexpected backend WorkingDirectory; use manual deployment.')
        start = self.run(['systemctl','show','docman-backend','-p','ExecStart','--value']).stdout
        require('path=/usr/bin/node' in start and 'argv[]=/usr/bin/node /var/www/docman/backend/src/server.js ;' in start,
                'Unexpected backend ExecStart; use the manual procedure for custom services.')
        for service in ('docman-backend','apache2','mongod','redis-server'):
            require(self.active(service), service + ' is not active. Diagnose it before a routine update.')
        self.run(['apache2ctl','configtest'])
        version = self.run(['node','-p','process.versions.node']).stdout.strip().split('.')
        require(int(version[0]) == 22 and int(version[1]) >= 12, 'Node 22.12+ within 22.x is required; major upgrades are separate.')
        self.snapshot_environment()
        require(self.values['UPLOAD_DIR'] == str(UPLOADS) and self.values['NODE_PORT'] == '5001', 'Expected external uploads and backend port 5001; other layouts require manual review.')
        uri = urlsplit(self.values['MONGO_URI'])
        require(uri.scheme == 'mongodb' and uri.hostname in ('127.0.0.1','localhost') and uri.path == '/docman', 'Updater supports the documented local docman database only. Atlas/other databases require the manual procedure.')
        url = urlsplit(self.values['APP_BASE_URL'])
        require(url.scheme == 'https' and url.hostname and not url.username and not url.password and url.port in (None,443) and url.path in ('','/') and not url.query and not url.fragment, 'APP_BASE_URL must be the HTTPS site origin on port 443.')
        require(bool(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.-]*', url.hostname)), 'Invalid website hostname.')
        self.host = url.hostname
        self.vue_hash = digest(VUE_ENV)
        self.report.update(old_commit=self.git('rev-parse','HEAD'), hostname=self.host, deployment_owner=self.owner.pw_name)
        self.report['old_index_sha256'] = digest(PUBLIC/'index.html')
        self.health()
        print('PASS: clean standard-layout deployment, active services, trusted HTTPS and API authentication.')

    def prepare(self, requested_ref):
        require(self.interactive(), 'Interactive terminal required.')
        require(STATE.resolve() == STATE and BUILDS.resolve() == BUILDS, 'State/build parent must not have symlink ancestors.')
        STATE.mkdir(mode=0o700, exist_ok=True)
        require(STATE.stat().st_uid == 0 and STATE.stat().st_mode & 0o077 == 0, 'Update state must be root-owned mode 700.')
        require(not (STATE/'ACTIVE').exists(), 'An unfinished update is recorded in /var/lib/docman-updates/ACTIVE. Follow its recovery report before starting another update.')
        self.say('Fetch and select the approved release')
        self.git('fetch','--tags','origin')
        ref = requested_ref or self.ask('Approved target branch/tag/commit (for example origin/dev): ').strip()
        require(valid_ref(ref), 'Invalid reference. Enter a branch/tag or commit ID, not a shell command.')
        target = self.git('rev-parse','--verify','--end-of-options',ref + '^{commit}')
        require(bool(re.fullmatch(r'[a-f0-9]{40,64}', target)), 'Target did not resolve to a commit.')
        require(target != self.report['old_commit'], 'Selected commit is already checked out; no update performed.')
        require(self.owner_run(['git','-C',str(APP),'merge-base','--is-ancestor',self.report['old_commit'],target],check=False).returncode == 0, 'Target is not a descendant of the installed commit. Downgrades/divergent histories require manual review.')
        self.report['target_commit'] = target
        entries = [line.split(' ',1) for line in self.git('ls-tree','-r','-z','--format=%(objectmode) %(path)',target).split('\0') if line]
        validate_target_paths(entries)
        print('Installed:',self.report['old_commit'],'\nSelected: ',target,'\nNo source files have been changed.')
        counts = self.node('''import mongoose from './node_modules/mongoose/index.js';
try { await mongoose.connect(process.env.MONGO_URI);
const db=mongoose.connection.db;
console.log(JSON.stringify([await db.collection('fileprotections').countDocuments({}), await db.collection('emailsettings').countDocuments({encryptedSecrets:{$type:'string',$ne:''}})]));
} catch { process.exitCode=1; } finally { await mongoose.disconnect(); }''')
        self.next_env, new_keys = prepare_environment(self.original_env, self.values, counts)
        self.report['new_machine_keys'] = new_keys
        if new_keys: print('Missing keys will be generated once:', ', '.join(new_keys), '\nExisting files are not re-encrypted; preserve these keys in your approved secret store.')
        print('This will build first, then pause DocMan for a consistent encrypted backup and migration.\nExisting secrets, accounts, Apache configuration and service files are preserved.\nConfirm no other app processes, custom jobs or administrators will write this database/uploads during maintenance.')
        require(self.ask('Proceed with this exact release? Type UPDATE: ').strip() == 'UPDATE', 'Cancelled.')
        run_id = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + secrets.token_hex(4)
        self.run_dir = STATE / run_id
        self.run_dir.mkdir(mode=0o700)
        self.report['run_id'] = run_id
        self.report['status'] = 'preparing'
        self.save()
        private_write(self.run_dir/'environment.before', self.original_env)
        private_write(self.run_dir/'environment.after', self.next_env)
        shutil.copyfile(VUE_ENV, self.run_dir/'frontend.before')
        os.chmod(self.run_dir/'frontend.before',0o600)
        self.configure_backup()
        estimate = 1024**3
        for path, multiplier in ((UPLOADS,3),(Path('/var/lib/mongodb'),2),(PUBLIC,2),(APP/'backend/node_modules',2),(APP/'frontend-vue/node_modules',2)):
            if path.exists():
                estimate += multiplier * int(self.run(['du','-sb',str(path)]).stdout.split()[0])
        require(shutil.disk_usage(STATE).free > estimate, 'Insufficient free space for staging and recovery copies. Free capacity without deleting current data/backups, then retry.')
        self.build = BUILDS / run_id
        BUILDS.mkdir(mode=0o755, exist_ok=True)
        require(BUILDS.stat().st_uid == 0 and BUILDS.stat().st_mode & 0o022 == 0, 'Build parent must be root-owned and not group/world writable.')
        os.chmod(BUILDS,0o755)
        self.build.mkdir(mode=0o755)
        os.chown(self.build, self.owner.pw_uid, self.owner.pw_gid)
        self.say('Build the selected release without changing the live application')
        # Archive as the deployment user; extract without root privileges or git hooks.
        archive = self.build/'source.tar'
        self.owner_run(['git','-C',str(APP),'archive','--format=tar','--output='+str(archive),target])
        self.owner_run(['tar','-xf',str(archive),'-C',str(self.build)])
        archive.unlink()
        shutil.copyfile(VUE_ENV,self.build/'frontend-vue/.env.production')
        os.chown(self.build/'frontend-vue/.env.production',self.owner.pw_uid,self.owner.pw_gid)
        for directory in ('backend','frontend-vue'):
            self.owner_run(['sh','-c','umask 022; exec npm ci'],cwd=self.build/directory)
        self.owner_run(['sh','-c','umask 022; exec npm run build'],cwd=self.build/'frontend-vue')
        require((self.build/'frontend-vue/dist/index.html').is_file(), 'Build did not produce index.html.')
        for script in ('migrateComplianceFields.js','verifyAuditChain.js'):
            require((self.build/'backend/src/scripts'/script).is_file(), 'Target is missing required migration/audit tooling.')
        self.report['published_index_sha256'] = digest(self.build/'frontend-vue/dist/index.html')
        self.save()

    def configure_backup(self):
        self.say('Verify encrypted backup destination')
        repo_file = RESTIC_REPOSITORY_FILE
        default = repo_file.read_text().strip() if repo_file.is_file() else ''
        repo = self.ask('Restic repository (absolute mounted path or sftp:host:/path)' + (f' [{default}]' if default else '') + ': ').strip() or default
        require(repo.startswith('/') or re.fullmatch(r'sftp:(?:[A-Za-z0-9_][A-Za-z0-9_.-]*@)?[A-Za-z0-9][A-Za-z0-9.-]*:/[A-Za-z0-9_./-]+', repo), 'Unsupported repository address.')
        require(not any(ord(c)<32 or ord(c)==127 for c in repo), 'Invalid repository characters.')
        reuse_saved_repository = same_backup_repository(repo, default)
        if repo.startswith('/'):
            destination = Path(repo)
            require(destination.is_dir() and not destination.is_symlink(), 'Local backup destination must already exist as a real directory; see guide.')
            destination = validate_backup_destination(destination)
            repo = str(destination)
            if destination.stat().st_dev == Path('/').stat().st_dev:
                require(self.ask('This backup is on the server root disk, not disaster recovery. For an internal POC only, type LOCAL-POC: ').strip() == 'LOCAL-POC', 'Choose separate backup storage.')
                self.report['backup_scope'] = 'LOCAL POC ONLY'
        existing_password = RESTIC_PASSWORD_FILE
        if reuse_saved_repository and existing_password.is_file() and self.ask('Use the existing protected restic password file? yes/no [yes]: ').strip() in ('','yes'):
            require(existing_password.stat().st_uid == 0 and existing_password.stat().st_mode & 0o077 == 0, 'Protect the restic password file: root ownership, mode 600.')
            password = existing_password.read_text().rstrip('\n')
        else:
            password = self.ask_password('Existing repository password (or choose 18+ characters for a NEW repository): ')
            require(len(password)>=18 and not any(ord(c)<32 or ord(c)==127 for c in password), 'Use 18+ characters without control characters.')
            require(password == self.ask_password('Repeat repository password: '), 'Repository passwords differ.')
        private_write(self.run_dir/'restic-password', password+'\n')
        self.restic_env = {**os.environ,'RESTIC_REPOSITORY':repo,'RESTIC_PASSWORD_FILE':str(self.run_dir/'restic-password')}
        self.restic_command = ['restic'] + (['-o','sftp.args=-oBatchMode=yes -oStrictHostKeyChecking=yes'] if repo.startswith('sftp:') else [])
        self.report['backup_repository'] = repo
        opened = self.run(self.restic_command+['snapshots','--json'],env=self.restic_env,check=False)
        if opened.returncode:
            require(self.ask('Cannot open repository. Initialize ONLY if new/empty; type INITIALIZE or press Enter to stop: ').strip() == 'INITIALIZE', 'Backup unavailable; no deployment changes made.')
            self.run(self.restic_command+['init'],env=self.restic_env)
        self.run(self.restic_command+['check'],env=self.restic_env)
        self.save()

    def pause(self):
        self.say('Acquire maintenance lock and stop application writers')
        self.lock = open('/run/lock/docman-maintenance.lock','a')
        try: fcntl.flock(self.lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError: raise Stop('Another backup/update/audit holds the maintenance lock; wait for it to finish.') from None
        require(not (STATE/'ACTIVE').exists(), 'Another unfinished update appeared; stop and inspect its report.')
        require(self.git('rev-parse','HEAD') == self.report['old_commit'] and self.git('diff','--name-only') == '' and self.git('diff','--cached','--name-only') == '', 'Checkout changed while building; update cancelled.')
        require(digest(ENV)==self.env_hash and digest(VUE_ENV)==self.vue_hash, 'Configuration changed while building; update cancelled.')
        self.timer_states = {unit:self.active(unit) for unit in TIMERS}
        self.report['timer_states'] = self.timer_states
        self.save()
        self.paused = True
        private_write(STATE/'ACTIVE', self.report['run_id']+'\n')
        for unit, active in self.timer_states.items():
            if active: self.run(['systemctl','stop',unit])
        # A verifier may have started waiting on the lock while we acquired it.
        for unit in ('docman-audit-verify.service','docman-backup.service'):
            if self.run(['systemctl','show',unit,'-p','LoadState','--value'],check=False).stdout.strip() == 'loaded':
                self.run(['systemctl','stop',unit])
        self.backend_stopped = True
        self.run(['systemctl','stop','docman-backend'])
        require(not self.active('docman-backend'), 'Backend did not stop; no backup/migration may proceed.')

    def backup(self):
        self.say('Back up the stopped database, uploads, published site and original source')
        snapshot = self.run_dir/'snapshot'
        snapshot.mkdir(mode=0o700)
        private_write(self.run_dir/'mongodump.yml','uri: '+json.dumps(self.values['MONGO_URI'])+'\n')
        self.run(['mongodump','--config='+str(self.run_dir/'mongodump.yml'),'--db=docman','--archive='+str(snapshot/'database.archive'),'--gzip'])
        self.run(['rsync','-a',str(UPLOADS)+'/',str(snapshot/'uploads')+'/'])
        self.run(['rsync','-a',str(PUBLIC)+'/',str(snapshot/'public_html')+'/'])
        self.run(['git','-c','safe.directory='+str(APP),'-C',str(APP),'bundle','create',str(snapshot/'source.bundle'),'HEAD'])
        private_write(snapshot/'commit.txt',self.report['old_commit']+'\n')
        result = self.run(self.restic_command+['backup','--json','--tag','docman-pre-update',str(snapshot)],env=self.restic_env)
        summaries = [json.loads(line) for line in result.stdout.splitlines() if line.startswith('{')]
        ids = [row['snapshot_id'] for row in summaries if row.get('message_type')=='summary' and row.get('snapshot_id')]
        require(len(ids)==1, 'Backup did not produce a snapshot ID; update blocked.')
        self.report['backup_snapshot'] = ids[0]
        # Check repository structure again after upload; a restore drill remains separately required.
        self.run(self.restic_command+['check'],env=self.restic_env)
        self.report['backup_complete'] = True
        self.save()
        print('PASS: encrypted pre-update snapshot',ids[0])

    def mark_mutating(self):
        require(self.report.get('backup_complete'), 'Cannot modify deployment without a successful backup.')
        self.report['status']='mutating; database rollback may be required'
        self.save()

    def deploy(self):
        self.say('Select target source and install the staged dependencies')
        require(digest(ENV)==self.env_hash and digest(VUE_ENV)==self.vue_hash, 'Configuration changed after backup; refusing to overwrite.')
        self.git('switch','--no-overwrite-ignore','--detach',self.report['target_commit'])
        for directory in ('backend','frontend-vue'):
            # Narrow destination is the dependency directory only; never delete checkout/uploads.
            self.owner_run(['rsync','-a','--delete',str(self.build/directory/'node_modules')+'/',str(APP/directory/'node_modules')+'/'])
        self.owner_run(['rsync','-a','--delete',str(self.build/'frontend-vue/dist')+'/',str(APP/'frontend-vue/dist')+'/'])
        if self.next_env != self.original_env:
            before = ENV.stat()
            private_write(ENV,self.next_env)
            os.chown(ENV,before.st_uid,before.st_gid)
            os.chmod(ENV,before.st_mode & 0o777)
        require(VUE_ENV.read_bytes()==(self.run_dir/'frontend.before').read_bytes(), 'Frontend environment changed during checkout.')

    def migrate(self):
        self.say('Run migration preflight, migration and audit-chain verification')
        for args in (['src/scripts/migrateComplianceFields.js','--dry-run'],['src/scripts/migrateComplianceFields.js']):
            result = self.run(['runuser','-u','docman','--','env','NODE_ENV=production','/usr/bin/node',*args],cwd=APP/'backend')
            migration_summary(result.stdout)
        result = self.run(['runuser','-u','docman','--','env','NODE_ENV=production','/usr/bin/node','src/scripts/verifyAuditChain.js'],cwd=APP/'backend')
        require(any(line.startswith('{') and json.loads(line).get('valid') is True for line in result.stdout.splitlines() if line.startswith('{')), 'Audit chain did not verify as valid.')

    def publish(self):
        self.say('Publish the matching Vue build')
        self.run(['rsync','-a','--delete',str(self.build/'frontend-vue/dist')+'/',str(PUBLIC)+'/'])
        self.run(['chown','-R','root:root',str(PUBLIC)])
        self.run(['find',str(PUBLIC),'-type','d','-exec','chmod','0755','{}','+'])
        self.run(['find',str(PUBLIC),'-type','f','-exec','chmod','0644','{}','+'])
        self.run(['apache2ctl','configtest'])

    def start(self):
        self.say('Start the updated backend')
        self.run(['systemctl','start','docman-backend'])
        self.run(['systemctl','reload','apache2'])

    def health(self, expected_index=None):
        for attempt in range(30):
            result = self.run(['curl','--disable','--noproxy','*','--silent','--max-time','3','--output','/dev/null','--write-out','%{http_code}','http://127.0.0.1:5001/api/docs'],check=False)
            if result.returncode==0 and result.stdout=='401': break
            if attempt==29: raise Stop('Backend did not return HTTP 401; update is not healthy.')
            time.sleep(1)
        for route, expected in (('/', '200'),('/api/docs','401')):
            result=self.run(['curl','--disable','--noproxy','*','--silent','--show-error','--max-time','20','--resolve',self.host+':443:127.0.0.1','--output','/dev/null','--write-out','%{http_code}','https://'+self.host+route])
            require(result.stdout==expected, f'HTTPS {route}: expected {expected}. Certificate errors are not bypassed.')
        result=self.run(['curl','--disable','--noproxy','*','--silent','--show-error','--max-time','20','--resolve',self.host+':443:127.0.0.1','https://'+self.host+'/'],binary=True)
        expected=expected_index or self.report.get('published_index_sha256') or digest(PUBLIC/'index.html')
        require(hashlib.sha256(result.stdout).hexdigest()==expected, 'HTTPS is not serving the expected frontend index.')

    def restore_timers(self):
        # Persistent timers may fire immediately. Release the maintenance lock only after
        # the deployment/old-service health checks finish, so those jobs can run normally.
        if self.lock:
            fcntl.flock(self.lock,fcntl.LOCK_UN)
            self.lock.close()
            self.lock=None
        for unit, active in self.timer_states.items():
            if active: self.run(['systemctl','start',unit])

    def complete(self):
        require(self.git('rev-parse','HEAD')==self.report['target_commit'], 'Installed commit changed unexpectedly.')
        self.report['status']='service checks passed; browser validation pending'
        self.report['finished_utc']=datetime.now(timezone.utc).isoformat()
        self.save()
        (STATE/'ACTIVE').unlink()
        print('\nPASS: updated to',self.report['target_commit'])
        print('Report:',self.run_dir/'report.json','\nBackup snapshot:',self.report['backup_snapshot'])
        print('NEXT: browser login, permissions, upload/replacement/approval/download and email tests.\nSecurely export environment.after to your approved secret store if new keys were generated.\nPrivate logs, configuration and backup password remain in this root-only run directory; do not post them.')

    def restore_original(self):
        if not self.paused: return
        self.report['status']='failed before source/database mutation; restarting original service'
        if self.backend_stopped:
            self.run(['systemctl','start','docman-backend'])
            self.health(expected_index=self.report['old_index_sha256'])
        self.restore_timers()
        self.report['status']='failed before mutation; original service restored'
        self.save()
        (STATE/'ACTIVE').unlink(missing_ok=True)

    def quarantine(self):
        # Stop writes even when a post-start check fails. Do not restore old code over a changed DB.
        failed = []
        # A stopped backup job can restart the backend in its cleanup trap; stop it first.
        for unit in (*TIMERS,'docman-audit-verify.service','docman-backup.service','docman-backend'):
            loaded = self.run(['systemctl','show',unit,'-p','LoadState','--value'],check=False)
            if unit != 'docman-backend' and loaded.stdout.strip() == 'not-found': continue
            if self.run(['systemctl','stop',unit],check=False).returncode != 0: failed.append(unit)
        self.report['status']='FAILED after mutation; recovery required'
        self.report['stop_errors']=failed
        try: self.save()
        except OSError: print('WARNING: could not save failure report; ACTIVE marker remains.',file=sys.stderr)
        if failed: print('URGENT: could not stop these units; prevent further writes:',', '.join(failed),file=sys.stderr)
        else: print('Backend and known timers/writers are stopped.',file=sys.stderr)
        print('\nSTOP: do not reset Git or rerun blindly.\nFollow automated-updates.md recovery using this run report and matching snapshot.',file=sys.stderr)


def main():
    os.umask(0o077)
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--ref')
    args=parser.parse_args()
    require(os.geteuid()==0,'Run with sudo.')
    previous_sigterm = signal.signal(signal.SIGTERM, cancel_update)
    updater=Updater()
    try:
        updater.preflight()
        if args.check:
            print('PASS: read-only checks completed; nothing fetched, built or changed.')
            return
        # Serialize build/preparation too, separately from the maintenance lock used by scheduled jobs.
        with open('/run/lock/docman-update.lock','a') as lock:
            try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            except BlockingIOError: raise Stop('Another update is running.') from None
            updater.prepare(args.ref)
            transaction(updater)
    except BaseException:
        if updater.run_dir:
            updater.report['failed_stage']=updater.report.get('stage')
            if not updater.paused:
                updater.report['status']='FAILED before maintenance; live deployment unchanged'
            try: updater.save()
            except OSError: print('WARNING: could not save diagnostic report.',file=sys.stderr)
            print('Private diagnostic directory:',updater.run_dir,file=sys.stderr)
        raise
    finally:
        signal.signal(signal.SIGTERM, previous_sigterm)

if __name__=='__main__':
    try: main()
    except (Stop, OSError, ValueError, KeyError, KeyboardInterrupt) as error:
        print('STOP:',str(error) if isinstance(error,Stop) else type(error).__name__+'; inspect the private diagnostic report.',file=sys.stderr)
        sys.exit(1)
