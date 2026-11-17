/*
 * @name documentAccess
 * @file /docman/backend/src/middleware/documentAccess.js
 * @middleware documentAccess
 * @description Per-document authorization. Loads the document named by a route param and checks that the
 *              current user may read or edit it. Denials are written to the audit log.
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import mongoose from "mongoose";
import Doc from "../models/Doc.js";
import { record, AUDIT_ACTIONS } from "../services/auditService.js";

const ADMIN_ROLES = new Set(["admin", "superadmin"]);
const EDITOR_ROLES = new Set(["editor", "admin", "superadmin"]);

function idOf(value) {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value._id) return value._id.toString();
    return value.toString();
}

function includesUser(list, userId) {
    return Array.isArray(list) && list.some((entry) => idOf(entry) === userId);
}

export function isAdmin(user) {
    return Boolean(user && ADMIN_ROLES.has(user.role));
}

/** MongoDB equivalent of canReadDocument, including soft-deletion. */
export function documentReadFilter(user) {
    if (isAdmin(user)) return { deletedAt: null };
    const id = user?.id || user?._id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return { _id: { $in: [] } };
    const userId = new mongoose.Types.ObjectId(String(id));
    return { deletedAt: null, $or: ['author', 'owners', 'stakeholders', 'approvers', 'reviewAssignees']
        .map((field) => ({ [field]: userId })) };
}

/** Read access: admins, author, owners, stakeholders, approvers, review assignees. */
export function canReadDocument(doc, user) {
    if (!doc || !user) return false;
    if (isAdmin(user)) return true;
    const userId = idOf(user.id || user._id);
    return idOf(doc.author) === userId
        || includesUser(doc.owners, userId)
        || includesUser(doc.stakeholders, userId)
        || includesUser(doc.approvers, userId)
        || includesUser(doc.reviewAssignees, userId);
}

/** Edit access: admins, or editors who are the author or an owner. */
export function canEditDocument(doc, user) {
    if (!doc || !user) return false;
    if (isAdmin(user)) return true;
    if (!EDITOR_ROLES.has(user.role)) return false;
    const userId = idOf(user.id || user._id);
    return idOf(doc.author) === userId || includesUser(doc.owners, userId);
}

/** Approver access: admins, or designated approvers (owners when no approvers are designated). */
export function canApproveDocument(doc, user) {
    if (!doc || !user) return false;
    if (isAdmin(user)) return true;
    const userId = idOf(user.id || user._id);
    const approvers = Array.isArray(doc.approvers) && doc.approvers.length > 0 ? doc.approvers : doc.owners;
    return includesUser(approvers, userId);
}

/** Who may see the per-document audit trail: admins, author, owners, approvers. */
export function canViewDocumentAudit(doc, user) {
    if (!doc || !user) return false;
    if (isAdmin(user)) return true;
    const userId = idOf(user.id || user._id);
    return idOf(doc.author) === userId || includesUser(doc.owners, userId) || includesUser(doc.approvers, userId);
}

const CHECKS = {
    read: canReadDocument,
    edit: canEditDocument,
    approve: canApproveDocument,
    audit: canViewDocumentAudit,
};

/**
 * Express middleware factory.
 * @param {"read"|"edit"|"approve"|"audit"} level
 * @param {Object} [options]
 * @param {string} [options.param="id"] - Route param holding the document id
 * @param {boolean} [options.includeDeleted=false] - Allow loading soft-deleted documents (admin restore)
 */
export function requireDocumentAccess(level = "read", { param = "id", includeDeleted = false } = {}) {
    const check = CHECKS[level];
    if (!check) throw new Error(`Unknown document access level: ${level}`);

    return async (req, res, next) => {
        try {
            const documentId = req.params[param];
            if (!mongoose.Types.ObjectId.isValid(documentId)) {
                return res.status(400).json({ message: "Invalid document id." });
            }

            const query = Doc.findById(documentId);
            if (includeDeleted) query.setOptions({ includeDeleted: true });
            const doc = await query;
            if (!doc) {
                return res.status(404).json({ message: "Document not found." });
            }

            if (!check(doc, req.user)) {
                await record(req, {
                    action: AUDIT_ACTIONS.ACCESS_DENIED,
                    outcome: "denied",
                    resourceType: "document",
                    resourceId: documentId,
                    documentId,
                    summary: `Denied ${level} access to document`,
                    metadata: { level },
                });
                return res.status(403).json({ message: "Access denied." });
            }

            req.document = doc;
            return next();
        } catch (error) {
            console.error("Document access check failed:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    };
}

export default requireDocumentAccess;
