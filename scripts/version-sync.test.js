import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('release sync updates only allowed metadata and leaves other comments intact', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docman-version-test-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('docman-version-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const write = (name, value) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), value);
  };
  const read = name => fs.readFileSync(path.join(root, name), 'utf8');
  for (const dir of ['', 'backend/', 'frontend/', 'frontend-vue/', 'docs-site/']) {
    write(`${dir}package.json`, JSON.stringify({type:'module', version:'3.0.0', author:'Owner', license:'UNLICENSED'}));
    write(`${dir}package-lock.json`, JSON.stringify({version:'3.0.0', packages:{'':{version:'3.0.0'}, 'node_modules/example':{version:'1.2.3'}}}));
  }
  write('project-config.json', JSON.stringify({version:'3.0.0', custom:true}));
  const allowed = ['README.md','backend/README.md','frontend/README.md','frontend/src/README.md',
    'frontend-vue/README.md','docs-site/README.md','docs/architecture/README.md','docs/manuals/README.md',
    'docs/DEVELOPER_ONBOARDING.md','frontend/src/App.jsx','install.sh','update.sh'];
  for (const name of allowed) write(name, name.endsWith('.sh') ? '#!/bin/bash\r\n# @version 3.0.0\r\necho unchanged\r\n' : '/*\r\n * @version 3.0.0\r\n */\r\n');
  write('README.md', 'https://img.shields.io/badge/Version-3.0.0-orange\nhttps://img.shields.io/badge/Latest_Release-v3.0.0-green\n');
  const excluded = ['backend/src/controller.js','frontend/src/Other.jsx','frontend-vue/src/App.vue',
    'scripts/other.js','docs/other.md','CHANGELOG.md','node_modules/package.json'];
  for (const name of excluded) write(name, '/*\n * @author Keep me\n * @version 3.0.0\n * @license UNLICENSED\n */\n');
  write('scripts/version-sync.js', fs.readFileSync(fileURLToPath(new URL('./version-sync.js', import.meta.url)), 'utf8'));
  const before = Object.fromEntries(excluded.map(name=>[name,read(name)]));
  const run = (...args) => spawnSync(process.execPath, ['scripts/version-sync.js', ...args], {cwd:root,encoding:'utf8'});
  const result = run('3.0.1');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Updated 23 file\(s\)/);
  for (const name of allowed) assert.ok(read(name).includes('3.0.1'), name);
  for (const name of excluded) assert.equal(read(name), before[name], name);
  for (const dir of ['', 'backend/', 'frontend/', 'frontend-vue/', 'docs-site/']) {
    assert.equal(JSON.parse(read(`${dir}package.json`)).version, '3.0.1');
    const lock = JSON.parse(read(`${dir}package-lock.json`));
    assert.equal(lock.version, '3.0.1');
    assert.equal(lock.packages[''].version, '3.0.1');
    assert.equal(lock.packages['node_modules/example'].version, '1.2.3');
  }
  assert.equal(JSON.parse(read('project-config.json')).custom, true);
  assert.ok(read('install.sh').includes('\r\n# @version 3.0.1\r\n'));
  assert.equal(run().status, 0);
  assert.equal(JSON.parse(read('package.json')).version, '3.0.2');
  const invalid = run('not-a-version');
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(read('package.json')).version, '3.0.2');
  for (const name of excluded) assert.equal(read(name), before[name], name);
});
