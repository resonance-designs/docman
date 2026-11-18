/*
 * @name migrateComplianceFields
 * @file /docman/backend/src/scripts/migrateComplianceFields.js
 * @description One-time, idempotent migration for 2.3.0 (audit log, revisions, approval workflow):
 *   - Marks existing file versions as "approved" (they were live before approvals existed)
 *   - Records SHA-256 checksums for existing stored files (reports missing files)
 *   - Sets Doc.latestVersion and soft-delete defaults
 *   - Creates a baseline revision snapshot for documents that have none
 *   - Builds indexes for the new collections
 *   - Writes a system.migration entry to the audit log
 *
 * Usage (from backend/):  NODE_ENV=production node src/scripts/migrateComplianceFields.js [--dry-run]
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const backendDir = path.resolve(path.dirname(__filename), "../..");
if (process.env.NODE_ENV === "development") {
    dotenv.config({ path: path.join(backendDir, ".env.dev") });
} else if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: path.join(backendDir, ".env.prod") });
} else {
    dotenv.config({ path: path.join(backendDir, ".env") });
}

const DRY_RUN = process.argv.includes("--dry-run");

export async function migrateComplianceFields({ dryRun = DRY_RUN, log = console.log } = {}) {
    const { default: Doc } = await import("../models/Doc.js");
    const { default: File } = await import("../models/File.js");
    const { default: AuditLog } = await import("../models/AuditLog.js");
    const { default: DocumentRevision } = await import("../models/DocumentRevision.js");
    const { default: SystemSetting } = await import("../models/SystemSetting.js");
    const { recordRevision } = await import("../services/revisionService.js");
    const { record, AUDIT_ACTIONS } = await import("../services/auditService.js");
    const { sha256File, resolveStoredFile } = await import("../lib/fileIntegrity.js");

    const summary = {
        dryRun,
        filesMarkedApproved: 0,
        checksumsRecorded: 0,
        missingFiles: [],
        documentsUpdated: 0,
        baselineRevisions: 0,
    };

    // Do not silently renumber existing versions or discard conflicting uploads.
    const duplicateVersions = await File.aggregate([
        { $group: { _id: { documentId: '$documentId', version: '$version' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }, { $limit: 1 },
    ]);
    const duplicatePending = await File.aggregate([
        { $match: { status: { $in: ['pending_approval', 'publishing'] } } },
        { $group: { _id: '$documentId', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }, { $limit: 1 },
    ]);
    if (duplicateVersions.length || duplicatePending.length) {
        throw new Error('Conflicting file versions exist. Resolve duplicate version numbers or active uploads before migrating. No files were changed.');
    }

    if (!dryRun) {
        const indexes = await File.collection.indexes().catch((error) => {
            if (error.code === 26) return [];
            throw error;
        });
        const oldVersionIndex = indexes.find((index) => index.name === 'documentId_1_version_1' && !index.unique);
        if (oldVersionIndex) await File.collection.dropIndex(oldVersionIndex.name);
        for (const model of [AuditLog, DocumentRevision, SystemSetting, File, Doc]) {
            await model.createIndexes();
        }
        log("Indexes ensured.");
    }

    // 1. Legacy file versions -> approved
    const statusFilter = { $or: [{ status: { $exists: false } }, { status: null }] };
    summary.filesMarkedApproved = await File.countDocuments(statusFilter);
    if (!dryRun && summary.filesMarkedApproved) {
        await File.updateMany(statusFilter, { $set: { status: "approved" } });
    }
    log(`File versions marked approved: ${summary.filesMarkedApproved}`);

    // 2. Checksums
    const withoutChecksum = await File.find({ $or: [{ sha256: { $exists: false } }, { sha256: null }] });
    for (const file of withoutChecksum) {
        const absolutePath = resolveStoredFile(file.filename);
        if (!absolutePath || !fs.existsSync(absolutePath)) {
            summary.missingFiles.push({ fileId: String(file._id), documentId: String(file.documentId), filename: file.filename });
            continue;
        }
        const sha256 = await sha256File(absolutePath);
        if (!dryRun) await File.updateOne({ _id: file._id }, { $set: { sha256 } });
        summary.checksumsRecorded += 1;
    }
    log(`Checksums recorded: ${summary.checksumsRecorded}; missing stored files: ${summary.missingFiles.length}`);

    // 3 + 4. Documents
    const missingDeletedAt = await Doc.countDocuments({ deletedAt: { $exists: false } });
    if (!dryRun && missingDeletedAt) {
        await Doc.updateMany({ deletedAt: { $exists: false } }, { $set: { deletedAt: null } });
    }
    const docs = await Doc.find({}).setOptions({ includeDeleted: true });
    for (const doc of docs) {
        const latest = await File.findOne({ documentId: doc._id }).sort({ version: -1 }).select("version").lean();
        const latestVersion = latest?.version || 0;
        if (doc.latestVersion !== latestVersion) {
            summary.documentsUpdated += 1;
            // updateOne (not save) so legacy records that fail newer validators are still migrated
            if (!dryRun) await Doc.updateOne({ _id: doc._id }, { $set: { latestVersion } }).setOptions({ includeDeleted: true });
            doc.latestVersion = latestVersion;
        }
        const hasRevision = await DocumentRevision.exists({ documentId: doc._id });
        if (!hasRevision) {
            summary.baselineRevisions += 1;
            if (!dryRun) {
                await recordRevision({ doc, before: null, action: "create", user: null, reason: "Baseline snapshot (2.3.0 migration)" });
            }
        }
    }
    log(`Documents updated: ${summary.documentsUpdated}; baseline revisions created: ${summary.baselineRevisions}`);

    if (!dryRun) {
        await record(null, {
            action: AUDIT_ACTIONS.SYSTEM_MIGRATION,
            resourceType: "system",
            resourceId: "migrateComplianceFields",
            summary: "Ran 2.3.0 compliance migration",
            metadata: { ...summary, missingFiles: summary.missingFiles.slice(0, 200) },
        });
    }

    if (summary.missingFiles.length) {
        log("Missing stored files (first 50):");
        summary.missingFiles.slice(0, 50).forEach((entry) => log(`  ${entry.documentId} ${entry.filename}`));
    }
    return summary;
}

async function main() {
    const { connectDB } = await import("../config/db.js");
    try {
        await connectDB();
        const summary = await migrateComplianceFields();
        console.log(`[migrateComplianceFields] ${DRY_RUN ? "Dry run" : "Migration"} complete.`, JSON.stringify({ ...summary, missingFiles: summary.missingFiles.length }));
    } catch (error) {
        console.error("[migrateComplianceFields] Failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main();
}
