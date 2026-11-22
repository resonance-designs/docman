/*
 * @name docsController
 * @file /docman/backend/src/controllers/docsController.js
 * @controller docsController
 * @description Document management controller for CRUD operations, file uploads, version control, and review workflows
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import Doc from "../models/Doc.js";
import { record, AUDIT_ACTIONS } from "../services/auditService.js";
import { recordRevision, snapshotDocument } from "../services/revisionService.js";
import { areAllObjectFieldsEmpty } from "../lib/utils.js";
import * as documentService from "../services/documentService.js";
import { resetReviewAssignmentsForNewCycle, markAllReviewAssignmentsCompleted } from "./reviewController.js";

/**
 * Get all documents with optional filtering and sorting
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of documents or error message
 */
export async function getAllDocs(req, res) {
    try {
        const result = await documentService.getDocuments(req.query, req.user);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching documents:", error);
        const statusCode = error.message.includes("Access denied") ? 403 : 500;
        res.status(statusCode).json({
            message: error.message || "Failed to retrieve documents"
        });
    }
}

/**
 * Get a specific document by ID (with access control)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with document data or error message
 */
export async function getDocById(req, res) {
    try {
        const doc = await documentService.getDocumentById(req.params.id, req.user);
        if (process.env.AUDIT_LOG_READS !== 'false') {
            await record(req, {
                action: AUDIT_ACTIONS.DOCUMENT_VIEW,
                resourceType: "document",
                resourceId: doc._id,
                documentId: doc._id,
                summary: `Viewed document "${doc.title}"`,
            });
        }
        res.status(200).json(doc);
    } catch (error) {
        console.error("Error fetching document by ID:", error);
        const statusCode = error.message.includes("not found") ? 404 :
                          error.message.includes("Access denied") ? 403 : 500;
        res.status(statusCode).json({
            message: error.message || "Failed to retrieve document"
        });
    }
}

/**
 * Create a new document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created document data or error message
 */
export async function createDoc(req, res) {
    try {
        const { title, description, opensForReview, reviewDate, author, category } = req.body;

        // Validate required fields - support both new and old field names for migration
        const reviewDateField = opensForReview || reviewDate;
        if (!title || !description || !reviewDateField || !author || !category) {
            return res.status(400).json({
                message: "Title, description, opensForReview (or reviewDate), author, and category are required."
            });
        }

        // Create document using service
        const doc = await documentService.createDocument(req.body, req.file, req.user, req);

        res.status(201).json({
            message: "Document created successfully",
            doc
        });
    } catch (error) {
        console.error("Error creating document:", error);
        const statusCode = error.statusCode || (error.message.includes("Invalid") ? 400 : 500);
        res.status(statusCode).json({
            message: error.message || "Failed to create document"
        });
    }
}

/**
 * Update a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated document data or error message
 */
export async function updateDoc(req, res) {
    try {
        // Check if any fields were provided
        if (areAllObjectFieldsEmpty(req.body)) {
            return res.status(400).json({ message: "No fields were changed." });
        }

        // Update document using service
        const updatedDoc = await documentService.updateDocument(
            req.params.id,
            req.body,
            null,
            req.user,
            req
        );

        res.status(200).json({
            message: "Document updated successfully",
            doc: updatedDoc
        });
    } catch (error) {
        console.error("Error updating document:", error);
        const statusCode = error.message.includes("not found") ? 404 :
                          error.message.includes("Access denied") ? 403 :
                          error.message.includes("Invalid") ? 400 : 500;
        res.status(statusCode).json({
            message: error.message || "Failed to update document"
        });
    }
}

/**
 * Soft-delete a document (admins only). A reason is recorded in the revision history and audit log.
 */
export async function deleteDoc(req, res) {
    try {
        await documentService.deleteDocument(req.params.id, req.user, { reason: req.body?.reason, req });
        res.status(200).json({ message: "Document deleted successfully. It can be restored by an administrator." });
    } catch (error) {
        console.error("Error deleting document:", error);
        const statusCode = error.message.includes("not found") ? 404 :
                          error.message.includes("Access denied") ? 403 : 500;
        res.status(statusCode).json({ message: error.message || "Failed to delete document" });
    }
}

/**
 * Restore a soft-deleted document (admins only).
 */
export async function restoreDoc(req, res) {
    try {
        const doc = await documentService.restoreDocument(req.params.id, req.user, { reason: req.body?.reason, req });
        res.status(200).json({ message: "Document restored successfully", doc });
    } catch (error) {
        console.error("Error restoring document:", error);
        const statusCode = error.message.includes("not found") ? 404 :
                          error.message.includes("Invalid") ? 400 : 500;
        res.status(statusCode).json({ message: error.message || "Failed to restore document" });
    }
}

/**
 * List soft-deleted documents (admins only).
 */
export async function listDeletedDocs(req, res) {
    try {
        const docs = await documentService.listDeletedDocuments();
        res.status(200).json(docs);
    } catch (error) {
        console.error("Error listing deleted documents:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Mark a document as reviewed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated document data or error message
 */
export async function markDocAsReviewed(req, res) {
    try {
        const { id } = req.params;
        const { reviewCompleted } = req.body;

        // Validate input
        if (typeof reviewCompleted !== 'boolean') {
            return res.status(400).json({ message: "reviewCompleted must be a boolean value" });
        }

        const before = snapshotDocument(req.document);

        // If manually marking as completed, also mark all review assignments as completed
        if (reviewCompleted) {
            await markAllReviewAssignmentsCompleted(id, req.user?.id);
        }

        // Update the document
        const updatedDoc = await Doc.findByIdAndUpdate(
            id,
            {
                reviewCompleted,
                reviewCompletedAt: reviewCompleted ? new Date() : null,
                reviewCompletedBy: reviewCompleted ? req.user?.id : null,
                lastUpdatedBy: req.user?.id
            },
            { new: true }
        )
            .populate('author', 'firstname lastname email')
            .populate('category', 'name')
            .populate('stakeholders', 'firstname lastname email')
            .populate('owners', 'firstname lastname email')
            .populate('reviewAssignees', 'firstname lastname email')
            .populate('reviewCompletedBy', 'firstname lastname email')
            .populate('lastUpdatedBy', 'firstname lastname email')
            .populate('externalContacts.type');

        if (!updatedDoc) {
            return res.status(404).json({ message: "Document not found." });
        }

        const { changes } = await recordRevision({ doc: updatedDoc, before, action: "review", user: req.user });
        await record(req, {
            action: AUDIT_ACTIONS.DOCUMENT_MARK_REVIEWED,
            resourceType: "document",
            resourceId: id,
            documentId: id,
            summary: `Marked document as ${reviewCompleted ? 'reviewed' : 'not reviewed'}`,
            changes,
        });

        res.status(200).json({
            message: `Document marked as ${reviewCompleted ? 'reviewed' : 'not reviewed'}`,
            doc: updatedDoc
        });
    } catch (error) {
        console.error("Error marking document as reviewed:", error);
        res.status(500).send("Internal Server Error");
    }
}
