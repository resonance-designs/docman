/*
 * @name documentService
 * @file /docman/backend/src/services/documentService.js
 * @service documentService
 * @description Business logic service for document operations including CRUD, validation, and access control
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import mongoose from "mongoose";
import Doc from "../models/Doc.js";
import File from "../models/File.js";
import { sanitizeErrorMessage, logError } from "../lib/utils.js";

/**
 * Check if user has permission to access a document
 * @param {Object} doc - Document object
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {boolean} True if user has access
 */
export function hasDocumentAccess(doc, userId, userRole) {
    // Admins and superadmins have access to all documents
    if (userRole === 'admin' || userRole === 'superadmin') return true;
    
    // Check if user is the author
    if (doc.author?.toString() === userId) return true;
    
    // Check if user is a stakeholder
    if (doc.stakeholders?.some(stakeholder => stakeholder.toString() === userId)) return true;
    
    // Check if user is an owner
    if (doc.owners?.some(owner => owner.toString() === userId)) return true;
    
    return false;
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
    const { stakeholders, owners, externalContacts } = requestBody;
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
        if (user.role !== 'admin') {
            const userId = new mongoose.Types.ObjectId(user.id);
            const userAccessFilter = {
                $or: [
                    { author: userId },
                    { stakeholders: userId },
                    { owners: userId }
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
export async function createDocument(documentData, file, user) {
    try {
        const parsedFields = parseDocumentFields(documentData);

        const docData = {
            title: documentData.title,
            description: documentData.description,
            author: documentData.author,
            category: documentData.category,
            opensForReview: documentData.opensForReview || documentData.reviewDate, // Migration fallback
            reviewInterval: documentData.reviewInterval || 'quarterly',
            reviewIntervalDays: documentData.reviewIntervalDays,
            reviewPeriod: documentData.reviewPeriod || '2weeks',
            lastReviewedOn: documentData.lastReviewedOn,
            nextReviewDueOn: documentData.nextReviewDueOn,
            ...parsedFields,
            createdBy: user._id || user.id,
            lastUpdatedBy: user._id || user.id
        };

        const doc = new Doc(docData);
        await doc.save();

        // Create file record if file is provided
        if (file) {
            const newFile = new File({
                filename: file.filename,
                originalname: file.originalname,
                path: file.path,
                mimetype: file.mimetype,
                size: file.size,
                documentId: doc._id,
                versionLabel: "Initial Version",
                uploadedAt: new Date(),
                uploadedBy: user._id || user.id,
                changelog: "Initial document upload"
            });

            await newFile.save();

            // Update document's current version and version history
            doc.currentVersion = newFile.version;
            doc.versionHistory = [{
                version: newFile.version,
                label: newFile.versionLabel,
                uploadedAt: newFile.uploadedAt,
                uploadedBy: newFile.uploadedBy,
                changelog: newFile.changelog
            }];
            
            await doc.save();
        }

        // Populate the created document
        await doc.populate([
            { path: 'author', select: 'firstname lastname email' },
            { path: 'category', select: 'name' },
            { path: 'stakeholders', select: 'firstname lastname email' },
            { path: 'owners', select: 'firstname lastname email' },
            { path: 'externalContacts.type' }
        ]);

        return doc;
    } catch (error) {
        logError('createDocument', error, { userId: user.id });
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
export async function updateDocument(documentId, updateData, file, user) {
    try {
        // Get existing document and check access
        const existingDoc = await getDocumentById(documentId, user);

        // Parse JSON fields
        const parsedFields = parseDocumentFields(updateData);

        // Build update object
        const update = {
            ...updateData,
            ...parsedFields,
            lastUpdatedBy: user.id,
            lastUpdatedAt: new Date()
        };

        // Add file information if provided
        if (file) {
            update.filename = file.filename;
            update.originalname = file.originalname;
            update.mimetype = file.mimetype;
            update.size = file.size;
            update.url = `/uploads/${file.filename}`;

            // Add to version history
            if (existingDoc.filename) {
                if (!update.versionHistory) update.versionHistory = [];
                update.versionHistory.push({
                    filename: existingDoc.filename,
                    originalname: existingDoc.originalname,
                    uploadedAt: existingDoc.lastUpdatedAt || existingDoc.createdAt,
                    uploadedBy: existingDoc.lastUpdatedBy || existingDoc.author
                });
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
            { path: 'reviewCompletedBy', select: 'firstname lastname email' },
            { path: 'lastUpdatedBy', select: 'firstname lastname email' },
            { path: 'externalContacts.type' }
        ]);

        return updatedDoc;
    } catch (error) {
        logError('updateDocument', error, { documentId, userId: user.id });
        throw new Error(sanitizeErrorMessage(error, "Failed to update document"));
    }
}

/**
 * Delete a document
 * @param {string} documentId - Document ID
 * @param {Object} user - User object
 * @returns {Promise<void>}
 */
export async function deleteDocument(documentId, user) {
    try {
        // Check if document exists and user has access
        await getDocumentById(documentId, user);

        // Only admins or document authors can delete
        const doc = await Doc.findById(documentId);
        if (user.role !== 'admin' && doc.author.toString() !== user.id) {
            throw new Error("Insufficient permissions to delete document");
        }

        await Doc.findByIdAndDelete(documentId);
    } catch (error) {
        logError('deleteDocument', error, { documentId, userId: user.id });
        throw new Error(sanitizeErrorMessage(error, "Failed to delete document"));
    }
}
