/*
 * @name docsController
 * @file /docman/backend/src/controllers/docsController.js
 * @controller docsController
 * @description Document management controller for CRUD operations, file uploads, version control, and review workflows
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import Doc from "../models/Doc.js";
import File from "../models/File.js";
import User from "../models/User.js";
import { areAllObjectFieldsEmpty } from "../lib/utils.js";
import { sendDocumentAssignedNotification } from "./notificationsController.js";
import * as documentService from "../services/documentService.js";

/**
 * Helper function to send document assigned notifications
 * @param {string} docId - Document ID
 * @param {Array} stakeholders - Array of stakeholder user IDs
 * @param {Array} owners - Array of owner user IDs
 * @param {Array} reviewAssignees - Array of review assignee user IDs
 * @param {string} senderId - ID of the user sending the notifications
 */
async function sendDocumentNotifications(docId, stakeholders, owners, reviewAssignees, senderId) {
    try {
        // Combine stakeholders, owners, and review assignees into a single array
        const recipients = [...(stakeholders || []), ...(owners || []), ...(reviewAssignees || [])];
        
        // Remove duplicates
        const uniqueRecipients = [...new Set(recipients.map(id => id.toString()))];
        
        // Send notifications to each recipient
        for (const recipientId of uniqueRecipients) {
            // Skip if the recipient is the sender
            if (recipientId.toString() !== senderId.toString()) {
                await sendDocumentAssignedNotification(recipientId, senderId, docId);
            }
        }
    } catch (error) {
        console.error("Error sending document notifications:", error);
    }
}

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
 * Check if user has permission to access a document
 * @param {Object} doc - Document object
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {boolean} True if user has access
 */
function hasDocumentAccess(doc, userId, userRole) {
    // Admins and superadmins have access to all documents
    if (userRole === 'admin' || userRole === 'superadmin') return true;

    // Check if user is the author
    if (doc.author && doc.author._id && doc.author._id.toString() === userId) return true;
    if (doc.author && doc.author.toString() === userId) return true;

    // Check if user is a stakeholder
    if (doc.stakeholders && doc.stakeholders.some(stakeholder => {
        const stakeholderId = stakeholder._id ? stakeholder._id.toString() : stakeholder.toString();
        return stakeholderId === userId;
    })) return true;

    // Check if user is an owner
    if (doc.owners && doc.owners.some(owner => {
        const ownerId = owner._id ? owner._id.toString() : owner.toString();
        return ownerId === userId;
    })) return true;

    // Check if user is a review assignee
    if (doc.reviewAssignees && doc.reviewAssignees.some(assignee => {
        const assigneeId = assignee._id ? assignee._id.toString() : assignee.toString();
        return assigneeId === userId;
    })) return true;

    return false;
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
        const doc = await documentService.createDocument(req.body, req.file, req.user);

        // Send notifications to stakeholders, owners, and review assignees
        const parsedFields = documentService.parseDocumentFields(req.body);
        if (parsedFields.stakeholders || parsedFields.owners || parsedFields.reviewAssignees) {
            await sendDocumentNotifications(
                doc._id,
                parsedFields.stakeholders || [],
                parsedFields.owners || [],
                parsedFields.reviewAssignees || [],
                req.user?.id || null
            );
        }

        res.status(201).json({
            message: "Document created successfully",
            doc
        });
    } catch (error) {
        console.error("Error creating document:", error);
        const statusCode = error.message.includes("Invalid") ? 400 : 500;
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
            req.file,
            req.user
        );

        // Send notifications if stakeholders, owners, or review assignees were updated
        const { stakeholders, owners, reviewAssignees } = req.body;
        if (stakeholders || owners || reviewAssignees) {
            const parsedFields = documentService.parseDocumentFields(req.body);
            await sendDocumentNotifications(
                updatedDoc._id,
                parsedFields.stakeholders || updatedDoc.stakeholders,
                parsedFields.owners || updatedDoc.owners,
                parsedFields.reviewAssignees || updatedDoc.reviewAssignees,
                req.user?.id || null
            );
        }

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
 * Delete a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function deleteDoc(req, res) {
    try {
        const deletedDoc = await Doc.findByIdAndDelete(req.params.id);
        if (!deletedDoc) {
            return res.status(404).json({ message: "Document not found." });
        }
        res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Get all files associated with a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of files or error message
 */
export async function getDocFiles(req, res) {
    try {
        const docId = req.params.id;

        // Verify the document exists
        const doc = await Doc.findById(docId);
        if (!doc) {
            return res.status(404).json({ message: "Document not found." });
        }

        // Get all files for this document
        const files = await File.find({ documentId: docId }).sort({ uploadedAt: -1 });

        res.status(200).json(files);
    } catch (error) {
        console.error("Error fetching document files:", error);
        res.status(500).send("Internal Server Error");
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

        res.status(200).json({
            message: `Document marked as ${reviewCompleted ? 'reviewed' : 'not reviewed'}`,
            doc: updatedDoc
        });
    } catch (error) {
        console.error("Error marking document as reviewed:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Get a specific version of a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with file data or error message
 */
export async function getDocVersion(req, res) {
    try {
        const { id, version } = req.params;
        
        // Find the specific version of the file
        const file = await File.findOne({ 
            documentId: id, 
            version: parseInt(version) 
        });
        
        if (!file) {
            return res.status(404).json({ message: "Document version not found." });
        }
        
        res.status(200).json(file);
    } catch (error) {
        console.error("Error fetching document version:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Get version history for a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with version history or error message
 */
export async function getVersionHistory(req, res) {
    try {
        const { id } = req.params;
        
        // Get the document to retrieve its version history
        const doc = await Doc.findById(id);
        if (!doc) {
            return res.status(404).json({ message: "Document not found." });
        }
        
        // Sort version history by version number
        const sortedHistory = (doc.versionHistory || []).sort((a, b) => b.version - a.version);
        
        res.status(200).json(sortedHistory);
    } catch (error) {
        console.error("Error fetching version history:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Compare two versions of a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with comparison data or error message
 */
export async function compareDocVersions(req, res) {
    try {
        const { id } = req.params;
        const { version1, version2 } = req.query;
        
        if (!version1 || !version2) {
            return res.status(400).json({ message: "Both version1 and version2 query parameters are required." });
        }
        
        // Find both versions of the file
        const file1 = await File.findOne({ 
            documentId: id, 
            version: parseInt(version1) 
        });
        
        const file2 = await File.findOne({ 
            documentId: id, 
            version: parseInt(version2) 
        });
        
        if (!file1 || !file2) {
            return res.status(404).json({ message: "One or both document versions not found." });
        }
        
        // Get version history entries for context
        const doc = await Doc.findById(id);
        const history1 = doc.versionHistory.find(v => v.version === parseInt(version1));
        const history2 = doc.versionHistory.find(v => v.version === parseInt(version2));
        
        res.status(200).json({
            version1: {
                file: file1,
                history: history1
            },
            version2: {
                file: file2,
                history: history2
            },
            differences: {
                // For now, we'll just provide file metadata differences
                // In a more advanced implementation, we might do actual content diffing
                sizeDifference: file2.size - file1.size,
                dateDifference: file2.uploadedAt - file1.uploadedAt
            }
        });
    } catch (error) {
        console.error("Error comparing document versions:", error);
        res.status(500).send("Internal Server Error");
    }
}