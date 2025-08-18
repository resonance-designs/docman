/*
 * @name Doc
 * @file /docman/backend/src/models/Doc.js
 * @model Doc
 * @description Document model schema for managing document metadata, version history, stakeholders, and review workflows
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
// backend/src/models/Doc.js
import mongoose from "mongoose";

/**
 * Document schema for storing document metadata and tracking information
 * @typedef {Object} DocSchema
 * @property {string} title - Document title (required)
 * @property {string} description - Document description (required)
 * @property {Date} reviewDate - Date when document needs to be reviewed (required)
 * @property {ObjectId} author - Reference to User who created the document (required)
 * @property {ObjectId} category - Reference to Category for document classification (required)
 * @property {ObjectId[]} stakeholders - Array of User references who are stakeholders
 * @property {ObjectId[]} owners - Array of User references who own the document
 * @property {ObjectId[]} projects - Array of Project references this document belongs to
 * @property {boolean} reviewCompleted - Whether the document review is completed (default: false)
 * @property {Date} reviewCompletedAt - Timestamp when review was completed (optional)
 * @property {ObjectId} reviewCompletedBy - Reference to User who completed the review (optional)
 * @property {ObjectId} lastUpdatedBy - Reference to User who last updated the document (optional)
 * @property {number} currentVersion - Current version number of the document (default: 1)
 * @property {Object[]} versionHistory - Array of version history objects
 * @property {number} versionHistory.version - Version number
 * @property {string} versionHistory.label - Version label/description
 * @property {Date} versionHistory.uploadedAt - When this version was uploaded
 * @property {ObjectId} versionHistory.uploadedBy - User who uploaded this version
 * @property {string} versionHistory.changelog - Changes made in this version
 * @property {Object[]} externalContacts - Array of external contact objects
 * @property {string} externalContacts.name - Contact name
 * @property {string} externalContacts.email - Contact email
 * @property {string} externalContacts.phoneNumber - Contact phone number
 * @property {ObjectId} externalContacts.type - Reference to ExternalContactType
 * @property {Date} createdAt - Timestamp when document was created (auto-generated)
 * @property {Date} updatedAt - Timestamp when document was last updated (auto-generated)
 */
const docSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        reviewDate: {
            type: Date,
            required: true
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        stakeholders: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        owners: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        projects: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project'
        }],
        reviewCompleted: {
            type: Boolean,
            default: false
        },
        reviewCompletedAt: {
            type: Date,
            required: false
        },
        reviewCompletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        currentVersion: {
            type: Number,
            default: 1
        },
        versionHistory: [{
            version: Number,
            label: String,
            uploadedAt: Date,
            uploadedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            changelog: String
        }],
        externalContacts: [{
            name: String,
            email: String,
            phoneNumber: String,
            type: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ExternalContactType'
            }
        }]
    },
    { timestamps: true } // createdAt and updatedAt fields
);

/**
 * Document model for managing document metadata and tracking
 * @type {mongoose.Model}
 */
const Doc = mongoose.model("Document", docSchema);

export default Doc;