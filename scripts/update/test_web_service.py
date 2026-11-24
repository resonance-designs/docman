"""Isolated broker tests: no live GitHub, services, credentials, or deployment writes."""
import importlib.util
import json
from pathlib import Path
import tempfile
import time
import unittest
import http.client
import socket
import threading
import os
from unittest.mock import patch, Mock
spec=importlib.util.spec_from_file_location('web_service',Path(__file__).with_name('web_service.py'))
web=importlib.util.module_from_spec(spec);spec.loader.exec_module(web)

class BrokerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.state=patch.object(web,'STATE',Path(self.temp.name));self.state.start()
        self.broker=web.Broker()
    def tearDown(self):self.state.stop();self.temp.cleanup()
    def test_stable_tags_sorted_numerically_and_annotated_tags_peeled(self):
        a,b='a'*40,'b'*40
        rows='\n'.join(f'{a} refs/tags/{tag}' for tag in ['v3.0.2','v3.0.3','v3.0.10','v3.1.0-rc1','v03.1.0'])
        rows+=f'\n{b} refs/tags/v3.0.3^{{}}'
        self.assertEqual(web.parse_tags(rows,(3,0,2)),[{'tag':'v3.0.10','commit':a},{'tag':'v3.0.3','commit':b}])
    def test_progress_ticket_is_required_and_secrets_are_not_serialized(self):
        status=self.broker.control({'action':'status'});ticket=status['ticket']
        with self.assertRaises(PermissionError):self.broker.read('wrong')
        self.assertNotIn('ticket',self.broker.read(ticket));self.assertNotIn('ticketHash',self.broker.read(ticket))
        self.assertEqual(self.broker.control({'action':'status'})['ticket'],ticket)
        self.broker.state['expires']=0
        with self.assertRaises(PermissionError):self.broker.read(ticket)
    def test_tag_movement_or_downgrade_does_not_spawn(self):
        with patch.object(web,'releases',return_value={'releases':[{'tag':'v3.0.4','commit':'b'*40}]}),patch.object(web.subprocess,'Popen') as spawn:
            for tag in ['v3.0.4','v3.0.1','origin/dev']:
                with self.assertRaises(ValueError):self.broker.control({'action':'start','tag':tag,'commit':'a'*40})
            spawn.assert_not_called()
    def test_prompt_replay_rejected_and_answers_not_persisted(self):
        self.broker.child=Mock()
        self.broker.state.update(status='waiting',prompt={'id':'current','secret':True})
        with self.assertRaises(ValueError):self.broker.control({'action':'answer','promptId':'stale','answer':'value'})
        self.broker.control({'action':'answer','promptId':'current','answer':'private fixture answer'})
        self.assertNotIn('private fixture answer',(web.STATE/'status.json').read_text())
        with self.assertRaises(ValueError):self.broker.control({'action':'answer','promptId':'current','answer':'repeat'})
    def test_cancel_only_at_predeployment_prompt(self):
        self.broker.child=Mock();self.broker.state['status']='running'
        with self.assertRaises(ValueError):self.broker.control({'action':'cancel'})
        self.broker.child.send_signal.assert_not_called()
    def test_recovery_required_blocks_new_work(self):
        for status in ['running','waiting','interrupted','recovery-required']:
            self.broker.state['status']=status
            with self.assertRaises(ValueError):self.broker.control({'action':'start','tag':'v3.0.4','commit':'a'*40})
    def test_restart_preserves_evidence_and_requires_operator(self):
        web.atomic_state({'status':'running','tag':'v3.0.4'})
        restored=web.Broker()
        self.assertEqual(restored.state['status'],'interrupted')
        self.assertEqual(restored.state['tag'],'v3.0.4')
    def test_progress_socket_is_read_only_and_requires_capability(self):
        path=str(Path(self.temp.name)/'progress.sock')
        server=web.UnixServer(path,web.Handler);server.control=False;server.broker=self.broker
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        def request(method,route,token=''):
            connection=http.client.HTTPConnection('localhost')
            connection.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);connection.sock.connect(path)
            connection.request(method,route,headers={'Authorization':'Bearer '+token})
            response=connection.getresponse();result=(response.status,response.read());connection.close();return result
        try:
            ticket=self.broker.control({'action':'status'})['ticket']
            self.assertEqual(request('GET','/status')[0],403)
            self.assertEqual(request('GET','/status',ticket)[0],200)
            self.assertEqual(request('POST','/control',ticket)[0],404)
            self.assertEqual(request('GET','/../control',ticket)[0],404)
        finally:server.shutdown();server.server_close();thread.join()
    def test_worker_pipe_prompt_answer_and_completion(self):
        import subprocess
        import sys
        real_spawn=subprocess.Popen
        script='''import json,sys
print(json.dumps({'type':'prompt','prompt':{'id':'fixture','text':'Answer','secret':True}}),flush=True)
answer=json.loads(sys.stdin.readline())['answer']
assert answer == 'private fixture answer'
print(json.dumps({'type':'result','status':'complete','report':{'run_id':'fixture'},'message':'Finished'}),flush=True)
'''
        def spawn(*args,**kwargs):return real_spawn([sys.executable,'-c',script],**kwargs)
        with patch.object(web,'releases',return_value={'releases':[{'tag':'v3.0.4','commit':'a'*40}]}),patch.object(web.subprocess,'Popen',side_effect=spawn):
            response=self.broker.control({'action':'start','tag':'v3.0.4','commit':'a'*40,'actor':'admin'})
        def wait_for(status):
            deadline=time.monotonic()+5
            while self.broker.state['status']!=status and time.monotonic()<deadline:time.sleep(.01)
            self.assertEqual(self.broker.state['status'],status)
        try:
            wait_for('waiting')
            self.broker.control({'action':'answer','promptId':'fixture','answer':'private fixture answer'})
            wait_for('complete')
            self.assertEqual(self.broker.read(response['ticket'])['report']['run_id'],'fixture')
            self.assertNotIn('private fixture answer',(web.STATE/'status.json').read_text())
        finally:
            self.broker.child.wait(timeout=5)
            self.broker.child.stdin.close();self.broker.child.stdout.close()
    def test_worker_rechecks_tag_commit_and_package_version(self):
        import io
        import sys
        from types import SimpleNamespace
        for actual_sha,package_version,expected in [('a'*40,'3.0.4','complete'),('b'*40,'3.0.4','failed'),('a'*40,'3.0.3','failed')]:
            with self.subTest(commit=actual_sha,version=package_version):
                class Base:
                    def __init__(self):self.report={}
                    def git(self,*args):
                        if args[0]=='rev-parse':return actual_sha
                        if args[0]=='show':return json.dumps({'version':package_version})
                        raise AssertionError(args)
                fake=SimpleNamespace(Updater=Base,Stop=RuntimeError,STATE=web.STATE)
                def run():
                    updater=fake.Updater()
                    updater.git('rev-parse','--verify','--end-of-options','refs/tags/v3.0.4^{commit}')
                fake.main=run
                output=io.StringIO()
                with patch.dict(sys.modules,{'runner':fake}),patch.object(sys,'stdout',output),patch.object(sys,'argv',['fixture']),patch.object(sys,'path',list(sys.path)):
                    web.worker('v3.0.4','a'*40)
                self.assertEqual(json.loads(output.getvalue())['status'],expected)

if __name__=='__main__':unittest.main()
