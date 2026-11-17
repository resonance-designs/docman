/*
 * @name documentService
 * @file /docman/backend/src/services/documentService.js
 * @service documentService
 * @description Business logic service for document operations including CRUD, validation, and access control
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import mongoose from "mongoose";
import Doc from "../models/Doc.js";
import File from "../models/File.js";
import { sanitizeErrorMessage, logError } from "../lib/utils.js";
import { resetReviewAssignmentsForNewCycle, cleanupDuplicateReviewAssignments, cleanupOrphanedReviewAssignments } from "../controllers/reviewController.js";
import { record, AUDIT_ACTIONS } from "./auditService.js";
import { recordRevision, snapshotDocument } from "./revisionService.js";
import { submitVersion } from "./approvalService.js";
import { canReadDocument, canEditDocument, isAdmin } from "../middleware/documentAccess.js";

/**
 * Fields a client may set through the document update API. Everything else (version numbers, version history,
 * review completion, soft-delete markers, createdBy...) is controlled by the server.
 */
export const UPDATABLE_DOCUMENT_FIELDS = Object.freeze([
    "title",
    "description",
    "category",
    "opensForReview",
    "reviewInterval",
    "reviewIntervalDays",
    "reviewPeriod",
    "reviewDueDate",
    "reviewNotes",
    "nextReviewDueOn",
]);

/** Reference-list fields parsed by parseDocumentFields(). */
const PARSED_LIST_FIELDS = ["stakeholders", "owners", "approvers", "reviewAssignees", "externalContacts", "projects"];

/** Fields only admins may change after creation. */
const ADMIN_ONLY_FIELDS = ["author"];

/**
 * Pick only allowed scalar fields from a request body and coerce them to strings/numbers.
 * Rejects operator-style values (objects) to prevent NoSQL injection through the update.
 */
export function pickUpdatableFields(body = {}, user = null) {
    const picked = {};
    const allowed = isAdmin(user) ? [...UPDATABLE_DOCUMENT_FIELDS, ...ADMIN_ONLY_FIELDS] : UPDATABLE_DOCUMENT_FIELDS;
    for (const field of allowed) {
        if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
        const value = body[field];
        if (value !== null && typeof value === "object") {
            throw new Error(`Invalid value for ${field}`);
        }
        picked[field] = value === "" && field !== "title" && field !== "description" ? null : value;
    }
    return picked;
}

/**
 * Check if user has permission to access a document
 * @param {Object} doc - Document object
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {boolean} True if user has access
 */
export function hasDocumentAccess(doc, userId, userRole) {
    return canReadDocument(doc, { id: userId, role: userRole });
}

/**
 * Build filter object for document queries with input sanitization
 * @param {Object} queryParams - Query parameters from request
 * @returns {Object} Sanitized filter object
 */
export function buildDocumentFilter(queryParams) {
    const {
        search,
        category,
        author,
        reviewStatus,
        overdue,
        startDate,
        endDate
    } = queryParams;

    const conditions = [];
    let searchCondition = null;

    // Search filter - sanitize search input
    if (search && typeof search === 'string') {
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (sanitizedSearch.trim().length > 0 && sanitizedSearch.length <= 100) {
            searchCondition = {
                $or: [
                    { title: { $regex: sanitizedSearch, $options: 'i' } },
                    { description: { $regex: sanitizedSearch, $options: 'i' } }
                ]
            };
        }
    }

    // Category filter - validate ObjectId format
    if (category && typeof category === 'string' && /^[0-9a-fA-F]{24}$/.test(category)) {
        conditions.push({ category: new mongoose.Types.ObjectId(category) });
    }

    // Author filter - validate ObjectId format
    if (author && typeof author === 'string' && /^[0-9a-fA-F]{24}$/.test(author)) {
        conditions.push({ author: new mongoose.Types.ObjectId(author) });
    }

    // Review status filter - validate enum values
    if (reviewStatus && typeof reviewStatus === 'string') {
        const allowedStatuses = ['completed', 'pending'];
        if (allowedStatuses.includes(reviewStatus)) {
            if (reviewStatus === 'completed') {
                conditions.push({ reviewCompleted: true });
            } else if (reviewStatus === 'pending') {
                conditions.push({ reviewCompleted: { $ne: true } });
            }
        }
    }

    // Overdue filter (from frontend) - validate enum values
    if (overdue && typeof overdue === 'string') {
        if (overdue === 'true') {
            // Overdue: opensForReview has passed AND document is not yet reviewed
            conditions.push({ 
                $and: [
                    { 
                        $or: [
                            { opensForReview: { $lt: new Date() } },
                            { reviewDate: { $lt: new Date() } } // Migration fallback
                        ]
                    },
                    { reviewCompleted: { $ne: true } }
                ]
            });
        } else if (overdue === 'false') {
            // Not overdue: either opensForReview hasn't passed OR document is already reviewed
            conditions.push({
                $or: [
                    { 
                        $or: [
                            { opensForReview: { $gte: new Date() } },
                            { reviewDate: { $gte: new Date() } } // Migration fallback
                        ]
                    },
                    { reviewCompleted: true }
                ]
            });
        }
    }

    // Date range filter - validate date format
    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate && typeof startDate === 'string') {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
                dateFilter.$gte = start;
            }
        }
        if (endDate && typeof endDate === 'string') {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
                end.setDate(end.getDate() + 1);
                dateFilter.$lt = end;
            }
        }
        if (Object.keys(dateFilter).length > 0) {
            conditions.push({ createdAt: dateFilter });
        }
    }

    // Combine all conditions
    const filter = {};
    if (searchCondition) {
        conditions.push(searchCondition);
    }
    
    if (conditions.length > 1) {
        filter.$and = conditions;
    } else if (conditions.length === 1) {
        Object.assign(filter, conditions[0]);
    }

    return filter;
}

