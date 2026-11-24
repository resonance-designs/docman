"""Root-owned web update broker. Two Unix sockets separate control from read-only progress.

Install with enable-web-updater.sh; never run from a web-writable checkout as root.
The application can select only newer stable tags from the fixed upstream repository.
"""
import hashlib
import fcntl
from contextlib import redirect_stdout, redirect_stderr, contextmanager
import hmac
import http.server
import json
import os
import pwd
import grp
import re
import secrets
import signal
import socket
import socketserver
import struct
import subprocess
import sys
import threading
import time
from urllib.request import Request, urlopen
from pathlib import Path

REPO = 'https://github.com/resonance-designs/docman.git'
APP = Path('/var/www/docman')
STATE = Path('/var/lib/docman-web-updater')
RUNTIME = Path('/run/docman-web-updater')
LOCAL_BACKUP = '/var/backups/docman-update-restic'
TAG = re.compile(r'^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$')
ACTIVE = {'starting', 'running', 'waiting'}
INSTALL_LOCK = Path('/run/lock/docman-web-updater-install.lock')

@contextmanager
def start_guard(action):
    if action != 'start':
        yield
        return
    with INSTALL_LOCK.open('a') as lock:
        try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: raise ValueError('Updater helper installation is in progress; try again later') from None
        yield

def published_tags():
    tags = set()
    # Bound network work; fail closed rather than offer a partial release list.
    for page in range(1, 11):
        request = Request(f'https://api.github.com/repos/resonance-designs/docman/releases?per_page=100&page={page}',
            headers={'Accept':'application/vnd.github+json', 'User-Agent':'DocMan-Updater'})
        with urlopen(request, timeout=10) as response:
            raw = response.read(2_000_001)
        if len(raw)>2_000_000: raise ValueError('GitHub release response too large')
        rows = json.loads(raw)
        if not isinstance(rows,list): raise ValueError('Invalid GitHub release response')
        for row in rows:
            if (isinstance(row,dict) and row.get('draft') is False and row.get('prerelease') is False
                    and row.get('published_at') and version(row.get('tag_name')) is not None):
                tags.add(row['tag_name'])
        if len(rows)<100: return tags
    raise ValueError('Too many release pages; operator assistance required')

def version(tag):
    if not isinstance(tag,str) or len(tag)>64: return None
    match = TAG.fullmatch(tag)
    return tuple(map(int, match.groups())) if match else None

def parse_tags(output, installed):
    tags = {}
    for line in output.splitlines():
        fields = line.split()
        if len(fields) != 2 or not re.fullmatch(r'[a-f0-9]{40}', fields[0]): continue
        sha, ref = fields
        if not ref.startswith('refs/tags/'): continue
        tag = ref[len('refs/tags/'):].removesuffix('^{}')
        if version(tag) is None or version(tag) <= installed: continue
        if tag not in tags or ref.endswith('^{}'): tags[tag] = sha
    return [{'tag': tag, 'commit': tags[tag]} for tag in sorted(tags, key=version, reverse=True)]

def releases():
    installed = json.loads((APP/'package.json').read_text())['version']
    current = version('v'+installed)
    if current is None: raise ValueError('Installed version is not stable')
    # Fixed public upstream; no checkout Git config, credentials or caller-supplied URL.
    result = subprocess.run(['/usr/bin/git', '-c', 'credential.helper=', 'ls-remote', '--tags', REPO],
        cwd='/', env={'PATH':'/usr/bin:/bin', 'HOME':'/nonexistent', 'GIT_CONFIG_NOSYSTEM':'1', 'GIT_TERMINAL_PROMPT':'0'},
        capture_output=True, text=True, timeout=45, check=True)
    published = published_tags()
    return {'installedVersion': installed, 'releases': [item for item in parse_tags(result.stdout, current) if item['tag'] in published]}

def atomic_state(data):
    temporary = STATE/'status.tmp'
    temporary.write_text(json.dumps(data))
    os.chmod(temporary, 0o600)
    temporary.replace(STATE/'status.json')

