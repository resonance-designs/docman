/*
 * @name approvalService
 * @file /docman/backend/src/services/approvalService.js
 * @service approvalService
 * @description Change-approval workflow for document file versions.
 *
 *   upload ──> pending_approval ──(enough approvals)──> approved (published, becomes currentVersion)
 *                     │                                         │
 *                     ├──(any approver rejects)──> rejected     └──(newer version published)──> superseded
 *                     └──(uploader/admin withdraws)──> withdrawn
 *
 * Rules:
 *  - Only one version per document may be pending at a time.
 *  - Approvers are the document's designated approvers (or its owners if none are designated) plus admins.
 *  - Nobody may approve a version they uploaded (separation of duties) unless APPROVAL_ALLOW_SELF_APPROVAL=true.
 *  - APPROVAL_REQUIRED=false publishes uploads immediately (still audited).
 *  - APPROVAL_MIN_APPROVALS sets how many distinct approvals publish a version (default 1).
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import fs from "fs";
import Doc from "../models/Doc.js";
import { saveProtection, removeProtection } from './storedFileService.js';
import File from "../models/File.js";
import { record, AUDIT_ACTIONS } from "./auditService.js";
import { recordRevision, snapshotDocument } from "./revisionService.js";
import { sha256File } from "../lib/fileIntegrity.js";
import { canApproveDocument, canEditDocument, isAdmin } from "../middleware/documentAccess.js";

export class WorkflowError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "WorkflowError";
        this.statusCode = statusCode;
    }
}

function envFlag(name, fallback) {
    const value = process.env[name];
    if (value === undefined || value === "") return fallback;
    return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export function getApprovalPolicy() {
    const minApprovals = parseInt(process.env.APPROVAL_MIN_APPROVALS || "1", 10);
    return {
        required: envFlag("APPROVAL_REQUIRED", true),
        minApprovals: Number.isFinite(minApprovals) && minApprovals > 0 ? minApprovals : 1,
        allowSelfApproval: envFlag("APPROVAL_ALLOW_SELF_APPROVAL", false),
    };
}

function userIdOf(user) {
    return (user?._id || user?.id || "").toString();
}

/** Versions in these states are only visible to editors/approvers of the document. */
export function isRestrictedStatus(status) {
    return ["pending_approval", "publishing", "rejected", "withdrawn"].includes(status || "approved");
}

/** Whether a user may see/download a given file version. */
export function canAccessFileVersion(doc, file, user) {
    if (!isRestrictedStatus(file.status)) return true;
    return canEditDocument(doc, user) || canApproveDocument(doc, user) || userIdOf(user) === String(file.uploadedBy || "");
}

async function removeOrphanUpload(file) {
    if (file?.path) {
        await fs.promises.unlink(file.path).catch(() => {});
    }
}

/**
 * Publish an approved version: supersede the previously published version and point the document at it.
 */
async function publishVersion(req, doc, file) {
    // Keep the file in publishing until every durable step succeeds. Retrying approval
    // resumes this operation; the document update and revision insertion are idempotent.
    const before = file.publicationBefore || snapshotDocument(doc);
    const updatedDoc = await Doc.findOneAndUpdate(
        { _id: doc._id, "versionHistory.version": { $ne: file.version } },
        { $set: { currentVersion: file.version, lastUpdatedBy: req.user?._id || req.user?.id },
          $push: { versionHistory: { version: file.version, label: file.versionLabel,
              uploadedAt: file.uploadedAt, uploadedBy: file.uploadedBy, changelog: file.changelog } } },
        { new: true }
    );
    const publishedDoc = updatedDoc || await Doc.findById(doc._id);
    if (!publishedDoc) throw new WorkflowError("Document is no longer available for publication.", 409);
    Object.assign(doc, { currentVersion: publishedDoc.currentVersion, versionHistory: publishedDoc.versionHistory });
    await recordRevision({ doc: publishedDoc, before, action: "publish", user: req.user,
        reason: `Published version ${file.version}`, publicationFileId: file._id });
    // auditService deduplicates this event atomically, including across processes.
    await record(req, {
        action: AUDIT_ACTIONS.VERSION_PUBLISH,
        resourceType: "file",
        resourceId: file._id,
        documentId: doc._id,
        summary: `Version ${file.version} published`,
        changes: [{ field: "currentVersion", from: before.currentVersion, to: file.version }],
        metadata: { version: file.version, sha256: file.sha256 },
    });
    await File.updateMany(
        { documentId: doc._id, status: "approved", version: { $lt: file.version }, _id: { $ne: file._id } },
        { $set: { status: "superseded" } }
    );
    const finished = await File.findOneAndUpdate(
        { _id: file._id, status: "publishing" },
        { $set: { status: "approved", publishedAt: new Date() } }, { new: true }
    );
    return finished || await File.findOne({ _id: file._id });
}