/**
 * Build sort object for document queries
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc/desc)
 * @returns {Object} Sort object
 */
export function buildDocumentSort(sortBy = 'createdAt', sortOrder = 'desc') {
    const allowedSortFields = ['title', 'createdAt', 'opensForReview', 'reviewDate', 'author', 'category'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    return { [sortField]: sortDirection };
}

/**
 * Parse and validate JSON fields from request body
 * @param {Object} requestBody - Request body containing JSON strings
 * @returns {Object} Parsed and validated data
 */
export function parseDocumentFields(requestBody) {
    const { stakeholders, owners, externalContacts, reviewAssignees } = requestBody;
    const parsed = {};

    // Parse stakeholders
    if (stakeholders) {
        try {
            const parsedStakeholders = JSON.parse(stakeholders);
            if (Array.isArray(parsedStakeholders)) {
                parsed.stakeholders = parsedStakeholders.filter(id => 
                    typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
                );
            }
        } catch (error) {
            throw new Error("Invalid stakeholders format");
        }
    }

    // Parse owners
    if (owners) {
        try {
            const parsedOwners = JSON.parse(owners);
            if (Array.isArray(parsedOwners)) {
                parsed.owners = parsedOwners.filter(id => 
                    typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
                );
            }
        } catch (error) {
            throw new Error("Invalid owners format");
        }
    }

    // Parse external contacts
    if (externalContacts) {
        try {
            const parsedContacts = JSON.parse(externalContacts);
            if (Array.isArray(parsedContacts)) {
                parsed.externalContacts = parsedContacts.filter(contact => 
                    contact && typeof contact === 'object' && contact.name
                );
            }
        } catch (error) {
            throw new Error("Invalid external contacts format");
        }
    }

    // Parse approvers and projects (same id-list format)
    for (const listField of ["approvers", "projects"]) {
        const raw = requestBody[listField];
        if (raw === undefined || raw === null || raw === "") continue;
        try {
            const list = Array.isArray(raw) ? raw : JSON.parse(raw);
            if (Array.isArray(list)) {
                parsed[listField] = list.filter(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id));
            }
        } catch (error) {
            throw new Error(`Invalid ${listField} format`);
        }
    }

    // Parse review assignees
    if (reviewAssignees) {
        try {
            const parsedAssignees = JSON.parse(reviewAssignees);
            if (Array.isArray(parsedAssignees)) {
                parsed.reviewAssignees = parsedAssignees.filter(id => 
                    typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
                );
            }
        } catch (error) {
            throw new Error("Invalid review assignees format");
        }
    }

    return parsed;
}

/**
 * Get documents with filtering, sorting, and pagination
 * @param {Object} queryParams - Query parameters
 * @param {Object} user - User object for access control
 * @returns {Promise<Object>} Documents and metadata
 */
