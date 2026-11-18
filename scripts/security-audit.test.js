import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyAudit, projects } from './security-audit.js';

test('audits the deployed Vue UI and all maintained lockfiles', () => {
  assert.deepEqual(projects, ['.', 'backend', 'frontend-vue', 'frontend', 'docs-site']);
});
test('accepts clean reports and reports with findings', () => {
  for (const total of [0, 1]) {
    const stdout = JSON.stringify({ metadata: { vulnerabilities: { total } } });
    assert.equal(classifyAudit({ status: total, stdout }).metadata.vulnerabilities.total, total);
  }
});
test('fails closed for network errors, missing metadata, invalid JSON and subprocess failure', () => {
  for (const result of [
    { status: 1, stdout: '{"error":{"summary":"registry unavailable"}}' },
    { status: 0, stdout: '{}' },
    { status: 0, stdout: '{"metadata":{"vulnerabilities":{}}}' },
    { status: 0, stdout: 'not json' },
    { status: 2, stdout: '{}' },
    { status: null, error: new Error('spawn failed') },
    { status: null, signal: 'SIGTERM' },
  ]) assert.throws(() => classifyAudit(result));
});
