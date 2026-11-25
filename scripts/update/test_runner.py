"""Safety tests run in temporary directories. No system services or real deployments."""
import importlib.util
import json
import hashlib
import os
import signal
import sys
import time
from types import SimpleNamespace
from pathlib import Path
import secrets
import subprocess
import tempfile
import unittest
from unittest.mock import patch, Mock

spec=importlib.util.spec_from_file_location('update_runner',Path(__file__).with_name('runner.py'))
runner=importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
fixture_spec=importlib.util.spec_from_file_location('backup_fixture',Path(__file__).with_name('integration_backup.py'))
fixture=importlib.util.module_from_spec(fixture_spec)
fixture_spec.loader.exec_module(fixture)

class FakeOperations:
    def __init__(self, fail=None): self.events=[]; self.fail=fail
    def __getattr__(self,name):
        def action():
            self.events.append(name)
            if name==self.fail: raise runner.Stop('injected failure')
        return action

class UpdateSafetyTests(unittest.TestCase):
    def test_notification_failure_does_not_fail_a_completed_update(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'ACTIVE').touch()
            updater=runner.Updater()
            updater.report={'target_commit':'a'*40,'run_id':'run-1','backup_snapshot':'snapshot'}
            updater.run_dir=root
            updater.git=Mock(return_value='a'*40)
            updater.save=Mock()
            updater.run=Mock(side_effect=OSError('notification command unavailable'))
            with patch.object(runner,'STATE',root): updater.complete(); updater.notify_completion()
            self.assertFalse((root/'ACTIVE').exists())
            self.assertEqual(updater.report['status'],'service checks passed; browser validation pending')
            self.assertIn('src/scripts/notifySystemUpdate.js',updater.run.call_args.args[0])
    def test_notification_interrupt_keeps_successful_deployment(self):
        for error in (KeyboardInterrupt(), runner.Cancelled('cancelled')):
            with self.subTest(error=type(error).__name__), tempfile.TemporaryDirectory() as temp:
                root=Path(temp); (root/'ACTIVE').touch()
                updater=runner.Updater()
                updater.report={'target_commit':'a'*40,'run_id':'run-1','backup_snapshot':'snapshot'}
                updater.run_dir=root
                updater.git=Mock(return_value='a'*40)
                updater.save=Mock()
                updater.run=Mock(side_effect=error)
                for name in ('pause','backup','mark_mutating','deploy','migrate','publish','start','health','restore_timers','quarantine','restore_original'):
                    setattr(updater,name,Mock())
                with patch.object(runner,'STATE',root): runner.transaction(updater)
                updater.quarantine.assert_not_called()
                updater.restore_original.assert_not_called()
                self.assertFalse((root/'ACTIVE').exists())
                self.assertEqual(updater.report['status'],'service checks passed; browser validation pending')

    def test_fixture_rejects_exited_child_before_probe(self):
        mongo=Mock(pid=123)
        mongo.poll.return_value=48
        with patch.object(fixture.subprocess,'run') as probe:
            with self.assertRaisesRegex(RuntimeError,'exited'): fixture.wait_for_mongo(mongo,'fixture-only')
            probe.assert_not_called()

    def test_fixture_requires_identity_not_only_successful_ping(self):
        mongo=Mock(pid=123); mongo.poll.return_value=None
        with patch.object(fixture.subprocess,'run',return_value=subprocess.CompletedProcess([],0,'999','')):
            with self.assertRaisesRegex(RuntimeError,'not owned'): fixture.wait_for_mongo(mongo,'fixture-only')
        with patch.object(fixture.subprocess,'run',return_value=subprocess.CompletedProcess([],0,'123','')):
            fixture.wait_for_mongo(mongo,'fixture-only')

    def test_successful_order_requires_backup_before_all_mutations(self):
        ops=FakeOperations()
        runner.transaction(ops)
        self.assertEqual(ops.events,['pause','backup','mark_mutating','deploy','migrate','publish','start','health','restore_timers','complete','notify_completion'])

    def test_backup_failure_restores_original_without_checkout(self):
        ops=FakeOperations('backup')
        with self.assertRaises(runner.Stop): runner.transaction(ops)
        self.assertEqual(ops.events,['pause','backup','restore_original'])

    def test_lock_failure_does_not_enter_backup(self):
        ops=FakeOperations('pause')
        with self.assertRaises(runner.Stop): runner.transaction(ops)
        self.assertNotIn('backup',ops.events)
        self.assertNotIn('deploy',ops.events)

    def test_failures_after_first_write_never_automatically_roll_back_code(self):
        for stage in ('deploy','migrate','publish','start','health','restore_timers','complete'):
            with self.subTest(stage=stage):
                ops=FakeOperations(stage)
                with self.assertRaises(runner.Stop): runner.transaction(ops)
                self.assertEqual(ops.events[-1],'quarantine')
                self.assertNotIn('restore_original',ops.events)
                if stage=='migrate': self.assertNotIn('start',ops.events)

    def test_keyboard_interrupt_after_mutation_is_quarantined(self):
        ops=FakeOperations()
        def interrupt(): raise KeyboardInterrupt()
        ops.migrate=interrupt
        with self.assertRaises(KeyboardInterrupt): runner.transaction(ops)
        self.assertEqual(ops.events[-1],'quarantine')

    def test_migration_exit_zero_with_missing_files_is_rejected(self):
        output='[migrateComplianceFields] Dry run complete. '+json.dumps({'missingFiles':2})
        with self.assertRaises(runner.Stop): runner.migration_summary(output)

    def test_migration_requires_a_structured_completion_result(self):
        for value in ('success','{"missingFiles":0}','[migrateComplianceFields] Dry run complete. {"missingFiles":false}'):
            with self.assertRaises(runner.Stop): runner.migration_summary(value)
        self.assertEqual(runner.migration_summary('[migrateComplianceFields] Migration complete. {"missingFiles":0}')['missingFiles'],0)

    def test_existing_keys_and_original_environment_are_preserved_byte_for_byte(self):
        values={name:secrets.token_hex(32) for name in runner.KEYS}
        original='# keep comments\nJWT_SECRET=unchanged\n'+''.join(f'{key}={value}\n' for key,value in values.items())
        updated,names=runner.prepare_environment(original,values,[10,1])
        self.assertEqual(updated,original)
        self.assertEqual(names,[])

    def test_new_keys_are_distinct_and_added_only_when_no_encrypted_records_exist(self):
        original='JWT_SECRET=preserved'
        updated,names=runner.prepare_environment(original,{},[0,0])
        self.assertTrue(updated.startswith(original+'\n'))
        self.assertEqual(names,list(runner.KEYS))
        rows=dict(line.split('=',1) for line in updated.splitlines())
        self.assertNotEqual(rows[runner.KEYS[0]],rows[runner.KEYS[1]])
        self.assertTrue(all(len(rows[key])==64 for key in runner.KEYS))

    def test_missing_key_for_encrypted_data_is_never_regenerated(self):
        for counts in ([1,0],[0,1]):
            with self.assertRaises(runner.Stop): runner.prepare_environment('',{},counts)

    def test_invalid_and_explicitly_empty_keys_are_not_silently_replaced(self):
        with self.assertRaises(runner.Stop): runner.prepare_environment('DOCUMENT_ENCRYPTION_KEY=\n',{},[0,0])
        with self.assertRaises(runner.Stop): runner.prepare_environment('',{'DOCUMENT_ENCRYPTION_KEY':'invalid'},[0,0])

    def test_reference_injection_is_rejected(self):
        for ref in ('origin/dev','v3.0.1','a'*40): self.assertTrue(runner.valid_ref(ref))
        for ref in ('--help','origin/dev; rm -rf /','$(id)','x\ny','HEAD^{tree}'):
            self.assertFalse(runner.valid_ref(ref))

    def test_target_cannot_track_runtime_credentials_or_symlink_application_paths(self):
        runner.validate_target_paths([('100644','backend/.env.sample'),('100644','README.md')])
        for entry in [('100644','backend/.env.prod'),('100644','frontend-vue/node_modules/a'),('120000','backend'),('120000','frontend-vue/src')]:
            with self.assertRaises(runner.Stop): runner.validate_target_paths([entry])

    def test_private_state_mode_and_symlink_refusal(self):
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/'report.json'
            runner.private_write(p,'original')
            self.assertEqual(p.stat().st_mode & 0o777,0o600)
            link=Path(temp)/'link'
            link.symlink_to(p)
            with self.assertRaises(runner.Stop): runner.private_write(link,'overwrite')
            self.assertEqual(p.read_text(),'original')

    def test_old_service_health_uses_old_frontend_not_new_staged_digest(self):
        updater=runner.Updater()
        updater.paused=True
        updater.backend_stopped=True
        updater.report={'old_index_sha256':'old','published_index_sha256':'new'}
        with tempfile.TemporaryDirectory() as temp, patch.object(runner,'STATE',Path(temp)), patch.object(updater,'run'), patch.object(updater,'health') as health, patch.object(updater,'save'), patch.object(updater,'restore_timers'):
            updater.restore_original()
            health.assert_called_once_with(expected_index='old')

    def test_emergency_stop_runs_even_if_failure_report_cannot_be_written(self):
        updater=runner.Updater()
        with patch.object(updater,'run') as run, patch.object(updater,'save',side_effect=OSError('disk full')):
            updater.quarantine()
            self.assertIn((['systemctl','stop','docman-backend'],),[call.args for call in run.call_args_list])

    def test_failed_backup_guard_prevents_mutation(self):
        updater=runner.Updater()
        with self.assertRaises(runner.Stop): updater.mark_mutating()

    def test_log_failure_cannot_prevent_cleanup_commands(self):
        updater=runner.Updater()
        with tempfile.TemporaryDirectory() as temp:
            updater.run_dir=Path(temp)/'missing'
            with patch.object(runner,'run_command',return_value=subprocess.CompletedProcess([],0,'','')) as execute:
                updater.run(['systemctl','stop','docman-backend'])
                execute.assert_called_once()

    def test_environment_hash_and_parsed_values_use_one_snapshot(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'.env.prod'
            original=b'# retained\r\nMONGO_URI="mongodb://localhost/docman"\r\n'
            path.write_bytes(original)
            updater=runner.Updater()
            def parse(args, **kwargs):
                self.assertEqual(kwargs['input'].encode(), original)
                path.write_text('operator edit')
                return subprocess.CompletedProcess(args,0,'{"MONGO_URI":"mongodb://localhost/docman"}','')
            with patch.object(runner,'ENV',path), patch.object(updater,'run',side_effect=parse):
                updater.snapshot_environment()
            self.assertEqual(updater.original_env.encode(),original)
            self.assertEqual(updater.env_hash,hashlib.sha256(original).hexdigest())
            self.assertNotEqual(updater.env_hash,runner.digest(path))
            self.assertEqual(updater.values['MONGO_URI'],'mongodb://localhost/docman')

    def test_repository_overlap_rejects_descendants_ancestors_and_aliases(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); app=root/'app'; app.mkdir(); public=root/'public'; public.mkdir()
            alias=root/'alias'; alias.symlink_to(public, target_is_directory=True)
            with patch.object(runner,'APP',app),patch.object(runner,'PUBLIC',public):
                for path in (root,app,app/'backup',public/'recovery',alias/'recovery'):
                    with self.subTest(path=path), self.assertRaises(runner.Stop):
                        runner.validate_backup_destination(path)
                self.assertEqual(runner.validate_backup_destination(root/'separate'),root/'separate')

    def test_git_checks_disable_index_refresh(self):
        updater=runner.Updater()
        with patch.object(updater,'owner_run',return_value=subprocess.CompletedProcess([],0,'','')) as execute:
            updater.git('diff','--name-only')
        self.assertEqual(execute.call_args.args[0][:3],['git','-c','diff.autoRefreshIndex=false'])

    def test_deploy_refuses_to_overwrite_ignored_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); app=root/'app'; app.mkdir()
            def git(*args):
                return subprocess.run(['git','-C',str(app),*args],check=True,capture_output=True,text=True).stdout.strip()
            git('init','-q'); git('config','user.name','Test'); git('config','user.email','test@example.invalid')
            (app/'.gitignore').write_text('local.txt\n')
            git('add','.gitignore'); git('commit','-qm','old')
            old=git('rev-parse','HEAD')
            (app/'local.txt').write_text('release data')
            git('add','-f','local.txt'); git('commit','-qm','target')
            target=git('rev-parse','HEAD'); git('switch','--detach',old)
            (app/'local.txt').write_text('operator data')
            env=root/'env'; env.write_text('existing settings')
            vue=root/'vue'; vue.write_text('frontend settings')
            job=root/'job'; job.mkdir(); (job/'frontend.before').write_bytes(vue.read_bytes())
            updater=runner.Updater(); updater.run_dir=job; updater.build=root/'build'
            updater.report={'target_commit':target}; updater.env_hash=runner.digest(env); updater.vue_hash=runner.digest(vue)
            updater.original_env=updater.next_env=env.read_text()
            with patch.object(runner,'APP',app),patch.object(runner,'ENV',env),patch.object(runner,'VUE_ENV',vue),patch.object(updater,'git',side_effect=git),patch.object(updater,'owner_run'),patch.object(updater,'save'):
                with self.assertRaises(subprocess.CalledProcessError): updater.deploy()
                self.assertEqual((app/'local.txt').read_text(),'operator data')
                self.assertEqual(git('rev-parse','HEAD'),old)
                (app/'local.txt').unlink()
                updater.deploy()
                self.assertEqual(git('rev-parse','HEAD'),target)

    def test_health_disables_curlrc_for_every_request(self):
        updater=runner.Updater(); updater.host='example.org'
        content=b'frontend'; expected=hashlib.sha256(content).hexdigest()
        def request(args,**kwargs):
            self.assertEqual(args[:2],['curl','--disable'])
            if kwargs.get('binary'): return subprocess.CompletedProcess(args,0,content,b'')
            return subprocess.CompletedProcess(args,0,'401' if args[-1].endswith('/api/docs') else '200','')
        with patch.object(updater,'run',side_effect=request): updater.health(expected_index=expected)

    def test_sigterm_uses_pre_and_post_mutation_recovery(self):
        for stage, recovery in [('backup','restore_original'),('deploy','quarantine')]:
            ops=FakeOperations()
            def cancel(): raise runner.Cancelled()
            setattr(ops,stage,cancel)
            with self.assertRaises(runner.Cancelled): runner.transaction(ops)
            self.assertEqual(ops.events[-1],recovery)

    def test_cancelled_command_is_reaped_before_return(self):
        with tempfile.TemporaryDirectory() as temp:
            pid_file=Path(temp)/'child.pid'
            script='import os,signal,time; from pathlib import Path; Path('+repr(str(pid_file))+').write_text(str(os.getpid())); os.kill(os.getppid(),signal.SIGTERM); time.sleep(30)'
            previous=signal.signal(signal.SIGTERM,runner.cancel_update)
            try:
                with self.assertRaises(runner.Cancelled):
                    runner.run_command([sys.executable,'-c',script],text=True)
            finally: signal.signal(signal.SIGTERM,previous)
            with self.assertRaises(ProcessLookupError): os.kill(int(pid_file.read_text()),0)

    def test_constructor_time_sigterm_waits_for_child_ownership_without_blocking_child(self):
        with tempfile.TemporaryDirectory() as temp:
            state=Path(temp)/'child.json'; stopped=Path(temp)/'stopped'
            script=('import os,signal,time,json; from pathlib import Path; '
                    'signal.signal(signal.SIGTERM,lambda *_:(Path('+repr(str(stopped))+').write_text("terminated"),os._exit(0))); '
                    'Path('+repr(str(state))+').write_text(json.dumps({"pid":os.getpid(),"blocked":signal.SIGTERM in signal.pthread_sigmask(signal.SIG_BLOCK,[])})); time.sleep(30)')
            real_popen=subprocess.Popen
            class SpawnThenCancel(real_popen):
                def __init__(self,*args,**kwargs):
                    super().__init__(*args,**kwargs)
                    deadline=time.monotonic()+5
                    while not state.exists() and time.monotonic()<deadline: time.sleep(.01)
                    os.kill(os.getpid(),signal.SIGTERM)
            previous=signal.signal(signal.SIGTERM,runner.cancel_update)
            try:
                with patch.object(runner.subprocess,'Popen',SpawnThenCancel):
                    with self.assertRaises(runner.Cancelled): runner.run_command([sys.executable,'-c',script],text=True)
            finally: signal.signal(signal.SIGTERM,previous)
            child=json.loads(state.read_text())
            self.assertFalse(child['blocked'])
            self.assertEqual(stopped.read_text(),'terminated')
            with self.assertRaises(ProcessLookupError): os.kill(child['pid'],0)

    def test_failed_constructor_restores_signal_handlers(self):
        before={sig:signal.getsignal(sig) for sig in (signal.SIGTERM,signal.SIGINT)}
        with patch.object(runner.subprocess,'Popen',side_effect=FileNotFoundError()):
            with self.assertRaises(FileNotFoundError): runner.run_command(['missing'],text=True)
        self.assertEqual({sig:signal.getsignal(sig) for sig in before},before)

    def test_saved_repository_normalization_preserves_password_reuse(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); saved=root/'saved'; saved.mkdir(); other=root/'other'; other.mkdir()
            repo_file=root/'repository'; repo_file.write_text(str(saved)+'/\n')
            password_file=root/'password'; password_file.write_text('existing-short\n')
            real_stat=Path.stat
            def stat(path,*args,**kwargs):
                if path==password_file: return SimpleNamespace(st_uid=0,st_mode=0o100600)
                return real_stat(path,*args,**kwargs)
            for chosen,reuse in [('',True),(str(saved),True),(str(saved)+'/./',True),(str(other),False)]:
                with self.subTest(chosen=chosen):
                    job=root/('job'+str(len(list(root.glob('job*'))))); job.mkdir()
                    updater=runner.Updater(); updater.run_dir=job
                    prompts=[]
                    def answer(prompt):
                        prompts.append(prompt)
                        if prompt.startswith('Restic repository'): return chosen
                        if prompt.startswith('This backup'): return 'LOCAL-POC'
                        if prompt.startswith('Use the existing'): return 'yes'
                        raise AssertionError(prompt)
                    with patch.object(runner,'RESTIC_REPOSITORY_FILE',repo_file),patch.object(runner,'RESTIC_PASSWORD_FILE',password_file),patch.object(Path,'stat',stat),patch('builtins.input',side_effect=answer),patch.object(runner.getpass,'getpass',return_value='new-input-password-value') as secret,patch.object(updater,'run',return_value=subprocess.CompletedProcess([],0,'[]','')):
                        updater.configure_backup()
                    self.assertEqual(secret.call_count,0 if reuse else 2)
                    self.assertEqual(any(p.startswith('Use the existing') for p in prompts),reuse)
                    self.assertEqual((job/'restic-password').read_text(),'existing-short\n' if reuse else 'new-input-password-value\n')

    def test_interrupt_after_active_write_can_restore_without_stopping_backend(self):
        updater=runner.Updater(); updater.report={'run_id':'fixture','old_commit':'old'}
        updater.env_hash='env'; updater.vue_hash='vue'
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            def write(path,value):
                Path(path).write_text(value)
                raise KeyboardInterrupt()
            def digest(path): return 'env' if path==runner.ENV else 'vue'
            def git(*args): return 'old' if args[0]=='rev-parse' else ''
            with patch.object(runner,'STATE',root), patch('builtins.open',return_value=tempfile.TemporaryFile()), patch.object(runner.fcntl,'flock'), patch.object(runner,'digest',side_effect=digest), patch.object(updater,'git',side_effect=git), patch.object(updater,'active',return_value=False), patch.object(updater,'save'), patch.object(runner,'private_write',side_effect=write):
                with self.assertRaises(KeyboardInterrupt): updater.pause()
            self.assertTrue(updater.paused)
            with patch.object(runner,'STATE',root),patch.object(updater,'save'):
                updater.restore_original()
            self.assertFalse((root/'ACTIVE').exists())

    def test_quarantine_stops_backup_cleanup_before_stopping_backend(self):
        updater=runner.Updater()
        def result(args,**kwargs):
            return subprocess.CompletedProcess(args,0,'loaded\n' if 'show' in args else '','')
        with patch.object(updater,'run',side_effect=result) as run, patch.object(updater,'save'):
            updater.quarantine()
            stopped=[call.args[0][-1] for call in run.call_args_list if call.args[0][1]=='stop']
            self.assertEqual(stopped[-1],'docman-backend')
            self.assertLess(stopped.index('docman-backup.service'),stopped.index('docman-backend'))

    def test_timers_are_restored_only_after_maintenance_lock_is_released(self):
        updater=runner.Updater()
        with tempfile.TemporaryFile() as lock:
            updater.lock=lock
            updater.timer_states={'docman-backup.timer':True,'docman-audit-verify.timer':False}
            def run(args,**kwargs):
                self.assertIsNone(updater.lock)
                self.assertTrue(lock.closed)
                self.assertEqual(args,['systemctl','start','docman-backup.timer'])
            with patch.object(updater,'run',side_effect=run) as execute:
                updater.restore_timers()
                execute.assert_called_once()

if __name__=='__main__': unittest.main()
