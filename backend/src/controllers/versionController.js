/*
 * @name versionController
 * @file /docman/backend/src/controllers/versionController.js
 * @controller versionController
 * @description File versions, secure downloads, change approval, revision history, and per-document audit trail.
 *              All handlers expect requireDocumentAccess() to have loaded req.document.
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import fs from "fs";
import mongoose from "mongoose";
import File from "../models/File.js";
import AuditLog from "../models/AuditLog.js";
import { record, AUDIT_ACTIONS } from "../services/auditService.js";
import { listRevisions } from "../services/revisionService.js";
import approvalService, { WorkflowError, canAccessFileVersion } from "../services/approvalService.js";
import { resolveStoredFile, sha256File } from "../lib/fileIntegrity.js";

function handleError(res, error, fallback) {
    if (error instanceof WorkflowError) {
        return res.status(error.statusCode).json({ message: error.message });
    }
    console.error(fallback, error);
    return res.status(500).json({ message: "Internal Server Error" });
}

function envFlag(name, fallback) {
    const value = process.env[name];
    if (value === undefined || value === "") return fallback;
    return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function serializeFile(file) {
    const plain = typeof file.toObject === "function" ? file.toObject() : { ...file };
    delete plain.path; // never expose server filesystem paths
    delete plain.publicationBefore;
    plain.status = plain.status || "approved";
    return plain;
}

/** GET /api/docs/:id/files — versions the caller may see (newest first). */
export async function listFiles(req, res) {
    try {
        const files = await File.find({ documentId: req.document._id })
            .sort({ version: -1 })
            .populate("uploadedBy", "firstname lastname email username")
            .populate("approvals.user", "firstname lastname email username")
            .populate("decidedBy", "firstname lastname email username");
        const visible = files.filter((file) => canAccessFileVersion(req.document, file, req.user));
        return res.status(200).json(visible.map(serializeFile));
    } catch (error) {
        return handleError(res, error, "Error listing document files:");
    }
}

/** POST /api/docs/:id/upload — upload a new version (enters approval workflow). */
export async function uploadVersion(req, res) {
    try {
        const file = await approvalService.submitVersion(req, req.document, req.file, {
            versionLabel: req.body?.versionLabel,
            changelog: req.body?.changelog,
        });
        const policy = approvalService.getApprovalPolicy();
        return res.status(201).json({
            message: policy.required
                ? `Version ${file.version} uploaded and submitted for approval.`
                : `Version ${file.version} uploaded and published.`,
            file: serializeFile(file),
            document: req.document,
        });
    } catch (error) {
        return handleError(res, error, "Error uploading file version:");
    }
}

/** GET /api/docs/:id/files/:fileId/download — authenticated, audited, integrity-checked download. */
export async function downloadFile(req, res) {
    try {
        const { fileId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ message: "Invalid file id." });
        }
        const file = await File.findOne({ _id: fileId, documentId: req.document._id });
        if (!file) return res.status(404).json({ message: "File not found." });

        if (!canAccessFileVersion(req.document, file, req.user)) {
            await record(req, {
                action: AUDIT_ACTIONS.FILE_DOWNLOAD,
                outcome: "denied",
                resourceType: "file",
                resourceId: file._id,
                documentId: req.document._id,
                summary: `Denied download of unpublished version ${file.version}`,
            });
            return res.status(403).json({ message: "Access denied." });
        }

        const absolutePath = resolveStoredFile(file.filename);
        if (!absolutePath || !fs.existsSync(absolutePath)) {
            await record(req, {
                action: AUDIT_ACTIONS.FILE_INTEGRITY_FAILURE,
                outcome: "failure",
                resourceType: "file",
                resourceId: file._id,
                documentId: req.document._id,
                summary: `Stored file for version ${file.version} is missing`,
            });
            return res.status(410).json({ message: "Stored file is missing. An administrator has been notified via the audit log." });
        }

        if (file.sha256 && envFlag("VERIFY_FILE_INTEGRITY_ON_DOWNLOAD", true)) {
            const actual = await sha256File(absolutePath);
            if (actual !== file.sha256) {
                await record(req, {
                    action: AUDIT_ACTIONS.FILE_INTEGRITY_FAILURE,
                    outcome: "failure",
                    resourceType: "file",
                    resourceId: file._id,
                    documentId: req.document._id,
                    summary: `Checksum mismatch for version ${file.version}`,
                    metadata: { expected: file.sha256, actual },
                });
                return res.status(409).json({ message: "File integrity check failed. The download was blocked." });
            }
        }

        await record(req, {
            action: AUDIT_ACTIONS.FILE_DOWNLOAD,
            resourceType: "file",
            resourceId: file._id,
            documentId: req.document._id,
            summary: `Downloaded version ${file.version} (${file.originalname})`,
            metadata: { version: file.version, sha256: file.sha256 },
        });

        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, no-store");
        if (file.sha256) res.setHeader("X-Content-SHA256", file.sha256);
        return res.download(absolutePath, file.originalname, { headers: { "Content-Type": file.mimetype } });
    } catch (error) {
        return handleError(res, error, "Error downloading file:");
    }
}

