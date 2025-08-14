// backend/src/models/Doc.js
import mongoose from "mongoose";

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

const Doc = mongoose.model("Document", docSchema);

export default Doc;