export async function getDocuments(queryParams, user) {
    try {
        const { limit = 50, page = 1 } = queryParams;
        
        // Build filter and sort
        const filter = buildDocumentFilter(queryParams);
        const sort = buildDocumentSort(queryParams.sortBy, queryParams.sortOrder);
        
        console.log('📄 Document filter query params:', queryParams);
        console.log('📄 Built filter before user access:', JSON.stringify(filter, null, 2));
        
        // Add user-based filtering for non-admins
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            const userId = new mongoose.Types.ObjectId(user.id);
            const userAccessFilter = {
                $or: [
                    { author: userId },
                    { stakeholders: userId },
                    { owners: userId },
                    { reviewAssignees: userId },
                    { approvers: userId }
                ]
            };
            
            // If there are already filters, combine them with AND logic
            if (Object.keys(filter).length > 0) {
                if (filter.$and) {
                    // Already has $and conditions, add user access to it
                    filter.$and.push(userAccessFilter);
                } else {
                    // Convert existing filter to $and structure
                    filter.$and = [
                        { ...filter },
                        userAccessFilter
                    ];
                    // Clean up the original filter properties that are now in $and
                    Object.keys(filter).forEach(key => {
                        if (key !== '$and') {
                            delete filter[key];
                        }
                    });
                }
            } else {
                Object.assign(filter, userAccessFilter);
            }
        }
        
        console.log('📄 Final filter with user access:', JSON.stringify(filter, null, 2));

        // Parse pagination
        const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 docs per page
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * limitNum;

        // Execute optimized aggregation query
        const pipeline = [
            { $match: filter },

            // Lookup stages for population
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author',
                    pipeline: [{ $project: { firstname: 1, lastname: 1, email: 1, username: 1 } }]
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                    pipeline: [{ $project: { name: 1 } }]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'stakeholders',
                    foreignField: '_id',
                    as: 'stakeholders',
                    pipeline: [{ $project: { firstname: 1, lastname: 1, email: 1, username: 1 } }]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'owners',
                    foreignField: '_id',
                    as: 'owners',
                    pipeline: [{ $project: { firstname: 1, lastname: 1, email: 1, username: 1 } }]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'reviewAssignees',
                    foreignField: '_id',
                    as: 'reviewAssignees',
                    pipeline: [{ $project: { firstname: 1, lastname: 1, email: 1, username: 1 } }]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'reviewCompletedBy',
                    foreignField: '_id',
                    as: 'reviewCompletedBy',
                    pipeline: [{ $project: { firstname: 1, lastname: 1, email: 1, username: 1 } }]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'lastUpdatedBy',
                    foreignField: '_id',
                    as: 'lastUpdatedBy',
                    pipeline: [{ $project: { firstname: 1, lastname: 1, email: 1, username: 1 } }]
                }
            },

            // Unwind single-value lookups
            { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$reviewCompletedBy', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$lastUpdatedBy', preserveNullAndEmptyArrays: true } },

            // Sort
            { $sort: sort },

            // Facet for pagination and count
            {
                $facet: {
                    documents: [
                        { $skip: skip },
                        { $limit: limitNum }
                    ],
                    totalCount: [
                        { $count: 'count' }
                    ]
                }
            }
        ];

        const [result] = await Doc.aggregate(pipeline);
        const documents = result.documents || [];
        const total = result.totalCount[0]?.count || 0;

        return {
            documents,
            pagination: {
                total,
                page: Math.max(parseInt(page) || 1, 1),
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        };
    } catch (error) {
        logError('getDocuments', error);
        throw new Error(sanitizeErrorMessage(error, "Failed to retrieve documents"));
    }
}

/**
 * Get a single document by ID with access control
 * @param {string} documentId - Document ID
 * @param {Object} user - User object for access control
 * @returns {Promise<Object>} Document object
 */
export async function getDocumentById(documentId, user) {
    try {
        const doc = await Doc.findById(documentId)
            .populate('author', 'firstname lastname email username')
            .populate('category', 'name')
            .populate('stakeholders', 'firstname lastname email username')
            .populate('owners', 'firstname lastname email username')
            .populate('reviewAssignees', 'firstname lastname email username')
            .populate('reviewCompletedBy', 'firstname lastname email username')
            .populate('lastUpdatedBy', 'firstname lastname email username')
            .populate('externalContacts.type');

        if (!doc) {
            throw new Error("Document not found");
        }

        // Check access permissions
        if (!hasDocumentAccess(doc, user.id, user.role)) {
            throw new Error("Access denied");
        }

        return doc;
    } catch (error) {
        logError('getDocumentById', error, { documentId, userId: user.id });
        throw new Error(sanitizeErrorMessage(error, "Failed to retrieve document"));
    }
}

/**
 * Create a new document
 * @param {Object} documentData - Document data
 * @param {Object} file - Uploaded file object
 * @param {Object} user - User object
 * @returns {Promise<Object>} Created document
 */
