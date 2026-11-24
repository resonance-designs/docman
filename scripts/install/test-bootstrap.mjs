// Requires installed backend dependencies and a local mongod executable; uses only a disposable DB.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { once } from 'node:events';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import bcrypt from '../../backend/node_modules/bcrypt/bcrypt.js';

const bootstrap = fileURLToPath(new URL('./bootstrap.mjs', import.meta.url));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function stopChild(child, stopped) {
    if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
    child.kill('SIGTERM');
    const force = setTimeout(() => child.kill('SIGKILL'), 2000);
    try { await stopped; } finally { clearTimeout(force); }
}
async function waitForChild(child, signal) {
    const complete = new Promise(resolve => child.once('close', code => resolve([code])));
    let childError;
    child.on('error', error => { childError = error; });
    const cancel = () => { void stopChild(child, complete); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
        if (signal.aborted) cancel();
        const result = await complete;
        signal.throwIfAborted();
        if (childError) throw childError;
        return result;
    } finally {
        signal.removeEventListener('abort', cancel);
        await stopChild(child, complete);
    }
}
test('fresh bootstrap and retries preserve accounts, keys/settings and one creation audit', { timeout: 60000 }, async (t) => {
    const probe = createServer();
    probe.listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    const directory = await mkdtemp(join(tmpdir(), 'docman-installer-test-'));
    const mongo = spawn('mongod', ['--dbpath', directory, '--bind_ip', '127.0.0.1', '--port', String(port), '--logpath', join(directory, 'mongo.log')], { stdio: 'ignore' });
    let spawnError;
    mongo.on('error', error => { spawnError = error; });
    const stopped = new Promise(resolve => mongo.once('close', resolve));
    const uri = `mongodb://127.0.0.1:${port}/docman_installer_test`;
    try {
        let connected = false;
        for (let attempt = 0; attempt < 40; attempt++) {
            t.signal.throwIfAborted();
            if (spawnError) throw spawnError;
            assert.equal(mongo.exitCode, null, 'fixture MongoDB exited before readiness');
            try { await mongoose.connect(uri, { serverSelectionTimeoutMS: 300 }); connected = true; }
            catch { await sleep(200); }
            if (connected) {
                const status = await mongoose.connection.db.admin().serverStatus();
                assert.equal(status.pid, mongo.pid, 'connected MongoDB must be the fixture child');
                assert.equal(mongo.exitCode, null, 'fixture MongoDB must remain running');
                break;
            }
        }
        assert.ok(connected, 'disposable MongoDB started');
        const config = { person: { firstname: 'Installer', lastname: 'Fixture', username: 'installer-fixture', email: 'installer@example.invalid', password: randomBytes(24).toString('hex') }, uploadMB: 50 };
        const env = { ...process.env, NODE_ENV: 'production', MONGO_URI: uri, AUDIT_FAIL_CLOSED: 'true', AUDIT_STDOUT: 'false',
            DOCUMENT_ENCRYPTION_KEY: randomBytes(32).toString('hex'), EMAIL_SETTINGS_KEY: randomBytes(32).toString('hex') };
        async function run() {
            t.signal.throwIfAborted();
            const child = spawn(process.execPath, [bootstrap], { env, stdio: ['pipe', 'pipe', 'pipe'] });
            let output = '';
            child.stdout.on('data', data => { output += data; });
            child.stderr.on('data', data => { output += data; });
            const complete = waitForChild(child, t.signal);
            child.stdin.end(JSON.stringify(config));
            const [code] = await complete;
            assert.ok(!output.includes(config.person.password), 'password absent from output');
            assert.ok(!output.includes(env.DOCUMENT_ENCRYPTION_KEY), 'machine key absent from output');
            return { code, output };
        }
        const first = await run();
        assert.equal(first.code, 0, first.output);
        const db = mongoose.connection.db;
        const initial = await db.collection('users').findOne({ username: config.person.username });
        assert.equal(initial.role, 'superadmin');
        assert.ok(await bcrypt.compare(config.person.password, initial.password));
        assert.equal(await db.collection('categories').countDocuments({ name: 'General' }), 1);
        assert.equal((await db.collection('systemsettings').findOne({ key: 'documents.storage' })).value.encryptAtRest, true);
        assert.equal((await db.collection('emailsettings').findOne({ _id: 'outbound' })).config.provider, 'disabled');
        await db.collection('systemsettings').updateOne({ key: 'documents.storage' }, { $set: { 'value.maxUploadMB': 37 } });
        await db.collection('emailsettings').updateOne({ _id: 'outbound' }, { $set: { 'config.fromName': 'Preserve me' } });
        const second = await run();
        assert.equal(second.code, 0, second.output);
        assert.equal(await db.collection('users').countDocuments(), 1);
        assert.equal((await db.collection('users').findOne({ _id: initial._id })).password, initial.password);
        assert.equal(await db.collection('auditlogs').countDocuments({ action: 'user.create' }), 1);
        assert.equal((await db.collection('systemsettings').findOne({ key: 'documents.storage' })).value.maxUploadMB, 37);
        assert.equal((await db.collection('emailsettings').findOne({ _id: 'outbound' })).config.fromName, 'Preserve me');
        await db.collection('users').updateOne({ _id: initial._id }, { $set: { role: 'viewer' } });
        const conflict = await run();
        assert.equal(conflict.code, 1, 'conflicting existing account must stop bootstrap');
        assert.equal((await db.collection('users').findOne({ _id: initial._id })).role, 'viewer', 'retry must not promote an existing account');
        assert.equal(await db.collection('auditlogs').countDocuments({ action: 'user.create' }), 1);
    } finally {
        await mongoose.disconnect();
        await stopChild(mongo, stopped);
        await rm(directory, { recursive: true, force: true });
    }
});

test('aborting a stalled bootstrap child terminates it and settles the wait', { timeout: 10000 }, async () => {
    const controller = new AbortController();
    const child = spawn(process.execPath, ['-e', "process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000)"], { stdio: ['ignore', 'pipe', 'ignore'] });
    const waiting = waitForChild(child, controller.signal);
    await once(child.stdout, 'data');
    controller.abort();
    await assert.rejects(waiting, { name: 'AbortError' });
    assert.notEqual(child.signalCode, null, 'child must be reaped before the rejected wait returns');
});