class Broker:
    def __init__(self):
        self.lock = threading.RLock()
        self.child = None
        self.state = json.loads((STATE/'status.json').read_text()) if (STATE/'status.json').exists() else {'status':'idle'}
        if self.state['status'] in ACTIVE:
            self.state.update(status='interrupted', prompt=None, message='Updater service restarted. An operator must inspect recovery state before another update.')
            atomic_state(self.state)

    def public(self):
        return {key:value for key,value in self.state.items() if key not in ('ticketHash', 'ticket', 'expires')}

    def read(self, ticket):
        with self.lock:
            if time.time() > self.state.get('expires', 0) or not hmac.compare_digest(
                    hashlib.sha256(ticket.encode()).hexdigest(), self.state.get('ticketHash', '')):
                raise PermissionError('Progress access expired')
            return self.public()

    def control(self, body):
        action = body.get('action')
        if action == 'releases': return releases()
        with self.lock, start_guard(action):
            if action == 'status':
                # Authenticated superadmins may resume observation after a page refresh.
                ticket = self.state.get('ticket') or secrets.token_urlsafe(32)
                self.state.update(ticket=ticket,ticketHash=hashlib.sha256(ticket.encode()).hexdigest(), expires=time.time()+14400)
                atomic_state(self.state)
                return {**self.public(), 'ticket':ticket}
            if action == 'start':
                if self.state['status'] in ACTIVE or self.state['status'] in ('interrupted','recovery-required'): raise ValueError('Update already active or operator recovery required')
                tag, commit = body.get('tag'), body.get('commit')
                if version(tag) is None: raise ValueError('Choose a stable release')
                if {'tag':tag,'commit':commit} not in releases()['releases']: raise ValueError('Release changed or is no longer newer; refresh the release list')
                ticket = secrets.token_urlsafe(32)
                self.state = {'jobId':secrets.token_hex(16),'status':'starting','tag':tag,'commit':commit,'actor':body.get('actor'),'stage':'Preflight',
                    'ticket':ticket,'ticketHash':hashlib.sha256(ticket.encode()).hexdigest(),'expires':time.time()+14400,'prompt':None}
                atomic_state(self.state)
                try:
                    self.child = subprocess.Popen([sys.executable, '-I', str(Path(__file__).resolve()), '--worker', tag, commit],
                        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1)
                except OSError:
                    self.state.update(status='failed',message='Could not start updater worker')
                    atomic_state(self.state)
                    raise
                threading.Thread(target=self.monitor, args=(self.child,self.state['jobId']), daemon=True).start()
                return {**self.public(), 'ticket':ticket}
            if action == 'answer':
                prompt = self.state.get('prompt')
                answer = body.get('answer')
                if self.state['status'] != 'waiting' or not prompt or prompt['id'] != body.get('promptId'):
                    raise ValueError('This prompt is no longer active')
                if not isinstance(answer,str) or len(answer)>2048 or any(ord(c)<32 for c in answer): raise ValueError('Invalid answer')
                self.child.stdin.write(json.dumps({'answer':answer})+'\n'); self.child.stdin.flush()
                self.state.update(status='running',prompt=None)
                atomic_state(self.state)
                return self.public()
            if action == 'cancel':
                if self.state['status'] != 'waiting': raise ValueError('Cancellation is available only while awaiting a pre-update answer')
                self.child.send_signal(signal.SIGTERM)
                self.state.update(status='running',prompt=None,stage='Cancelling before deployment')
                atomic_state(self.state)
                return self.public()
            raise ValueError('Unknown updater action')

    def monitor(self, child, job_id):
        for line in child.stdout:
            try: event = json.loads(line)
            except ValueError: continue
            with self.lock:
                if self.state.get('jobId') != job_id: continue
                if event.get('type') == 'prompt':
                    self.state.update(status='waiting',prompt=event['prompt'])
                elif event.get('type') == 'stage':
                    self.state.update(status='running',stage=event['stage'],prompt=None)
                elif event.get('type') == 'result':
                    self.state.update(status=event['status'],report=event['report'],message=event['message'],prompt=None)
                atomic_state(self.state)
        code = child.wait()
        with self.lock:
            if self.state.get('jobId') == job_id and self.state['status'] in ACTIVE:
                self.state.update(status='interrupted',prompt=None,message='Worker stopped unexpectedly. An operator must inspect the private update report.')
                atomic_state(self.state)

class UnixServer(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    daemon_threads = True

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_args): pass # Never log passwords, tickets or request bodies.
    def setup(self):
        super().setup()
        self.connection.settimeout(10)
    def reply(self, code, data):
        encoded=json.dumps(data).encode()
        self.send_response(code); self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(encoded)))
        self.end_headers(); self.wfile.write(encoded)
    def do_GET(self):
        try:
            if self.path != '/status' or self.server.control: return self.reply(404, {})
            auth=self.headers.get('Authorization','')
            if not auth.startswith('Bearer '): raise PermissionError()
            self.reply(200,self.server.broker.read(auth[7:]))
        except PermissionError: self.reply(403,{'message':'Progress access expired. Sign in again or contact the server operator.'})
    def do_POST(self):
        try:
            if not self.server.control or self.path != '/control': return self.reply(404,{})
            _pid, uid, _gid=struct.unpack('3i',self.connection.getsockopt(socket.SOL_SOCKET,socket.SO_PEERCRED,12))
            if uid not in (0,pwd.getpwnam('docman').pw_uid): raise PermissionError()
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=8192: raise ValueError('Request too large')
            body=json.loads(self.rfile.read(size))
            if not isinstance(body,dict): raise ValueError('Invalid request')
            self.reply(200,self.server.broker.control(body))
        except PermissionError: self.reply(403,{'message':'Access denied'})
        except ValueError as error: self.reply(409,{'message':str(error)})
        except Exception: self.reply(503,{'message':'Updater unavailable. Check upstream connectivity and the updater service journal.'})

