/*
 * @name docsRoutes
 * @file /docman/backend/src/routes/docsRoutes.js
 * @routes docsRoutes
 * @description Document routes: CRUD, secure file versions, change approval, revision history, audit trail.
 *              Every /:id route passes through requireDocumentAccess() so access is checked per document,
 *              not only per role.
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { requireDocumentAccess } from "../middleware/documentAccess.js";
import uploadMid, { handleUploadError } from "../middleware/uploadMid.js";
import { cacheUserData, setCacheHeaders } from "../middleware/cacheMiddleware.js";
import {
    getAllDocs,
    getDocById,
    createDoc,
    updateDoc,
    deleteDoc,
    restoreDoc,
    listDeletedDocs,
    markDocAsReviewed,
} from "../controllers/docsController.js";
import {
    listFiles,
    uploadVersion,
    downloadFile,
    getVersion,
    getVersionHistory,
    compareVersions,
    approve,
    reject,
    withdraw,
    pendingApprovals,
    revisions,
    documentAudit,
} from "../controllers/versionController.js";

const router = express.Router();

const ANY_ROLE = requireRole("viewer", "editor", "admin", "superadmin");
const EDITOR = requireRole("editor", "admin", "superadmin");
const ADMIN = requireRole("admin", "superadmin");

/** Run a multer middleware and turn its errors into clean 4xx responses. */
function withUpload(middleware) {
    return (req, res, next) => middleware(req, res, (err) => (err ? handleUploadError(err, req, res, next) : next()));
}

// Collection-level routes (registered before /:id so they are not captured as ids)
router.get("/", verifyAccessToken, ANY_ROLE, cacheUserData(), setCacheHeaders(120), getAllDocs);
router.post("/", verifyAccessToken, EDITOR, withUpload(uploadMid.single("file")), createDoc);
router.get("/approvals/pending", verifyAccessToken, ANY_ROLE, pendingApprovals);
router.get("/deleted", verifyAccessToken, ADMIN, listDeletedDocs);

// Read access (author, owners, stakeholders, approvers, review assignees, admins)
router.get("/:id", verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"), getDocById);
router.get("/:id/files", verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"), listFiles);
router.get("/:id/files/:fileId/download", verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"), downloadFile);
router.get("/:id/version/:version", verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"), getVersion);
router.get("/:id/history", verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"), getVersionHistory);
router.get("/:id/compare", verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"), compareVersions);
router.get("/:id/revisions", verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"), revisions);

// Audit trail (author, owners, approvers, admins)
router.get("/:id/audit", verifyAccessToken, ANY_ROLE, requireDocumentAccess("audit"), documentAudit);

// Edit access (editors who are the author or an owner, admins)
router.put("/:id", verifyAccessToken, EDITOR, requireDocumentAccess("edit"), withUpload(uploadMid.none()), updateDoc);
router.post("/:id/upload", verifyAccessToken, EDITOR, requireDocumentAccess("edit"), withUpload(uploadMid.single("file")), uploadVersion);
router.put("/:id/review", verifyAccessToken, EDITOR, requireDocumentAccess("edit"), markDocAsReviewed);

// Change approval. Approver/uploader rules are enforced in approvalService and audited when denied.
router.post("/:id/versions/:version/approve", verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"), approve);
router.post("/:id/versions/:version/reject", verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"), reject);
router.post("/:id/versions/:version/withdraw", verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"), withdraw);

// Admin-only lifecycle
router.delete("/:id", verifyAccessToken, ADMIN, requireDocumentAccess("read"), deleteDoc);
router.post("/:id/restore", verifyAccessToken, ADMIN, requireDocumentAccess("read", { includeDeleted: true }), restoreDoc);

export default router;
