/*
 * @name Book
 * @file /docman/backend/src/models/Book.js
 * @model Book
 * @description Book model schema for organizing documents into collections within teams and projects
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import mongoose from "mongoose";

/**
 * Book schema for organizing documents into collections
 * @typedef {Object} BookSchema
 * @property {string} title - Book title (required)
 * @property {string} description - Book description (optional)
 * @property {ObjectId} category - Reference to Category for book classification (required, must be type 'Book')
 * @property {ObjectId[]} documents - Array of Document references contained in this book
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
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        documents: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document'
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

// Index for efficient queries
bookSchema.index({ category: 1 });
bookSchema.index({ 'owners': 1 });
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

// Instance method to check if user is owner
bookSchema.methods.isOwner = function(userId) {
    return this.owners.some(ownerId => 
        ownerId.toString() === userId.toString()
    );
};

/**
 * Book model for managing document collections
 * @type {mongoose.Model}
 */
const Book = mongoose.model("Book", bookSchema);

export default Book;