def worker(tag, commit):
    # This module and runner.py are installed together in root-owned /usr/local/lib.
    sys.path.insert(0,str(Path(__file__).resolve().parent))
    import runner
    output=sys.stdout
    def emit(data): output.write(json.dumps(data)+'\n'); output.flush()
    def prompt(text, secret=False):
        import select
        emit({'type':'prompt','prompt':{'id':secrets.token_hex(16),'text':text,'secret':secret}})
        if not select.select([sys.stdin],[],[],1800)[0]: raise runner.Stop('Prompt timed out; update cancelled')
        line=sys.stdin.readline(8193)
        if not line: raise runner.Stop('Prompt closed')
        return json.loads(line)['answer']
    base=runner.Updater
    class WebUpdater(base):
        def interactive(self): return True
        def ask(self,text):
            if text.startswith('Restic repository'):
                choice=prompt('Backup destination: enter LOCAL for the local POC repository, or SAVED to use the server-configured repository.')
                if choice=='LOCAL': return LOCAL_BACKUP
                if choice=='SAVED' and runner.RESTIC_REPOSITORY_FILE.is_file(): return runner.RESTIC_REPOSITORY_FILE.read_text().strip()
                raise runner.Stop('Choose LOCAL or configure a saved repository on the server')
            return prompt(text)
        def ask_password(self,text): return prompt(text,True)
        def say(self,stage):
            super().say(stage)
            emit({'type':'stage','stage':stage})
        def git(self,*args):
            value=super().git(*args)
            if args[:1]==('fetch',):
                if super().git('remote','get-url','origin') != REPO: raise runner.Stop('Origin must be the approved DocMan repository')
            if args[:1]==('rev-parse',) and args[-1]==f'refs/tags/{tag}^{{commit}}':
                if value!=commit: raise runner.Stop('Release tag changed; refresh before retrying')
                if json.loads(super().git('show',f'{value}:package.json')).get('version') != tag[1:]:
                    raise runner.Stop('Release tag and package version disagree')
            return value
        def preflight(self):
            super().preflight()
            if self.git('remote','get-url','origin') != REPO: raise runner.Stop('Origin must be the approved DocMan repository')
    updater=WebUpdater()
    runner.Updater=lambda:updater
    sys.argv=[sys.argv[0],'--ref',f'refs/tags/{tag}']
    # All legacy output stays private, never in the browser progress feed.
    with (STATE/'worker.log').open('a') as log, redirect_stdout(log), redirect_stderr(log):
        try:
            runner.main()
            status='complete'; message='Service checks passed. Browser acceptance testing is still required.'
        except BaseException:
            status='recovery-required' if (runner.STATE/'ACTIVE').exists() else 'failed'
            message='Recovery required; contact the server operator.' if status=='recovery-required' else 'Update stopped before deployment or the original service was restored. Review the private updater report before retrying.'
        report={key:updater.report[key] for key in ('run_id','old_commit','target_commit','stage','status','backup_snapshot','backup_scope','failed_stage') if key in updater.report}
        emit({'type':'result','status':status,'message':message,'report':report})

def main():
    os.umask(0o077)
    if os.geteuid()!=0: raise SystemExit('Run through the installed systemd service')
    if len(sys.argv)==4 and sys.argv[1]=='--worker': return worker(sys.argv[2],sys.argv[3])
    broker=Broker()
    for name,group,control in [('control.sock','docman',True),('progress.sock','www-data',False)]:
        path=RUNTIME/name
        path.unlink(missing_ok=True)
        server=UnixServer(str(path),Handler);server.control=control;server.broker=broker
        os.chown(path,0,grp.getgrnam(group).gr_gid);os.chmod(path,0o660)
        threading.Thread(target=server.serve_forever,daemon=True).start()
    while True: time.sleep(30)

if __name__=='__main__': main()
