// Standalone MongoDB regression check. Starts only a disposable loopback server;
// proves child ownership before enabling any database writes. No application server/SMTP.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { once } from 'node:events';
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import Notification from '../models/Notification.js';
import { projectTeamUpdate, reconcileProjectTeams, reconcilePendingProjectTeams } from '../services/projectTeamReconciliation.js';
import { updateProject } from '../controllers/projectsController.js';

mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
const directory = await mkdtemp(join(tmpdir(), 'docman-team-reconcile-'));
const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const mongo = spawn('mongod', ['--dbpath', directory, '--bind_ip', '127.0.0.1', '--port', String(port), '--nounixsocket', '--logpath', join(directory, 'mongo.log')], { stdio: 'ignore' });
let spawnError; mongo.on('error', error => { spawnError = error; });
const stopped = new Promise(resolve => mongo.once('close', resolve));
const realUpdate = Team.updateOne;
try {
    for (let attempt = 0; attempt < 60; attempt++) {
        if (spawnError || mongo.exitCode !== null) throw spawnError || new Error('Fixture MongoDB exited');
        try { await mongoose.connect(`mongodb://127.0.0.1:${port}/docman_reconciliation_test`, { serverSelectionTimeoutMS: 200, autoCreate: false, autoIndex: false }); break; }
        catch { if (attempt === 59) throw new Error('Fixture startup timed out'); await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    const admin = mongoose.connection.db.admin();
    assert.equal((await admin.command({ serverStatus: 1 })).pid, mongo.pid);
    assert.equal((await admin.command({ getCmdLineOpts: 1 })).parsed.storage.dbPath, directory);
    assert.equal(mongo.exitCode, null);
    // All writes below target the verified child.
    const actor = new mongoose.Types.ObjectId(), pid = new mongoose.Types.ObjectId();
    const a = new mongoose.Types.ObjectId(), b = new mongoose.Types.ObjectId(), c = new mongoose.Types.ObjectId();
    for (const [id, projects] of [[a, [pid]], [b, []], [c, []]]) {
        await Team.collection.insertOne({ _id: id, name: String(id), owner: actor, members: [], projects });
    }
    await Project.collection.insertOne({ _id: pid, name: 'Fixture', owner: actor, collaborators: [], teams: [a], teamSyncRevision: 0 });
    let response;
    const res = { status(code) { this.code = code; return this; }, json(value) { response = value; return this; } };
    let failures = 1;
    Team.updateOne = function(...args) { if (failures > 0) { failures--; return Promise.reject(new Error('injected transient failure')); } return realUpdate.apply(this, args); };
    await updateProject({ params: { id: String(pid) }, user: { _id: actor, role: 'superadmin' }, body: { teamIds: [String(b)] } }, res);
    assert.equal(res.code, 200); assert.equal(response.relationshipsPending, true);
    assert.equal((await Project.collection.findOne({ _id: pid })).teamSyncPending, true);
    Team.updateOne = realUpdate;
    await reconcilePendingProjectTeams();
    const linked = async id => (await Team.collection.findOne({ _id: id })).projects.some(value => String(value) === String(pid));
    assert.equal(await linked(a), false); assert.equal(await linked(b), true);
    assert.ok(await Notification.countDocuments({ relatedTeam: b, title: 'Team updated' }) > 0);
    assert.ok(await Notification.countDocuments({ relatedProject: pid, title: 'Project updated' }) > 0);

    await Project.findByIdAndUpdate(pid, projectTeamUpdate([a], [a, b]));
    let release, entered;
    const paused = new Promise(resolve => { entered = resolve; });
    let delay = true;
    Team.updateOne = async function(...args) { if (delay) { delay = false; entered(); await new Promise(resolve => { release = resolve; }); } return realUpdate.apply(this, args); };
    const old = reconcileProjectTeams(pid); await paused;
    await Project.findByIdAndUpdate(pid, projectTeamUpdate([c], [a, b]));
    await reconcileProjectTeams(pid); release(); await old;
    assert.equal(await linked(a), false); assert.equal(await linked(b), false); assert.equal(await linked(c), true);

    await Project.findByIdAndUpdate(pid, projectTeamUpdate([a], [a, b, c]));
    delay = true;
    const deletingPause = new Promise(resolve => { entered = resolve; });
    const stale = reconcileProjectTeams(pid); await deletingPause;
    const deletion = projectTeamUpdate([], [a, b, c]); deletion.$set.teamSyncDeleting = true;
    await Project.findByIdAndUpdate(pid, deletion);
    assert.equal(await Project.findById(pid), null);
    assert.equal(await Project.countDocuments({ _id: pid }), 0);
    assert.deepEqual(await Project.aggregate([{ $match: { _id: pid } }]), []);
    await reconcileProjectTeams(pid); release(); await stale;
    assert.equal(await Project.collection.findOne({ _id: pid }), null);
    assert.equal(await linked(a), false); assert.equal(await linked(b), false); assert.equal(await linked(c), false);
    console.log('PASS: standalone MongoDB pending repair, notifications, stale-worker fencing and deletion cleanup.');
} finally {
    Team.updateOne = realUpdate;
    await mongoose.disconnect();
    if (mongo.exitCode === null && !spawnError) mongo.kill('SIGTERM');
    const kill = setTimeout(() => mongo.kill('SIGKILL'), 5000); kill.unref();
    await stopped; clearTimeout(kill);
    await rm(directory, { recursive: true, force: true });
}
