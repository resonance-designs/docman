"""Safety tests run in temporary directories. No system services or real deployments."""
import importlib.util
import json
from pathlib import Path
import secrets
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('update_runner',Path(__file__).with_name('runner.py'))
runner=importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

class FakeOperations:
    def __init__(self, fail=None): self.events=[]; self.fail=fail
    def __getattr__(self,name):
        def action():
            self.events.append(name)
            if name==self.fail: raise runner.Stop('injected failure')
        return action

class UpdateSafetyTests(unittest.TestCase):
    def test_successful_order_requires_backup_before_all_mutations(self):
        ops=FakeOperations()
        runner.transaction(ops)
        self.assertEqual(ops.events,['pause','backup','mark_mutating','deploy','migrate','publish','start','health','restore_timers','complete'])

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
            with patch.object(runner.subprocess,'run',return_value=subprocess.CompletedProcess([],0,'','')) as execute:
                updater.run(['systemctl','stop','docman-backend'])
                execute.assert_called_once()

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
