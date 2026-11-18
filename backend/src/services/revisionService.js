/*
 * @name revisionService
 * @file /docman/backend/src/services/revisionService.js
 * @service revisionService
 * @description Records document metadata revisions (snapshot + diff) and reads revision history.
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import DocumentRevision from "../models/DocumentRevision.js";
import { diffFields, toPlain } from "./auditService.js";

/** Metadata fields captured in every revision snapshot. */
export const TRACKED_DOCUMENT_FIELDS = Object.freeze([
    "title",
    "description",
    "category",
    "author",
    "owners",
    "stakeholders",
    "approvers",
    "reviewAssignees",
    "projects",
    "opensForReview",
    "reviewInterval",
    "reviewIntervalDays",
    "reviewPeriod",
    "reviewDueDate",
    "reviewNotes",
    "nextReviewDueOn",
    "lastReviewedOn",
    "reviewCompleted",
    "externalContacts",
    "currentVersion",
    "deletedAt",
    "deleteReason",
]);

/**
 * Build a plain snapshot of the tracked fields of a document (populated or not).
 * Populated references are reduced to their ids so snapshots stay comparable.
 */
export function snapshotDocument(doc) {
    const source = doc && typeof doc.toObject === "function" ? doc.toObject({ depopulate: true }) : doc || {};
    const snapshot = {};
    for (const field of TRACKED_DOCUMENT_FIELDS) {
        let value = source[field];
        if (Array.isArray(value)) {
            value = value.map((item) => (item && typeof item === "object" && item._id && !item.name ? item._id : item));
        } else if (value && typeof value === "object" && value._id && !(value instanceof Date)) {
            value = value._id;
        }
        snapshot[field] = toPlain(value) ?? null;
    }
    return snapshot;
}

/**
 * Record a revision of a document.
 * @param {Object} params
 * @param {Object} params.doc - Document after the change
 * @param {Object|null} [params.before] - Snapshot (or document) before the change; null for create
 * @param {string} params.action - create | update | delete | restore | publish | review
 * @param {Object} [params.user] - Acting user
 * @param {string} [params.reason]
 * @returns {Promise<{revision: Object|null, changes: Array}>}
 */
export async function recordRevision({ doc, before = null, action, user = null, reason = "", publicationFileId }) {
    const after = snapshotDocument(doc);
    const previous = before ? snapshotDocument(before) : {};
    const changes = diffFields(previous, after, TRACKED_DOCUMENT_FIELDS);

    if (action === "update" && changes.length === 0) {
        return { revision: null, changes };
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
        if (publicationFileId) {
            const existing = await DocumentRevision.findOne({ publicationFileId });
            if (existing) return { revision: existing, changes: existing.changes };
        }
        const last = await DocumentRevision.findOne({ documentId: doc._id }, { revision: 1 }).sort({ revision: -1 }).lean();
        try {
            const revision = await DocumentRevision.create({
                documentId: doc._id,
                ...(publicationFileId ? { publicationFileId } : {}),
                revision: (last?.revision || 0) + 1,
                action,
                changedBy: user?._id || user?.id || null,
                changedAt: new Date(),
                reason: reason || "",
                changes,
                snapshot: after,
            });
            return { revision, changes };
        } catch (error) {
            if (error?.code === 11000) continue;
            throw error;
        }
    }
    throw new Error("Unable to record document revision.");
}

/**
 * List revisions for a document (newest first).
 */
export async function listRevisions(documentId, { limit = 100, skip = 0 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const safeSkip = Math.max(parseInt(skip, 10) || 0, 0);
    const [items, total] = await Promise.all([
        DocumentRevision.find({ documentId })
            .sort({ revision: -1 })
            .skip(safeSkip)
            .limit(safeLimit)
            .populate("changedBy", "firstname lastname email username")
            .lean(),
        DocumentRevision.countDocuments({ documentId }),
    ]);
    return { items, total, limit: safeLimit, skip: safeSkip };
}

export default { recordRevision, listRevisions, snapshotDocument, TRACKED_DOCUMENT_FIELDS };