/**
 * Store an uploaded file as a new version of a document and start the approval workflow.
 * @param {Object} req - Express request (req.user required)
 * @param {Object} doc - Mongoose document
 * @param {Object} uploaded - multer file object
 * @param {Object} [details] - { versionLabel, changelog }
 */
export async function submitVersion(req, doc, uploaded, { versionLabel, changelog } = {}) {
    if (!uploaded) throw new WorkflowError("No file uploaded.", 400);

    const policy = getApprovalPolicy();
    const pending = await File.findOne({ documentId: doc._id, status: { $in: ["pending_approval", "publishing"] } }).lean();
    if (pending) {
        await removeOrphanUpload(uploaded);
        throw new WorkflowError(
            pending.status === "publishing"
                ? `Version ${pending.version} has an incomplete publication. Retry publication before uploading another version.`
                : `Version ${pending.version} is still awaiting approval. Approve, reject, or withdraw it before uploading another version.`,
            409
        );
    }

    const now = new Date();
    // The storage engine streams the upload to disk (encrypting it when encryption at rest is on) and reports
    // both checksums. Fall back to hashing the stored file for uploads that did not come through it.
    const sha256 = uploaded.sha256 || await sha256File(uploaded.path);
    const file = new File({
        ...(uploaded.fileId ? { _id: uploaded.fileId } : {}),
        filename: uploaded.filename,
        originalname: uploaded.originalname,
        path: uploaded.path,
        mimetype: uploaded.mimetype,
        size: uploaded.size,
        documentId: doc._id,
        versionLabel: versionLabel || undefined,
        uploadedAt: now,
        uploadedBy: req.user?._id || req.user?.id || null,
        changelog: typeof changelog === "string" ? changelog.slice(0, 5000) : "",
        sha256,
        contentSha256: uploaded.contentSha256 || (uploaded.encrypted ? null : sha256),
        encrypted: Boolean(uploaded.encrypted),
        status: policy.required ? "pending_approval" : "publishing",
        approvalRequired: policy.required,
        ...(!policy.required ? { publicationBefore: snapshotDocument(doc) } : {}),
        submittedAt: now,
    });
    let protection = null;
    try {
        // Encryption metadata first: a File record must never point at ciphertext it cannot decrypt.
        protection = await saveProtection(uploaded, doc._id);
        await file.save();
    } catch (error) {
        await removeOrphanUpload(uploaded);
        if (protection) await removeProtection(protection._id);
        if (error?.code === 11000) throw new WorkflowError("Another upload won the version slot. Refresh and try again.", 409);
        throw error;
    }

    await Doc.updateOne({ _id: doc._id }, { $max: { latestVersion: file.version } });
    doc.latestVersion = Math.max(doc.latestVersion || 0, file.version);

    await record(req, {
        action: AUDIT_ACTIONS.FILE_UPLOAD,
        resourceType: "file",
        resourceId: file._id,
        documentId: doc._id,
        summary: `Uploaded version ${file.version} (${file.originalname})`,
        metadata: {
            version: file.version,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            sha256,
            contentSha256: file.contentSha256,
            encrypted: file.encrypted,
        },
    });

    if (policy.required) {
        await record(req, {
            action: AUDIT_ACTIONS.VERSION_SUBMIT,
            resourceType: "file",
            resourceId: file._id,
            documentId: doc._id,
            summary: `Version ${file.version} submitted for approval`,
            metadata: { version: file.version, minApprovals: policy.minApprovals },
        });
    } else {
        return publishVersion(req, doc, file);
    }

    return file;
}