export async function createDocument(documentData, file, user, req = null) {
    const context = req || { user };
    try {
        const parsedFields = parseDocumentFields(documentData);
        const scalarFields = pickUpdatableFields(documentData, { role: "admin" });

        const docData = {
            ...scalarFields,
            author: documentData.author,
            opensForReview: documentData.opensForReview || documentData.reviewDate, // Migration fallback
            reviewInterval: documentData.reviewInterval || 'quarterly',
            reviewPeriod: documentData.reviewPeriod || '2weeks',
            lastReviewedOn: documentData.lastReviewedOn,
            ...parsedFields,
            currentVersion: 0,
            latestVersion: 0,
            createdBy: user._id || user.id,
            lastUpdatedBy: user._id || user.id
        };
        Object.keys(docData).forEach((key) => docData[key] === undefined && delete docData[key]);

        const doc = new Doc(docData);
        await doc.save();

        await recordRevision({ doc, before: null, action: "create", user });
        await record(context, {
            action: AUDIT_ACTIONS.DOCUMENT_CREATE,
            resourceType: "document",
            resourceId: doc._id,
            documentId: doc._id,
            summary: `Created document "${doc.title}"`,
            metadata: { snapshot: snapshotDocument(doc) },
        });

        // Initial file goes through the same approval workflow as later versions
        if (file) {
            await submitVersion(context, doc, file, {
                versionLabel: "Initial Version",
                changelog: "Initial document upload",
            });
        }

        // Populate the created document
        await doc.populate([
            { path: 'author', select: 'firstname lastname email' },
            { path: 'category', select: 'name' },
            { path: 'stakeholders', select: 'firstname lastname email' },
            { path: 'owners', select: 'firstname lastname email' },
            { path: 'approvers', select: 'firstname lastname email' },
            { path: 'reviewAssignees', select: 'firstname lastname email' },
            { path: 'externalContacts.type' }
        ]);

        return doc;
    } catch (error) {
        logError('createDocument', error, { userId: user.id });
        if (error?.statusCode) throw error;
        throw new Error(sanitizeErrorMessage(error, "Failed to create document"));
    }
}

/**
 * Update an existing document
 * @param {string} documentId - Document ID
 * @param {Object} updateData - Update data
 * @param {Object} file - Uploaded file object (optional)
 * @param {Object} user - User object
 * @returns {Promise<Object>} Updated document
 */
export async function updateDocument(documentId, updateData, file, user, req = null) {
    const context = req || { user };
    try {
        // Get existing document and check access
        const existingDoc = await Doc.findById(documentId);
        if (!existingDoc) {
            throw new Error("Document not found");
        }
        if (!canEditDocument(existingDoc, user)) {
            throw new Error("Access denied");
        }
        const before = snapshotDocument(existingDoc);

        // Parse JSON fields
        const parsedFields = parseDocumentFields(updateData);

        // Build update object from an explicit allow-list only
        const update = {
            ...pickUpdatableFields(updateData, user),
            ...parsedFields,
            lastUpdatedBy: user.id
        };

        // Reset review completion status if opensForReview is updated to a future date
        if (updateData.opensForReview) {
            const newReviewDate = new Date(updateData.opensForReview);
            const existingReviewDate = new Date(existingDoc.opensForReview);
            
            // If the new review date is different and in the future, reset review completion
            if (newReviewDate.getTime() !== existingReviewDate.getTime() && newReviewDate > new Date()) {
                update.reviewCompleted = false;
                update.reviewCompletedAt = null;
                update.reviewCompletedBy = null;
                update.lastReviewedOn = null;
                
                // Calculate next review due date based on review interval
                if (updateData.reviewInterval || existingDoc.reviewInterval) {
                    const interval = updateData.reviewInterval || existingDoc.reviewInterval;
                    const intervalDays = updateData.reviewIntervalDays || existingDoc.reviewIntervalDays;
                    
                    let nextReviewDate = new Date(newReviewDate);
                    
                    switch (interval) {
                        case 'monthly':
                            nextReviewDate.setMonth(nextReviewDate.getMonth() + 1);
                            break;
                        case 'quarterly':
                            nextReviewDate.setMonth(nextReviewDate.getMonth() + 3);
                            break;
                        case 'semiannually':
                            nextReviewDate.setMonth(nextReviewDate.getMonth() + 6);
                            break;
                        case 'annually':
                            nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);
                            break;
                        case 'custom':
                            if (intervalDays && intervalDays > 0) {
                                nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
                            }
                            break;
                        default:
                            // Default to quarterly
                            nextReviewDate.setMonth(nextReviewDate.getMonth() + 3);
                    }
                    
                    update.nextReviewDueOn = nextReviewDate;
                }
                
                // Clean up any orphaned and duplicate assignments, then reset for the new cycle
                await cleanupOrphanedReviewAssignments(documentId);
                await cleanupDuplicateReviewAssignments(documentId);
                await resetReviewAssignmentsForNewCycle(documentId);
            }
        }

        // Remove undefined values
        Object.keys(update).forEach(key => {
            if (update[key] === undefined) {
                delete update[key];
            }
        });

        const updatedDoc = await Doc.findByIdAndUpdate(
            documentId,
            update,
            { new: true, runValidators: true }
        ).populate([
            { path: 'author', select: 'firstname lastname email' },
            { path: 'category', select: 'name' },
            { path: 'stakeholders', select: 'firstname lastname email' },
            { path: 'owners', select: 'firstname lastname email' },
            { path: 'approvers', select: 'firstname lastname email' },
            { path: 'reviewAssignees', select: 'firstname lastname email' },
            { path: 'reviewCompletedBy', select: 'firstname lastname email' },
            { path: 'lastUpdatedBy', select: 'firstname lastname email' },
            { path: 'externalContacts.type' }
        ]);

        const { changes } = await recordRevision({ doc: updatedDoc, before, action: "update", user });
        if (changes.length > 0) {
            await record(context, {
                action: AUDIT_ACTIONS.DOCUMENT_UPDATE,
                resourceType: "document",
                resourceId: documentId,
                documentId,
                summary: `Updated ${changes.map((change) => change.field).join(", ")}`,
                changes,
            });
        }

        return updatedDoc;
    } catch (error) {
        logError('updateDocument', error, { documentId, userId: user.id });
        throw new Error(sanitizeErrorMessage(error, "Failed to update document"));
    }
}

