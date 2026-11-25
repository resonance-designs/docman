import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMemoryHistory, createRouter } from 'vue-router';
import { ref } from 'vue';

function routerFor(role) {
  // Exercise the application's actual route records/guard, substituting view stubs only.
  const source = readFileSync(new URL('./router/index.js', import.meta.url), 'utf8')
    .replace(/^import (\w+) from '[^']+\.vue';\r?\n/gm, 'const $1 = {};\n')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export function createDocManRouter', 'function createDocManRouter');
  const auth = { isAuthenticated: ref(Boolean(role)), hasRole: roles => roles.includes(role) };
  const factory = new Function('createRouter', 'createMemoryHistory', 'createWebHistory', 'useAuth', `${source};return createDocManRouter;`)(
    createRouter, createMemoryHistory, createMemoryHistory, () => auth,
  );
  return factory({ embedded: true });
}

for (const [path, section] of [['users', 'users'], ['audit', 'audit'], ['authentik-linking', 'authentik']]) {
  test(`legacy ${path} opens the integrated security section`, async () => {
    const router = routerFor('superadmin');
    await router.push(`/admin/${path}?source=bookmark#saved`);
    assert.equal(router.currentRoute.value.name, 'system-settings');
    assert.deepEqual(router.currentRoute.value.query, { source: 'bookmark', tab: 'security', section });
    assert.equal(router.currentRoute.value.hash, '#saved');
  });
}

test('admins retain audit and ordinary settings access but cannot bypass privileged tabs', async () => {
  const router = routerFor('admin');
  for (const path of ['/admin/system', '/admin/system?tab=storage', '/admin/audit']) {
    await router.push(path);
    assert.equal(router.currentRoute.value.name, 'system-settings');
  }
  for (const path of ['/admin/users', '/admin/authentik-linking', '/admin/system?tab=security&section=users', '/admin/system?tab=security&section=authentik', '/admin/system?tab=email', '/admin/system?tab=updates']) {
    await router.push(path);
    assert.equal(router.currentRoute.value.name, 'home', path);
  }
});

test('unauthenticated legacy navigation retains the integrated login return destination', async () => {
  const router = routerFor(null);
  await router.push('/admin/users');
  assert.equal(router.currentRoute.value.name, 'login');
  assert.equal(router.currentRoute.value.query.redirect, '/admin/system?tab=security&section=users');
});

test('nonadministrative roles cannot open system settings through a legacy redirect', async () => {
  for (const role of ['viewer', 'editor']) {
    const router = routerFor(role);
    for (const path of ['/admin/audit', '/admin/users', '/admin/authentik-linking', '/admin/system']) {
      await router.push(path);
      assert.equal(router.currentRoute.value.name, 'home');
    }
  }
});

test('browser history restores the selected settings tab and security section', async () => {
  const router = routerFor('superadmin');
  await router.push('/admin/system?tab=security&section=users');
  await router.push('/admin/system?tab=storage&section=users');
  const navigation = () => new Promise(resolve => {
    const remove = router.afterEach(() => { remove(); resolve(); });
  });
  let settled = navigation();router.back();await settled;
  assert.equal(router.currentRoute.value.query.tab, 'security');
  assert.equal(router.currentRoute.value.query.section, 'users');
  settled = navigation();router.forward();await settled;
  assert.equal(router.currentRoute.value.query.tab, 'storage');
});
