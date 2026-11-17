/*
 * @name verifyWorkflowRecovery
 * @description Verify restored files/audit records, interrupted publication recovery, and signed-token revocation.
 * Requires smoke-test data in a disposable docman_verify_* database and a matching UPLOAD_DIR.
 * @version 2.3.0
 * @license UNLICENSED
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Intentionally restricted to disposable verification databases.
const uri = process.env.MONGO_URI;
const name = uri && new URL(uri).pathname.slice(1);
assert(name?.startsWith('docman_verify_'), 'Use a disposable docman_verify_* database');
assert(process.env.UPLOAD_DIR, 'UPLOAD_DIR must point at disposable restored files');
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.AUTHENTIK_ISSUER = 'https://verification.invalid/';
process.env.AUTHENTIK_AUDIENCE = 'verification';
process.env.AUTHENTIK_JWT_PUBLIC_KEY = keys.publicKey.export({ type: 'spki', format: 'pem' });
const { default: Doc } = await import('../models/Doc.js');
const { default: File } = await import('../models/File.js');
const { default: User } = await import('../models/User.js');
const { default: Revision } = await import('../models/DocumentRevision.js');
const { default: BlacklistedToken } = await import('../models/BlacklistedToken.js');
const { verifyChain } = await import('../services/auditService.js');
const { submitVersion, approveVersion } = await import('../services/approvalService.js');
const { resolveAuthentikTokenIdentity } = await import('../services/identityService.js');
const { sha256File } = await import('../lib/fileIntegrity.js');

await mongoose.connect(uri);
try {
    assert((await verifyChain()).valid, 'restored audit chain');
    const files = await File.find({ sha256: { $ne: null } });
    for (const file of files) {
        assert.equal(await sha256File(path.join(process.env.UPLOAD_DIR, file.filename)), file.sha256);
    }
    console.log(`PASS restored audit chain and ${files.length} file checksums`);
    const admin = await User.findOne({ role: 'superadmin' });
    assert(admin);
    const doc = await Doc.findOne({ title: /^Smoke policy/ });
    assert(doc);
    const approver = { _id: new mongoose.Types.ObjectId(), role: 'superadmin' };
    const filename = `recovery-${crypto.randomUUID()}.txt`;
    const filePath = path.join(process.env.UPLOAD_DIR, filename);
    await fs.writeFile(filePath, 'Recovery test bytes');
    const submitted = await submitVersion({ user: admin, headers: {} }, doc, {
        filename, originalname: filename, path: filePath, mimetype: 'text/plain', size: 19,
    });
    const originalUpdate = File.updateMany;
    File.updateMany = async () => { throw new Error('Injected publication interruption'); };
    try {
        await assert.rejects(approveVersion({ user: approver, headers: {} }, doc, submitted.version), /Injected/);
    } finally { File.updateMany = originalUpdate; }
    assert.equal((await File.findById(submitted._id)).status, 'publishing');
    // Simulate a new request/process by reloading the document rather than using stale in-memory state.
    const result = await approveVersion({ user: approver, headers: {} }, await Doc.findById(doc._id), submitted.version);
    assert(result.published);
    const recovered = await Doc.findById(doc._id);
    assert.equal(recovered.currentVersion, submitted.version);
    assert.equal(recovered.versionHistory.filter(h => h.version === submitted.version).length, 1);
    assert.equal(await Revision.countDocuments({ publicationFileId: submitted._id }), 1);
    assert.equal((await File.findById(submitted._id)).status, 'approved');
    assert((await verifyChain()).valid);
    console.log('PASS interrupted publication resumes with one history entry and one revision');

    admin.authentikSub = `verify-${crypto.randomUUID()}`;
    await admin.save();
    const token = jwt.sign({ sub: admin.authentikSub }, keys.privateKey, {
        algorithm: 'RS256', issuer: process.env.AUTHENTIK_ISSUER, audience: process.env.AUTHENTIK_AUDIENCE, expiresIn: '5m',
    });
    assert.equal((await resolveAuthentikTokenIdentity(token)).user.id, String(admin._id));
    await BlacklistedToken.create({ token, expiresAt: new Date(Date.now() + 300000) });
    await assert.rejects(resolveAuthentikTokenIdentity(token), /invalidated/);
    console.log('PASS real signed Authentik JWT accepted before revocation and rejected after');
} finally { await mongoose.disconnect(); }
