import test from 'node:test';
import assert from 'node:assert/strict';
import { profileDraft, profileError, passwordChangeError, safeAvatar, saveAndRefreshProfile } from './lib/profile.js';
import { readFileSync } from 'node:fs';
import { createMemoryHistory, createRouter } from 'vue-router';
import { ref } from 'vue';
const valid = () => profileDraft({ firstname: 'Jane', lastname: 'Doe', title: 'Analyst' });
test('profile draft excludes credential and privilege fields', () => {
  const result = profileDraft({ ...valid(), password: 'secret', role: 'admin', email: 'login@example.org' });
  assert.equal('role' in result, false); assert.equal('password' in result, false); assert.equal('email' in result, false);
});
test('profile input rejects unsafe URLs, images and overlong bio while preserving multiline bio', () => {
  for (const website of ['javascript:alert(1)', 'http://example.org', 'https:example.org', 'https://name:pass@example.org', 'https://example.org\\x']) assert.ok(profileError({ ...valid(), website }));
  assert.ok(profileError({ ...valid(), contactEmail: 'invalid' }));
  assert.ok(profileError({ ...valid(), bio: 'x'.repeat(501) }));
  assert.equal(profileError({ ...valid(), bio: 'First\nSecond', website: 'https://example.org', contactEmail: 'contact@example.org' }), '');
  assert.equal(safeAvatar('https://example.org/avatar.png'), '');
  assert.equal(safeAvatar('data:image/svg+xml;base64,AAAA'), '');
  assert.equal(safeAvatar('data:image/png;base64,'+'A'.repeat(350001)), '');
});
test('password check requires current password, matching repeat, policy minimum and UTF-8 byte limit', () => {
  assert.match(passwordChangeError('', 'a'.repeat(24), 'a'.repeat(24), 24), /current/);
  assert.match(passwordChangeError('old', 'a'.repeat(24), 'b'.repeat(24), 24), /match/);
  assert.match(passwordChangeError('old', 'a'.repeat(18), 'a'.repeat(18), 24), /24/);
  assert.match(passwordChangeError('old', '😀'.repeat(24), '😀'.repeat(24), 24), /72/);
  assert.equal(passwordChangeError('old', 'a'.repeat(24), 'a'.repeat(24), 24), '');
  assert.match(passwordChangeError('old', 'a'.repeat(24)+'\n', 'a'.repeat(24)+'\n', 24), /control/);
});
test('committed profile update remains successful when session refresh fails', async () => {
  const user=valid(); let refreshed=false;
  const result=await saveAndRefreshProfile({patch:async(path, body)=>{assert.equal(path,'/users/me/account');assert.deepEqual(body,user);return {data:{user}};}},user,async()=>{refreshed=true;throw new Error('offline');});
  assert.deepEqual(result,{user,refreshFailed:true});assert.equal(refreshed,true);
});
test('failed profile write never refreshes and remains a failure', async () => {
  let refreshed=false;
  await assert.rejects(saveAndRefreshProfile({patch:async()=>{throw new Error('write failed');}},valid(),async()=>{refreshed=true;}),/write failed/);
  assert.equal(refreshed,false);
});
function routerFor(role) {
  const source=readFileSync(new URL('./router/index.js',import.meta.url),'utf8').replace(/^import (\w+) from '[^']+\.vue';\r?\n/gm,'const $1 = {};\n').replace(/^import .*;\r?\n/gm,'').replace(/component: \(\) => import\('[^']+'\)/g,'component: {}').replace('export function createDocManRouter','function createDocManRouter');
  return new Function('createRouter','createMemoryHistory','createWebHistory','useAuth',`${source};return createDocManRouter;`)(createRouter,createMemoryHistory,createMemoryHistory,()=>({isAuthenticated:ref(Boolean(role)),hasRole:roles=>roles.includes(role)}))({embedded:true});
}
test('all signed-in roles can access profile; old account links preserve query and hash',async()=>{
 for(const role of ['viewer','editor','admin','superadmin']) {
  const router=routerFor(role);await router.push('/account?source=bookmark#password');
  assert.equal(router.currentRoute.value.name,'my-profile');assert.equal(router.currentRoute.value.fullPath,'/profile?source=bookmark#password');
 }
});
test('anonymous profile access redirects to login',async()=>{
 const router=routerFor(null);await router.push('/account');assert.equal(router.currentRoute.value.name,'login');assert.equal(router.currentRoute.value.query.redirect,'/profile');
});
