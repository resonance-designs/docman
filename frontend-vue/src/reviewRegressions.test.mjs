import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computed, reactive, ref, watch } from 'vue';
import * as projectManagement from './views/projects/projectManagement.js';
import { relationshipMessage } from './lib/relationshipMessage.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function evaluate(relative, bindings, result) {
  let source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  if (relative.endsWith('.vue')) source = source.match(/<script setup>([\s\S]*?)<\/script>/)[1];
  source = source.replace(/^import [\s\S]*?;\r?\n/gm, '').replace(/export function /g, 'function ').replace(/export const /g, 'const ').replace(/import\.meta\.env\.DEV/g, 'false');
  return new Function(...Object.keys(bindings), source + '\nreturn ' + result)(...Object.values(bindings));
}

test('tokenless 401 clears cross-tab stale state but preserves a subsequent login', async () => {
  for (const newerSession of [false,true]) {
    const storage=new Map([['token','old'],['user','{"id":"old"}']]);
    const localStorage={getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
    let onRequest,onFailure,expired;
    const window={addEventListener:(_name,fn)=>{expired=fn;},dispatchEvent:()=>expired()};
    const api={interceptors:{request:{use:fn=>{onRequest=fn;}},response:{use:(_success,fn)=>{onFailure=fn;}}}};
    evaluate('./services/api.js',{axios:{create:()=>api},localStorage,window,getStorageKey:key=>key,getRuntimeConfig:()=>({apiBaseUrl:'/api'})},'api');
    const auth=evaluate('./composables/useAuth.js',{computed,reactive,api,localStorage,window,getStorageKey:key=>key},'({state,persistSession})');
    storage.clear(); // Another tab signed out; this tab still has the old reactive state.
    const config=onRequest({headers:{}});
    assert.equal(config.docmanSessionToken,null);
    if(newerSession)auth.persistSession('new',{id:'new'});
    await assert.rejects(onFailure(Object.assign(new Error('Unauthorized'),{config,response:{status:401}})));
    assert.equal(auth.state.token,newerSession?'new':null);
    assert.equal(auth.state.user?.id,newerSession?'new':undefined);
    assert.equal(storage.get('token'),newerSession?'new':undefined);
  }
});

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

test('stale hydration failures preserve a newer session; current failures still clear it', async () => {
  for (const status of [undefined, 401]) {
    for (const newerSession of [false, true]) {
      const request = deferred(), started = deferred(), storage = new Map();
      const localStorage = {getItem: key => storage.get(key) || null, setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key)};
      let onRequest, onFailure, sessionExpired;
      const window = {addEventListener: (_name, fn) => {sessionExpired=fn;}, dispatchEvent: () => sessionExpired()};
      const api = {interceptors: {
        request: {use: fn => {onRequest=fn;}}, response: {use: (_success, fn) => {onFailure=fn;}},
      }};
      evaluate('./services/api.js', {axios:{create:()=>api}, localStorage, window, getStorageKey:key=>key, getRuntimeConfig:()=>({apiBaseUrl:'/api'})}, 'api');
      api.get = () => {
        const config = onRequest({headers:{}});
        started.resolve();
        return request.promise.catch(error => onFailure(Object.assign(error,{config})));
      };
      const authModule = evaluate('./composables/useAuth.js', {
        computed, reactive, api, localStorage, window, getStorageKey:key=>key,
        isAuthentikEnabled:()=>true, hasAuthentikRegistration:()=>false,
        exchangeAuthentikCode:async()=>({access_token:'token-a'}), consumePostLoginRedirect:()=>'/documents',
      }, '({useAuth, persistSession})');
      const auth = authModule.useAuth();
      const pending = auth.completeAuthentikLogin('fixture-code','fixture-state');
      await started.promise;
      if (newerSession) authModule.persistSession('token-b',{id:'b'});
      const failure = Object.assign(new Error('Hydration failed'), status ? {response:{status}} : {});
      request.reject(failure);
      await assert.rejects(pending);
      if (newerSession) {
        assert.equal(auth.state.token,'token-b');
        assert.equal(auth.state.user.id,'b');
        assert.equal(storage.get('token'),'token-b');
        assert.equal(JSON.parse(storage.get('user')).id,'b');
        assert.equal(auth.state.error,'');
      } else {
        assert.equal(auth.state.token,null);
        assert.equal(auth.state.user,null);
        assert.equal(storage.has('token'),false);
        assert.equal(storage.has('user'),false);
      }
    }
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

test('project create/edit/delete display pending relationship reconciliation', async () => {
  const backendMessage = 'Project saved. Team links are pending automatic reconciliation.';
  const response = {data:{relationshipsPending:true,message:backendMessage}};
  const view = evaluate('./views/projects/ProjectsView.vue', {
    computed, reactive, ref, watch, onMounted() {}, ...projectManagement, relationshipMessage,
    api:{get:async()=>({data:[]}),put:async()=>response,post:async()=>response,delete:async()=>response},
    useAuth:()=>({state:{user:{id:'a',role:'editor'}}}),personName:()=>'',
  }, '({saveProject,confirmMutation,form,editingId,selected,confirmAction,message,relationshipsPending})');
  Object.assign(view.form,{name:'Fixture',teamIds:['team'],status:'active',priority:'medium'});
  for (const id of [null,'project']) {
    view.editingId.value=id;
    await view.saveProject();
    assert.equal(view.message.value,backendMessage);
    assert.equal(view.relationshipsPending.value,true);
  }
  view.selected.value={_id:'project'};
  view.confirmAction.value={kind:'project'};
  await view.confirmMutation();
  assert.equal(view.message.value,backendMessage);
  assert.equal(view.relationshipsPending.value,true);
});

test('team project link/unlink appends pending text when the backend message lacks it', async () => {
  const view = evaluate('./views/teams/TeamResourceLinks.vue', {
    computed,ref,watch,onMounted(){},relationshipMessage,defineProps:()=>({teamId:'team',kind:'projects',canManage:true}),
    api:{get:async()=>({data:[]}),post:async()=>({data:{message:'Project added.',relationshipsPending:true}}),delete:async()=>({data:{message:'Project removed.',relationshipsPending:true}})},
  }, '({add,remove,selected,removing,message,relationshipsPending})');
  view.selected.value=['project'];
  await view.add();
  assert.equal(view.message.value,'Project added. Related links are pending automatic reconciliation.');
  assert.equal(view.relationshipsPending.value,true);
  view.removing.value={_id:'project'};
  await view.remove();
  assert.equal(view.message.value,'Project removed. Related links are pending automatic reconciliation.');
  assert.equal(view.relationshipsPending.value,true);
  assert.equal(relationshipMessage({relationshipsPending:false},'Project saved.'),'Project saved.');
});