/** GET /api/docs/:id/version/:version — metadata for one version. */
export async function getVersion(req, res) {
    try {
        const version = parseInt(req.params.version, 10);
        if (!Number.isFinite(version)) return res.status(400).json({ message: "Invalid version." });
        const file = await File.findOne({ documentId: req.document._id, version })
            .populate("uploadedBy", "firstname lastname email username")
            .populate("approvals.user", "firstname lastname email username");
        if (!file || !canAccessFileVersion(req.document, file, req.user)) {
            return res.status(404).json({ message: "Document version not found." });
        }
        const history = (req.document.versionHistory || []).find((entry) => entry.version === version) || null;
        // Response shape kept compatible with < 2.3.0 clients (the file object), plus its history entry.
        return res.status(200).json({ ...serializeFile(file), history });
    } catch (error) {
        return handleError(res, error, "Error fetching document version:");
    }
}

/** GET /api/docs/:id/history — published version history, newest first (array, as in < 2.3.0). */
export async function getVersionHistory(req, res) {
    try {
        await req.document.populate("versionHistory.uploadedBy", "firstname lastname email");
        const history = [...(req.document.versionHistory || [])].sort((a, b) => b.version - a.version);
        return res.status(200).json(history);
    } catch (error) {
        return handleError(res, error, "Error fetching version history:");
    }
}

/** GET /api/docs/:id/compare?version1=&version2= */
export async function compareVersions(req, res) {
    try {
        const v1 = parseInt(req.query.version1, 10);
        const v2 = parseInt(req.query.version2, 10);
        if (!Number.isFinite(v1) || !Number.isFinite(v2)) {
            return res.status(400).json({ message: "Both version1 and version2 query parameters are required." });
        }
        const [file1, file2] = await Promise.all([
            File.findOne({ documentId: req.document._id, version: v1 }).populate("uploadedBy", "firstname lastname email"),
            File.findOne({ documentId: req.document._id, version: v2 }).populate("uploadedBy", "firstname lastname email"),
        ]);
        if (!file1 || !file2
            || !canAccessFileVersion(req.document, file1, req.user)
            || !canAccessFileVersion(req.document, file2, req.user)) {
            return res.status(404).json({ message: "One or both document versions not found." });
        }
        const historyFor = (version) => (req.document.versionHistory || []).find((entry) => entry.version === version) || null;
        return res.status(200).json({
            version1: { file: serializeFile(file1), history: historyFor(v1) },
            version2: { file: serializeFile(file2), history: historyFor(v2) },
            differences: {
                sizeDifference: file2.size - file1.size,
                dateDifference: file2.uploadedAt - file1.uploadedAt,
                contentChanged: Boolean(file1.sha256 && file2.sha256) ? file1.sha256 !== file2.sha256 : null,
                mimetypeChanged: file1.mimetype !== file2.mimetype,
                statuses: { [v1]: file1.status || "approved", [v2]: file2.status || "approved" },
            },
        });
    } catch (error) {
        return handleError(res, error, "Error comparing document versions:");
    }
}

/** POST /api/docs/:id/versions/:version/approve */
export async function approve(req, res) {
    try {
        const result = await approvalService.approveVersion(req, req.document, req.params.version, req.body?.comment);
        return res.status(200).json({
            message: result.published
                ? `Version ${result.file.version} approved and published.`
                : `Approval recorded (${result.approvalCount} of ${approvalService.getApprovalPolicy().minApprovals}).`,
            ...result,
            file: serializeFile(result.file),
        });
    } catch (error) {
        return handleError(res, error, "Error approving version:");
    }
}

/** POST /api/docs/:id/versions/:version/reject */
export async function reject(req, res) {
    try {
        const result = await approvalService.rejectVersion(req, req.document, req.params.version, req.body?.comment);
        return res.status(200).json({ message: `Version ${result.file.version} rejected.`, file: serializeFile(result.file) });
    } catch (error) {
        return handleError(res, error, "Error rejecting version:");
    }
}

/** POST /api/docs/:id/versions/:version/withdraw */
export async function withdraw(req, res) {
    try {
        const result = await approvalService.withdrawVersion(req, req.document, req.params.version, req.body?.comment);
        return res.status(200).json({ message: `Version ${result.file.version} withdrawn.`, file: serializeFile(result.file) });
    } catch (error) {
        return handleError(res, error, "Error withdrawing version:");
    }
}

/** GET /api/docs/approvals/pending — approval inbox for the current user. */
export async function pendingApprovals(req, res) {
    try {
        const items = await approvalService.listPendingApprovalsForUser(req.user);
        return res.status(200).json({ items, policy: approvalService.getApprovalPolicy() });
    } catch (error) {
        return handleError(res, error, "Error listing pending approvals:");
    }
}

/** GET /api/docs/:id/revisions — metadata revision history. */
export async function revisions(req, res) {
    try {
        const result = await listRevisions(req.document._id, { limit: req.query.limit, skip: req.query.skip });
        return res.status(200).json(result);
    } catch (error) {
        return handleError(res, error, "Error listing document revisions:");
    }
}

/** GET /api/docs/:id/audit — audit trail for one document. */
export async function documentAudit(req, res) {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
        const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
        const filter = { documentId: req.document._id };
        const [items, total] = await Promise.all([
            AuditLog.find(filter).sort({ sequence: -1 }).skip(skip).limit(limit).lean(),
            AuditLog.countDocuments(filter),
        ]);
        return res.status(200).json({ items, total, limit, skip });
    } catch (error) {
        return handleError(res, error, "Error listing document audit trail:");
    }
}