async function loadPendingFile(doc, version) {
    const file = await File.findOne({ documentId: doc._id, version: Number(version) });
    if (!file) throw new WorkflowError("Version not found.", 404);
    if ((file.status || "approved") !== "pending_approval") {
        throw new WorkflowError(`Version ${file.version} is not awaiting approval (status: ${file.status}).`, 409);
    }
    return file;
}

async function deny(req, doc, file, action, reason) {
    await record(req, {
        action,
        outcome: "denied",
        resourceType: "file",
        resourceId: file?._id,
        documentId: doc._id,
        summary: reason,
        metadata: { version: file?.version },
    });
    throw new WorkflowError(reason, 403);
}

/**
 * Approve a pending version. Publishes it once the approval threshold is met.
 */
export async function approveVersion(req, doc, version, comment = "") {
    const policy = getApprovalPolicy();
    const file = await File.findOne({ documentId: doc._id, version: Number(version) });
    if (!file) throw new WorkflowError("Version not found.", 404);
    const userId = userIdOf(req.user);

    if (file.status === "publishing") {
        if (!canApproveDocument(doc, req.user) && !(file.approvalRequired === false && canEditDocument(doc, req.user))) {
            await deny(req, doc, file, AUDIT_ACTIONS.VERSION_APPROVE, "You cannot resume publication for this document.");
        }
        return { file: await publishVersion(req, doc, file), published: true,
            approvalCount: file.approvals.filter((entry) => entry.decision === "approved").length };
    }

    if (!canApproveDocument(doc, req.user)) {
        await deny(req, doc, file, AUDIT_ACTIONS.VERSION_APPROVE, "You are not an approver for this document.");
    }
    if (!policy.allowSelfApproval && userId === String(file.uploadedBy || "")) {
        await deny(req, doc, file, AUDIT_ACTIONS.VERSION_APPROVE, "You cannot approve a version you uploaded.");
    }

    if (file.status !== "pending_approval") throw new WorkflowError("Version is no longer pending.", 409);

    let updated = await File.findOneAndUpdate(
        { _id: file._id, status: "pending_approval", "approvals.user": { $ne: userId } },
        {
            $push: {
                approvals: {
                    user: userId,
                    decision: "approved",
                    comment: String(comment || "").slice(0, 2000),
                    decidedAt: new Date(),
                },
            },
        },
        { new: true }
    );
    // Only log an approval this request actually added; recovering a stuck version must not
    // write a second "approved" entry for someone who already approved it.
    const approvalAdded = Boolean(updated);
    if (!updated) {
        updated = await File.findOne({ _id: file._id, status: "pending_approval" });
        if (!updated || updated.approvals.filter((entry) => entry.decision === "approved").length < policy.minApprovals) {
            throw new WorkflowError("You have already approved this version, or it is no longer pending.", 409);
        }
    }

    const approvalCount = updated.approvals.filter((entry) => entry.decision === "approved").length;
    if (approvalAdded) await record(req, {
        action: AUDIT_ACTIONS.VERSION_APPROVE,
        resourceType: "file",
        resourceId: updated._id,
        documentId: doc._id,
        summary: `Approved version ${updated.version} (${approvalCount}/${policy.minApprovals})`,
        metadata: { version: updated.version, comment: String(comment || ""), approvalCount, required: policy.minApprovals },
    });

    if (approvalCount >= policy.minApprovals) {
        const claimed = await File.findOneAndUpdate(
            { _id: updated._id, status: "pending_approval" },
            { $set: { status: "publishing", decidedAt: new Date(), decidedBy: userId, publicationBefore: snapshotDocument(doc) } },
            { new: true }
        );
        if (claimed) {
            return { file: await publishVersion(req, doc, claimed), published: true, approvalCount };
        }
    }

    return { file: updated, published: false, approvalCount };
}

