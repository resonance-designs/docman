/*
 * @name verifyAuditConcurrency
 * @description Force two independent publication retries to race against real MongoDB.
 * Usage: MONGO_URI=mongodb://127.0.0.1:27199/docman_verify_audit node src/scripts/verifyAuditConcurrency.js
 * Uses a new disposable database per run; never drops or edits historical audit entries.
 * @version 2.3.0
 * @license UNLICENSED
 */
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import Doc from '../models/Doc.js';
import File from '../models/File.js';
import DocumentRevision from '../models/DocumentRevision.js';
import { record, verifyChain, computeEntryHash, AUDIT_ACTIONS } from '../services/auditService.js';
import { approveVersion } from '../services/approvalService.js';

const uri = process.env.MONGO_URI;
assert(uri && new URL(uri).pathname.slice(1).startsWith('docman_verify_'), 'Use a disposable docman_verify_* database');
const worker = process.argv.includes('--worker');
const dbName = worker ? process.env.AUDIT_TEST_DB : `docman_verify_audit_${randomUUID().replaceAll('-', '')}`;
await mongoose.connect(uri, { dbName });
const children = [];
try {
    if (worker) {
        // Barrier sits after both lookups and hash construction but before either insert.
        const create = AuditLog.create.bind(AuditLog);
        let gated = false;
        AuditLog.create = async (...args) => {
            if (!gated) {
                gated = true;
                await new Promise(resolve => {
                    process.once('message', resolve);
                    process.send({ ready: true });
                });
            }
            return create(...args);
        };
        const doc = await Doc.findById(process.env.AUDIT_TEST_DOC);
        const result = await approveVersion({ user: { _id: doc.author, role: 'superadmin' } }, doc, 1);
        assert(result.published);
        process.send({ done: true });
    } else {
        await Promise.all([AuditLog.init(), Doc.init(), File.init(), DocumentRevision.init()]);
        const user = new mongoose.Types.ObjectId();
        const doc = await Doc.create({ title: 'Concurrency fixture', description: 'Disposable test',
            author: user, category: new mongoose.Types.ObjectId(), opensForReview: new Date(), owners: [user] });
        const file = await File.create({ filename: 'test.txt', originalname: 'test.txt', path: '/unused/test.txt',
            mimetype: 'text/plain', size: 0, documentId: doc._id, status: 'publishing',
            approvals: [{ user, decision: 'approved' }] });
        let ready = 0;
        await Promise.all(Array.from({ length: 2 }, () => new Promise((resolve, reject) => {
            const child = fork(fileURLToPath(import.meta.url), ['--worker'], {
                env: { ...process.env, AUDIT_FAIL_CLOSED: 'true', AUDIT_TEST_DB: dbName, AUDIT_TEST_DOC: String(doc._id) },
                stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
            });
            children.push(child);
            const timeout = setTimeout(() => { child.kill(); reject(new Error('Concurrency worker timed out')); }, 30000);
            let done = false;
            child.on('message', message => {
                if (message.ready && ++ready === 2) children.forEach(c => c.send({ go: true }));
                if (message.done) done = true;
            });
            child.on('error', error => { clearTimeout(timeout); reject(error); });
            child.on('exit', code => {
                clearTimeout(timeout);
                if (code === 0 && done) resolve(); else reject(new Error(`Worker failed: ${code}`));
            });
        })));
        const events = await AuditLog.find({ action: AUDIT_ACTIONS.VERSION_PUBLISH }).lean();
        assert.equal(events.length, 1);
        assert.equal((await Doc.findById(doc._id)).versionHistory.length, 1);
        assert.equal(await DocumentRevision.countDocuments({ publicationFileId: file._id }), 1);
        assert.equal((await File.findById(file._id)).status, 'approved');
        console.log('PASS forced concurrent publication retries: one audit entry, history entry and revision');

        // Prove the event key rejects duplicates even when the sequence would be available.
        const duplicate = { ...events[0], _id: new mongoose.Types.ObjectId(), sequence: 2, prevHash: events[0].hash };
        duplicate.hash = computeEntryHash(duplicate);
        await assert.rejects(AuditLog.create(duplicate), error => error.code === 11000 && error.keyPattern?.idempotencyKey === 1);
        await record(null, { action: AUDIT_ACTIONS.FILE_DOWNLOAD, resourceType: 'file', resourceId: String(file._id) });
        assert.deepEqual((await AuditLog.find().sort({ sequence: 1 }).lean()).map(e => e.sequence), [1, 2]);
        assert((await verifyChain()).valid);
        console.log('PASS database uniqueness and gap-free valid audit chain after the race');
    }
} finally {
    for (const child of children) if (child.exitCode === null) child.kill();
    await mongoose.disconnect();
    if (worker && process.connected) process.disconnect();
}
