import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computed, reactive, ref, watch } from 'vue';
import * as projectManagement from './views/projects/projectManagement.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function evaluate(relative, bindings, result) {
  let source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  if (relative.endsWith('.vue')) source = source.match(/<script setup>([\s\S]*?)<\/script>/)[1];
  source = source.replace(/^import [\s\S]*?;\r?\n/gm, '').replace(/export function /g, 'function ');
  return new Function(...Object.keys(bindings), source + '\nreturn ' + result)(...Object.values(bindings));
}

test('late session hydration cannot overwrite logout or another login', async () => {
  for (const nextToken of [null, 'user-b-token']) {
    const request = deferred(), storage = new Map([['token', 'user-a-token'], ['user', '{"id":"a"}']]);
    const auth = evaluate('./composables/useAuth.js', {
      computed, reactive, api: { get: () => request.promise }, getStorageKey: key => key,
      window: { addEventListener() {} }, localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    }, '({state, hydrateCurrentSession, clearSession})');
    const pending = auth.hydrateCurrentSession();
    auth.clearSession();
    if (nextToken) { auth.state.token = nextToken; auth.state.user = { id: 'b' }; storage.set('token', nextToken); }
    request.resolve({ data: { user: { id: 'a' } } });
    await assert.rejects(pending, { code: 'SESSION_SUPERSEDED' });
    assert.equal(auth.state.token, nextToken);
    assert.equal(storage.get('token'), nextToken || undefined);
    assert.equal(auth.state.user?.id, nextToken ? 'b' : undefined);
  }
});

test('project editor ignores stale errors, success, and loading completion after reopen', async () => {
  for (const staleFailure of [true, false]) {
    const first = deferred(), second = deferred(), requests = [first, second];
    const editor = evaluate('./views/projects/ProjectsView.vue', {
      computed, reactive, ref, watch, onMounted() {}, ...projectManagement,
      api: { get: () => requests.shift().promise }, useAuth: () => ({ state: { user: { id: 'a', role: 'editor' } } }), personName: () => '',
    }, '({openEditor, editorOpen, choicesFailed, choicesLoading, formError, teamOptions})');
    const older = editor.openEditor();
    editor.editorOpen.value = false;
    const newer = editor.openEditor();
    if (staleFailure) first.reject(new Error('old request failed'));
    else first.resolve({ data: [{ _id: 'old' }] });
    await older;
    assert.equal(editor.choicesLoading.value, true);
    assert.equal(editor.choicesFailed.value, false);
    assert.equal(editor.formError.value, '');
    second.resolve({ data: [{ _id: 'new' }] });
    await newer;
    assert.equal(editor.choicesLoading.value, false);
    assert.deepEqual(editor.teamOptions.value.map(team => team._id), ['new']);
  }
});

test('public link includes root and non-root router bases', () => {
  for (const base of ['/', '/docman/', 'docman', '/docman']) {
    const card = evaluate('./components/PublicSharingCard.vue', {
      computed, ref, watch() {}, defineProps: () => ({ documentId: 'doc' }),
      window: { location: { origin: 'https://example.org' } }, getRuntimeConfig: () => ({ routerBase: base }),
    }, '({link, token})');
    card.token.value = 'test-token';
    assert.equal(card.link.value, `https://example.org/${base === '/' ? '' : 'docman/'}public/documents/test-token`);
  }
});

test('notification settings and retry retain committed audit warnings', async () => {
  const message = 'Change committed, but audit failed. Do not retry.';
  const card = evaluate('./components/admin/NotificationSettingsCard.vue', {
    ref, onMounted() {}, api: {
      put: async () => ({data: {committed:true, auditRecorded:false, message}}),
      post: async () => ({data: {committed:true, auditRecorded:false, message}}),
      get: async () => ({data: {enabled:true, counts:{}}}),
    },
  }, '({save, retry, auditWarning, message, failed})');
  for (const operation of [card.save, card.retry]) {
    await operation();
    assert.equal(card.message.value, message);
    assert.equal(card.auditWarning.value, true);
    assert.equal(card.failed.value, false);
  }
});

test('activated invitation with failed audit still offers sign in and displays recovery', async () => {
  const message = 'Account activated. Sign in; contact an administrator about the audit failure.';
  const view = evaluate('./views/auth/AcceptInvitationView.vue', {
    ref, onMounted() {}, window: {location: {hash:'#token=fixture', pathname:'/accept-invitation'}, history: {replaceState(){}}},
    api: {post: async () => ({data:{activated:true,auditRecorded:false,message}})},
  }, '({submit, done, auditWarning, password, confirmation, message})');
  view.password.value = view.confirmation.value = 'fixture';
  await view.submit();
  assert.equal(view.done.value, true);
  assert.equal(view.auditWarning.value, true);
  assert.equal(view.message.value, message);
  assert.equal(view.password.value, '');
});
