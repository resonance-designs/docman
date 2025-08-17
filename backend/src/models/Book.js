/*
 * @name Book
 * @file /docman/backend/src/models/Book.js
 * @model Book
 * @description Book model schema for organizing documents into collections within teams and projects
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import mongoose from "mongoose";

/**
 * Book schema for organizing documents into collections
 * @typedef {Object} BookSchema
 * @property {string} title - Book title (required)
 * @property {string} description - Book description (optional)
 * @property {ObjectId} author - Reference to User who created the book (required)
 * @property {ObjectId} category - Reference to Category for book classification (required, must be type 'Book')
 * @property {ObjectId[]} documents - Array of Document references contained in this book
 * @property {ObjectId[]} teams - Array of Team references this book belongs to
 * @property {ObjectId[]} projects - Array of Project references this book belongs to
 * @property {ObjectId[]} stakeholders - Array of User references who are stakeholders
 * @property {ObjectId[]} owners - Array of User references who own the book
 * @property {ObjectId} lastUpdatedBy - Reference to User who last updated the book (optional)
 * @property {Date} createdAt - Timestamp when book was created (auto-generated)
 * @property {Date} updatedAt - Timestamp when book was last updated (auto-generated)
 */
const bookSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: false
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
        documents: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document'
        }],
        teams: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        }],
        projects: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project'
        }],
        stakeholders: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        owners: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        }
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual for document count
bookSchema.virtual('documentCount').get(function() {
    return this.documents ? this.documents.length : 0;
});

// Virtual for team count
bookSchema.virtual('teamCount').get(function() {
    return this.teams ? this.teams.length : 0;
});

// Virtual for project count
bookSchema.virtual('projectCount').get(function() {
    return this.projects ? this.projects.length : 0;
});

// Index for efficient queries
bookSchema.index({ author: 1 });
bookSchema.index({ category: 1 });
bookSchema.index({ 'teams': 1 });
bookSchema.index({ 'projects': 1 });
bookSchema.index({ 'owners': 1 });
bookSchema.index({ 'stakeholders': 1 });
bookSchema.index({ title: 'text', description: 'text' });

// Instance method to add document to book
bookSchema.methods.addDocument = function(documentId) {
    if (!this.documents.includes(documentId)) {
        this.documents.push(documentId);
    }
};

// Instance method to remove document from book
bookSchema.methods.removeDocument = function(documentId) {
    this.documents = this.documents.filter(docId => 
        docId.toString() !== documentId.toString()
    );
};

// Instance method to add team to book
bookSchema.methods.addTeam = function(teamId) {
    if (!this.teams.includes(teamId)) {
        this.teams.push(teamId);
    }
};

// Instance method to remove team from book
bookSchema.methods.removeTeam = function(teamId) {
    this.teams = this.teams.filter(tId => 
        tId.toString() !== teamId.toString()
    );
};

// Instance method to add project to book
bookSchema.methods.addProject = function(projectId) {
    if (!this.projects.includes(projectId)) {
        this.projects.push(projectId);
    }
};

// Instance method to remove project from book
bookSchema.methods.removeProject = function(projectId) {
    this.projects = this.projects.filter(pId => 
        pId.toString() !== projectId.toString()
    );
};

// Instance method to check if user is owner
bookSchema.methods.isOwner = function(userId) {
    return this.owners.some(ownerId => 
        ownerId.toString() === userId.toString()
    );
};

// Instance method to check if user is stakeholder
bookSchema.methods.isStakeholder = function(userId) {
    return this.stakeholders.some(stakeholderId => 
        stakeholderId.toString() === userId.toString()
    );
};

/**
 * Book model for managing document collections
 * @type {mongoose.Model}
 */
const Book = mongoose.model("Book", bookSchema);

export default Book;