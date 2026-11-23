"""Optional real backup/restore check: requires mongod, mongosh, MongoDB tools and restic.
Uses temporary directories, a new loopback MongoDB process and a disposable restic repo.
No systemd services or existing databases are used.
"""
import importlib.util
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import tempfile
import time
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('update_runner',Path(__file__).with_name('runner.py'))
runner=importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

def run(args,**kw): return subprocess.run(args,check=True,capture_output=True,text=True,**kw)

def main():
    for tool in ('mongod','mongosh','mongodump','mongorestore','restic','git','rsync'):
        if not shutil.which(tool): raise RuntimeError('Missing integration test tool: '+tool)
    with tempfile.TemporaryDirectory(prefix='docman-update-backup-test-') as directory:
        root=Path(directory)
        app=root/'app'; app.mkdir()
        run(['git','init','-q',str(app)])
        (app/'README.md').write_text('Disposable update recovery fixture\n')
        run(['git','-C',str(app),'add','README.md'])
        run(['git','-C',str(app),'-c','user.name=Installer Test','-c','user.email=test@example.invalid','commit','-qm','fixture'])
        commit=run(['git','-C',str(app),'rev-parse','HEAD']).stdout.strip()
        uploads=root/'uploads'; uploads.mkdir(); original=secrets.token_bytes(4096)
        (uploads/'example.bin').write_bytes(original)
        public=root/'public'; public.mkdir(); (public/'index.html').write_text('<html>old release</html>')
        dbpath=root/'database'; dbpath.mkdir()
        with socket.socket() as probe:
            probe.bind(('127.0.0.1',0)); port=probe.getsockname()[1]
        mongo=subprocess.Popen(['mongod','--dbpath',str(dbpath),'--bind_ip','127.0.0.1','--port',str(port),'--logpath',str(root/'mongo.log')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        uri=f'mongodb://127.0.0.1:{port}/docman?serverSelectionTimeoutMS=500'
        try:
            for attempt in range(30):
                ready=subprocess.run(['mongosh','--quiet',uri,'--eval','db.runCommand({ping:1})'],capture_output=True)
                if ready.returncode==0: break
                if attempt==29: raise RuntimeError('Disposable MongoDB did not start')
                time.sleep(.2)
            run(['mongosh','--quiet',uri,'--eval','db.fixture.insertOne({marker:"before-update",version:1})'])
            job=root/'state'; job.mkdir(mode=0o700)
            runner.private_write(job/'restic-password',secrets.token_hex(24)+'\n')
            runner.private_write(job/'environment.before','DOCUMENT_ENCRYPTION_KEY='+secrets.token_hex(32)+'\n')
            repository=root/'repository'
            env={**os.environ,'RESTIC_REPOSITORY':str(repository),'RESTIC_PASSWORD_FILE':str(job/'restic-password')}
            run(['restic','init'],env=env)
            updater=runner.Updater()
            updater.run_dir=job; updater.restic_env=env; updater.restic_command=['restic']
            updater.values={'MONGO_URI':uri}; updater.report={'old_commit':commit}
            with patch.object(runner,'APP',app),patch.object(runner,'UPLOADS',uploads),patch.object(runner,'PUBLIC',public):
                updater.backup()
            assert updater.report['backup_complete'] is True
            snapshot=updater.report['backup_snapshot']
            recovered=root/'recovered'
            run(['restic','restore',snapshot,'--target',str(recovered)],env=env)
            recovered_snapshot=recovered / str(job/'snapshot').lstrip('/')
            assert (recovered_snapshot/'uploads/example.bin').read_bytes()==original
            assert (recovered_snapshot/'public_html/index.html').read_bytes()==(public/'index.html').read_bytes()
            assert (recovered_snapshot/'commit.txt').read_text().strip()==commit
            listing=run(['restic','ls',snapshot],env=env).stdout
            assert 'environment.before' not in listing and 'restic-password' not in listing and 'mongodump.yml' not in listing
            clone=root/'restored-code'
            run(['git','clone','-q',str(recovered_snapshot/'source.bundle'),str(clone)])
            assert run(['git','-C',str(clone),'rev-parse','HEAD']).stdout.strip()==commit
            run(['mongorestore','--host','127.0.0.1','--port',str(port),'--archive='+str(recovered_snapshot/'database.archive'),'--gzip','--nsFrom=docman.*','--nsTo=restored.*','--stopOnError'])
            result=run(['mongosh','--quiet',uri,'--eval','print(JSON.stringify(db.getSiblingDB("restored").fixture.findOne({marker:"before-update"})))'])
            assert json.loads(result.stdout)['version']==1
            print('PASS: real encrypted snapshot and restore recovered MongoDB data, upload bytes, frontend and source commit; secret files excluded.')
        finally:
            mongo.terminate()
            try: mongo.wait(timeout=20)
            except subprocess.TimeoutExpired:
                mongo.kill(); mongo.wait()

if __name__=='__main__': main()