/**
 * Reject a pending version. A comment is required so the uploader knows what to fix.
 */
export async function rejectVersion(req, doc, version, comment = "") {
    const file = await loadPendingFile(doc, version);
    const reason = String(comment || "").trim();
    if (!reason) throw new WorkflowError("A rejection comment is required.", 400);

    if (!canApproveDocument(doc, req.user)) {
        await deny(req, doc, file, AUDIT_ACTIONS.VERSION_REJECT, "You are not an approver for this document.");
    }

    const userId = userIdOf(req.user);
    const updated = await File.findOneAndUpdate(
        { _id: file._id, status: "pending_approval" },
        {
            $set: {
                status: "rejected",
                rejectionReason: reason.slice(0, 2000),
                decidedAt: new Date(),
                decidedBy: userId,
            },
            $push: {
                approvals: { user: userId, decision: "rejected", comment: reason.slice(0, 2000), decidedAt: new Date() },
            },
        },
        { new: true }
    );
    if (!updated) throw new WorkflowError("Version is no longer pending.", 409);

    await record(req, {
        action: AUDIT_ACTIONS.VERSION_REJECT,
        resourceType: "file",
        resourceId: updated._id,
        documentId: doc._id,
        summary: `Rejected version ${updated.version}`,
        metadata: { version: updated.version, comment: reason },
    });
    return { file: updated };
}

/**
 * Withdraw a pending version (uploader or admin only).
 */
export async function withdrawVersion(req, doc, version, comment = "") {
    const file = await loadPendingFile(doc, version);
    const userId = userIdOf(req.user);
    if (userId !== String(file.uploadedBy || "") && !isAdmin(req.user)) {
        await deny(req, doc, file, AUDIT_ACTIONS.VERSION_WITHDRAW, "Only the uploader or an admin can withdraw this version.");
    }

    const updated = await File.findOneAndUpdate(
        { _id: file._id, status: "pending_approval" },
        { $set: { status: "withdrawn", decidedAt: new Date(), decidedBy: userId } },
        { new: true }
    );
    if (!updated) throw new WorkflowError("Version is no longer pending.", 409);

    await record(req, {
        action: AUDIT_ACTIONS.VERSION_WITHDRAW,
        resourceType: "file",
        resourceId: updated._id,
        documentId: doc._id,
        summary: `Withdrew version ${updated.version}`,
        metadata: { version: updated.version, comment: String(comment || "") },
    });
    return { file: updated };
}

/**
 * Pending versions the user can act on (approval inbox).
 */
export async function listPendingApprovalsForUser(user) {
    const pendingFiles = await File.find({ status: { $in: ["pending_approval", "publishing"] } })
        .sort({ submittedAt: 1 })
        .populate("uploadedBy", "firstname lastname email username")
        .lean();
    if (pendingFiles.length === 0) return [];

    const docs = await Doc.find({ _id: { $in: [...new Set(pendingFiles.map((file) => String(file.documentId)))] } })
        .select("title owners approvers author")
        .lean();
    const docsById = new Map(docs.map((doc) => [String(doc._id), doc]));
    const userId = userIdOf(user);
    const policy = getApprovalPolicy();

    return pendingFiles
        .filter((file) => {
            const doc = docsById.get(String(file.documentId));
            if (!doc || !canApproveDocument(doc, user)) return false;
            if (!policy.allowSelfApproval && String(file.uploadedBy?._id || file.uploadedBy || "") === userId) return false;
            return file.status === "publishing" || !(file.approvals || []).some((entry) => String(entry.user) === userId);
        })
        .map(({ path: _path, publicationBefore: _before, ...file }) => ({
            ...file,
            document: { _id: file.documentId, title: docsById.get(String(file.documentId))?.title },
            requiredApprovals: policy.minApprovals,
        }));
}

export default {
    submitVersion,
    approveVersion,
    rejectVersion,
    withdrawVersion,
    listPendingApprovalsForUser,
    getApprovalPolicy,
    canAccessFileVersion,
    WorkflowError,
};