/**
 * Soft-delete a document. The record, its files, revisions and audit trail are retained.
 * @param {string} documentId - Document ID
 * @param {Object} user - User object (admin/superadmin enforced by the route)
 * @param {Object} [options] - { reason, req }
 * @returns {Promise<Object>} The deleted document
 */
export async function deleteDocument(documentId, user, { reason = "", req = null } = {}) {
    const context = req || { user };
    const doc = await Doc.findById(documentId);
    if (!doc) {
        throw new Error("Document not found");
    }
    if (!isAdmin(user)) {
        throw new Error("Access denied");
    }
    const before = snapshotDocument(doc);
    doc.deletedAt = new Date();
    doc.deletedBy = user._id || user.id;
    doc.deleteReason = String(reason || "").slice(0, 2000) || null;
    await doc.save();

    await recordRevision({ doc, before, action: "delete", user, reason });
    await record(context, {
        action: AUDIT_ACTIONS.DOCUMENT_DELETE,
        resourceType: "document",
        resourceId: documentId,
        documentId,
        summary: `Deleted document "${doc.title}"`,
        metadata: { reason: doc.deleteReason },
    });
    return doc;
}

/**
 * Restore a soft-deleted document.
 */
export async function restoreDocument(documentId, user, { reason = "", req = null } = {}) {
    const context = req || { user };
    const doc = await Doc.findOne({ _id: documentId }).setOptions({ includeDeleted: true });
    if (!doc) {
        throw new Error("Document not found");
    }
    if (!doc.deletedAt) {
        throw new Error("Invalid request: document is not deleted");
    }
    const before = snapshotDocument(doc);
    doc.deletedAt = null;
    doc.deletedBy = null;
    doc.deleteReason = null;
    await doc.save();

    await recordRevision({ doc, before, action: "restore", user, reason });
    await record(context, {
        action: AUDIT_ACTIONS.DOCUMENT_RESTORE,
        resourceType: "document",
        resourceId: documentId,
        documentId,
        summary: `Restored document "${doc.title}"`,
        metadata: { reason: String(reason || "") },
    });
    return doc;
}

/**
 * List soft-deleted documents (admin recovery view).
 */
export async function listDeletedDocuments() {
    return Doc.find({ deletedAt: { $ne: null } })
        .setOptions({ includeDeleted: true })
        .sort({ deletedAt: -1 })
        .populate('deletedBy', 'firstname lastname email')
        .populate('author', 'firstname lastname email')
        .select('title description deletedAt deletedBy deleteReason author currentVersion')
        .lean();
}
