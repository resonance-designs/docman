/*
 * @name Documents Controller
 * @file /docman/backend/src/controllers/docsController.js
 * @module docsController
 * @description Controller functions for document management including viewing, creating, updating, and deleting documents, as well as versioning and file management.
 * @author Richard Bakos
 * @version 1.1.8
 * @license UNLICENSED
 */

import Doc from "../models/Doc.js";
import File from "../models/File.js";
import User from "../models/User.js";
import { areAllObjectFieldsEmpty } from "../lib/utils.js";
import { sendDocumentAssignedNotification } from "./notificationsController.js";

/**
 * Helper function to send document assigned notifications
 * @param {string} docId - Document ID
 * @param {Array} stakeholders - Array of stakeholder user IDs
 * @param {Array} owners - Array of owner user IDs
 * @param {string} senderId - ID of the user sending the notifications
 */
async function sendDocumentNotifications(docId, stakeholders, owners, senderId) {
    try {
        // Combine stakeholders and owners into a single array
        const recipients = [...(stakeholders || []), ...(owners || [])];
        
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
        const {
            limit,
            search,
            category,
            author,
            overdue,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = {};

        // Search filter - search in title and description
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Category filter
        if (category) {
            filter.category = category;
        }

        // Author filter
        if (author) {
            filter.author = author;
        }

        // Overdue filter
        if (overdue === 'true') {
            filter.reviewDate = { $lt: new Date() };
        }

        // Date range filter (for createdAt)
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Add one day to include the end date
                const endDateTime = new Date(endDate);
                endDateTime.setDate(endDateTime.getDate() + 1);
                filter.createdAt.$lt = endDateTime;
            }
        }

        // Build sort object
        const sortObj = {};
        const validSortFields = ['title', 'createdAt', 'reviewDate', 'author', 'category'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;

        // Handle special sorting for populated fields
        if (sortField === 'author') {
            sortObj['author.firstname'] = sortDirection;
        } else if (sortField === 'category') {
            sortObj['category.name'] = sortDirection;
        } else {
            sortObj[sortField] = sortDirection;
        }

        // Build the query with population and filtering
        let query = Doc.find(filter)
            .populate('author', 'firstname lastname email')
            .populate('category', 'name')
            .populate('stakeholders', 'firstname lastname email')
            .populate('owners', 'firstname lastname email')
            .populate('reviewCompletedBy', 'firstname lastname email')
            .populate('lastUpdatedBy', 'firstname lastname email')
            .populate('externalContacts.type');

        // Apply sorting
        if (sortField === 'author' || sortField === 'category') {
            // For populated fields, we need to sort after population
            query = query.sort(sortObj);
        } else {
            query = query.sort(sortObj);
        }

        // Apply limit only if provided
        const limitNum = limit ? parseInt(limit, 10) : null;
        if (limitNum && !isNaN(limitNum)) {
            query = query.limit(limitNum);
        }

        const docs = await query;

        // If sorting by populated fields, sort in memory
        if (sortField === 'author') {
            docs.sort((a, b) => {
                const aName = `${a.author?.firstname || ''} ${a.author?.lastname || ''}`.trim();
                const bName = `${b.author?.firstname || ''} ${b.author?.lastname || ''}`.trim();
                return sortDirection === 1 ? aName.localeCompare(bName) : bName.localeCompare(aName);
            });
        } else if (sortField === 'category') {
            docs.sort((a, b) => {
                const aName = a.category?.name || '';
                const bName = b.category?.name || '';
                return sortDirection === 1 ? aName.localeCompare(bName) : bName.localeCompare(aName);
            });
        }

        res.status(200).json(docs);
    } catch (error) {
        console.error("Error fetching documents:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Get a specific document by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with document data or error message
 */
export async function getDocById(req, res) {
    try {
        const doc = await Doc.findById(req.params.id)
            .populate('author', 'firstname lastname email')
            .populate('category', 'name')
            .populate('stakeholders', 'firstname lastname email')
            .populate('owners', 'firstname lastname email')
            .populate('reviewCompletedBy', 'firstname lastname email')
            .populate('lastUpdatedBy', 'firstname lastname email')
            .populate('externalContacts.type');

        if (!doc) return res.status(404).json({ message: "Document not found." });
        res.status(200).json(doc);
    } catch (error) {
        console.error("Error fetching document by ID:", error);
        res.status(500).send("Internal Server Error");
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
        const { title, description, reviewDate, author, category, stakeholders, owners, reviewCompleted, reviewCompletedAt, externalContacts } = req.body;
        const file = req.file;

        if (!title || !description || !reviewDate || !author || !category) {
            return res.status(400).json({ message: "Title, description, reviewDate, author, and category are required." });
        }

        // Parse stakeholders and owners if they exist
        let stakeholdersArray = [];
        let ownersArray = [];
        let externalContactsArray = [];

        if (stakeholders) {
            try {
                stakeholdersArray = JSON.parse(stakeholders);
            } catch (error) {
                console.error("Error parsing stakeholders:", error);
                return res.status(400).json({ message: "Invalid stakeholders format" });
            }
        }

        if (owners) {
            try {
                ownersArray = JSON.parse(owners);
            } catch (error) {
                console.error("Error parsing owners:", error);
                return res.status(400).json({ message: "Invalid owners format" });
            }
        }
        
        // Parse external contacts if they exist
        if (externalContacts) {
            try {
                externalContactsArray = JSON.parse(externalContacts);
            } catch (error) {
                console.error("Error parsing external contacts:", error);
                return res.status(400).json({ message: "Invalid external contacts format" });
            }
        }

        // Create the document entry
        const newDoc = new Doc({
            title,
            description,
            reviewDate,
            author,
            category,
            stakeholders: stakeholdersArray,
            owners: ownersArray,
            externalContacts: externalContactsArray,
            reviewCompleted: reviewCompleted || false,
            reviewCompletedAt: reviewCompletedAt || null,
            reviewCompletedBy: req.user?.id || null,
            lastUpdatedBy: req.user?.id || null
        });

        await newDoc.save();

        // If a file was uploaded, save the file metadata and initialize version history
        if (file) {
            const newFile = new File({
                filename: file.filename,
                originalname: file.originalname,
                path: file.path,
                mimetype: file.mimetype,
                size: file.size,
                documentId: newDoc._id,
                uploadedAt: new Date(),
                uploadedBy: req.user?.id || null,
            });
            await newFile.save();
            
            // Initialize version history
            newDoc.currentVersion = newFile.version;
            newDoc.versionHistory = [{
                version: newFile.version,
                label: newFile.versionLabel,
                uploadedAt: newFile.uploadedAt,
                uploadedBy: newFile.uploadedBy,
                changelog: newFile.changelog
            }];
            await newDoc.save();
        }

        // Send notifications to stakeholders and owners
        await sendDocumentNotifications(newDoc._id, stakeholdersArray, ownersArray, req.user?.id || null);

        // Populate the response
        const populatedDoc = await Doc.findById(newDoc._id)
            .populate('author', 'firstname lastname email')
            .populate('category', 'name')
            .populate('stakeholders', 'firstname lastname email')
            .populate('owners', 'firstname lastname email')
            .populate('reviewCompletedBy', 'firstname lastname email')
            .populate('lastUpdatedBy', 'firstname lastname email');

        res.status(201).json({ message: "Document created successfully", doc: populatedDoc });
    } catch (error) {
        console.error("Error creating document:", error);
        res.status(500).send("Internal Server Error");
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
        const { title, description, reviewDate, author, category, stakeholders, owners, reviewCompleted, reviewCompletedAt, externalContacts } = req.body;
        const docObject = req.body;
        const objectIsEmpty = areAllObjectFieldsEmpty(docObject);

        if (objectIsEmpty) {
            return res.status(400).json({message: "No fields were changed."});
        }

        // Parse arrays if they exist
        let updateData = { title, description, reviewDate, author, category };

        if (stakeholders) {
            try {
                updateData.stakeholders = JSON.parse(stakeholders);
            } catch (error) {
                console.error("Error parsing stakeholders:", error);
                return res.status(400).json({ message: "Invalid stakeholders format" });
            }
        }

        if (owners) {
            try {
                updateData.owners = JSON.parse(owners);
            } catch (error) {
                console.error("Error parsing owners:", error);
                return res.status(400).json({ message: "Invalid owners format" });
            }
        }
        
        // Parse external contacts if they exist
        if (externalContacts) {
            try {
                updateData.externalContacts = JSON.parse(externalContacts);
            } catch (error) {
                console.error("Error parsing external contacts:", error);
                return res.status(400).json({ message: "Invalid external contacts format" });
            }
        }

        // Add review completion fields if provided
        if (reviewCompleted !== undefined) {
            updateData.reviewCompleted = reviewCompleted;
        }
        
        if (reviewCompletedAt !== undefined) {
            updateData.reviewCompletedAt = reviewCompletedAt;
        }
        
        // Always update lastUpdatedBy field
        updateData.lastUpdatedBy = req.user?.id || null;

        const updatedDoc = await Doc.findByIdAndUpdate(req.params.id, updateData, {new: true})
            .populate('author', 'firstname lastname email')
            .populate('category', 'name')
            .populate('stakeholders', 'firstname lastname email')
            .populate('owners', 'firstname lastname email')
            .populate('reviewCompletedBy', 'firstname lastname email')
            .populate('lastUpdatedBy', 'firstname lastname email');

        if (!updatedDoc) {
            return res.status(404).json({ message: "Document not found."});
        }

        // Send notifications to stakeholders and owners if they were updated
        if (stakeholders || owners) {
            await sendDocumentNotifications(
                updatedDoc._id,
                stakeholders ? updateData.stakeholders : updatedDoc.stakeholders,
                owners ? updateData.owners : updatedDoc.owners,
                req.user?.id || null
            );
        }

        res.status(200).json({ message: "Document updated successfully", doc: updatedDoc });
    } catch (error) {
        console.error("Error updating document:", error);
        res.status(500).send("Internal Server Error");
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