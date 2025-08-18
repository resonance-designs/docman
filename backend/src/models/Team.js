/*
 * @name Team
 * @file /docman/backend/src/models/Team.js
 * @model Team
 * @description Team model schema for collaborative team management with members, invitations, and project associations
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
// backend/src/models/Team.js
import mongoose from "mongoose";

/**
 * Team schema for managing collaborative teams and their members
 * @typedef {Object} TeamSchema
 * @property {string} name - Team name (required, max 100 chars)
 * @property {string} description - Team description (optional, max 500 chars)
 * @property {ObjectId} owner - Reference to User who owns the team (required)
 * @property {Object[]} members - Array of team member objects
 * @property {ObjectId} members.user - Reference to User who is a member
 * @property {string} members.role - Member role: 'member' or 'admin' (default: 'member')
 * @property {Date} members.joinedAt - When the user joined the team (default: now)
 * @property {Object[]} invitations - Array of pending invitation objects
 * @property {string} invitations.email - Email address of invited user
 * @property {string} invitations.role - Role for invited user: 'member' or 'admin'
 * @property {ObjectId} invitations.invitedBy - Reference to User who sent the invitation
 * @property {Date} invitations.invitedAt - When invitation was sent (default: now)
 * @property {string} invitations.status - Invitation status: 'pending', 'accepted', 'declined', 'expired'
 * @property {string} invitations.token - Unique token for invitation verification
 * @property {Date} invitations.expiresAt - When invitation expires (default: 7 days from creation)
 * @property {Object} settings - Team configuration settings
 * @property {boolean} settings.isPrivate - Whether team is private (default: false)
 * @property {boolean} settings.allowMemberInvites - Whether members can invite others (default: false)
 * @property {ObjectId} lastUpdatedBy - Reference to User who last updated the team (optional)
 * @property {Date} createdAt - Timestamp when team was created (auto-generated)
 * @property {Date} updatedAt - Timestamp when team was last updated (auto-generated)
 * @property {number} memberCount - Virtual field for number of members
 * @property {number} projectCount - Virtual field for number of projects
 */
const teamSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Team name is required"],
            trim: true,
            maxlength: [100, "Team name cannot exceed 100 characters"]
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description cannot exceed 500 characters"]
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, "Team owner is required"]
        },
        members: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            role: {
                type: String,
                enum: ['member', 'admin'],
                default: 'member'
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }],
        invitations: [{
            email: {
                type: String,
                required: true
            },
            role: {
                type: String,
                enum: ['member', 'admin'],
                default: 'member'
            },
            invitedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            invitedAt: {
                type: Date,
                default: Date.now
            },
            status: {
                type: String,
                enum: ['pending', 'accepted', 'declined', 'expired'],
                default: 'pending'
            },
            token: {
                type: String,
                required: true
            },
            expiresAt: {
                type: Date,
                required: true,
                default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        }],
        books: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book'
        }],
        documents: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document'
        }],
        projects: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project'
        }],
        settings: {
            isPrivate: {
                type: Boolean,
                default: false
            },
            allowMemberInvites: {
                type: Boolean,
                default: false
            }
        },
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

/**
 * Virtual field to get the number of team members
 * @returns {number} Number of members in the team
 */
teamSchema.virtual('memberCount').get(function() {
    return this.members ? this.members.length : 0;
});

/**
 * Virtual field to get the number of projects associated with this team
 * @returns {number} Number of projects in the team
 */
teamSchema.virtual('projectCount').get(function() {
    return this.projects ? this.projects.length : 0;
});

/**
 * Virtual field to get the number of books associated with this team
 * @returns {number} Number of books in the team
 */
teamSchema.virtual('bookCount').get(function() {
    return this.books ? this.books.length : 0;
});

/**
 * Virtual field to get the number of documents associated with this team
 * @returns {number} Number of documents in the team
 */
teamSchema.virtual('documentCount').get(function() {
    return this.documents ? this.documents.length : 0;
});

/**
 * Database indexes for efficient queries
 */
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ name: 'text', description: 'text' });

/**
 * Pre-save middleware to ensure team owner is always included in members array
 * Automatically adds owner as admin member if not already present
 * @param {Function} next - Callback to continue with save operation
 */
teamSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('owner')) {
        // Check if owner is already in members
        const ownerInMembers = this.members.some(member =>
            member.user.toString() === this.owner.toString()
        );

        if (!ownerInMembers) {
            this.members.push({
                user: this.owner,
                role: 'admin',
                joinedAt: new Date()
            });
        }
    }
    next();
});

/**
 * Check if a user is a member of this team
 * @param {string|ObjectId} userId - User ID to check
 * @returns {boolean} True if user is a member of the team
 */
teamSchema.methods.isMember = function(userId) {
    return this.members.some(member =>
        member.user.toString() === userId.toString()
    );
};

/**
 * Check if a user is an admin of this team
 * @param {string|ObjectId} userId - User ID to check
 * @returns {boolean} True if user is an admin of the team
 */
teamSchema.methods.isAdmin = function(userId) {
    return this.members.some(member =>
        member.user.toString() === userId.toString() && member.role === 'admin'
    );
};

/**
 * Get a user's role in this team
 * @param {string|ObjectId} userId - User ID to check
 * @returns {string|null} User's role ('member' or 'admin') or null if not a member
 */
teamSchema.methods.getUserRole = function(userId) {
    const member = this.members.find(member =>
        member.user.toString() === userId.toString()
    );
    return member ? member.role : null;
};

/**
 * Add a book to this team
 * @param {string|ObjectId} bookId - Book ID to add
 * @returns {boolean} True if book was added, false if already exists
 */
teamSchema.methods.addBook = function(bookId) {
    if (!this.books.includes(bookId)) {
        this.books.push(bookId);
        return true;
    }
    return false;
};

/**
 * Remove a book from this team
 * @param {string|ObjectId} bookId - Book ID to remove
 * @returns {boolean} True if book was removed, false if not found
 */
teamSchema.methods.removeBook = function(bookId) {
    const initialLength = this.books.length;
    this.books = this.books.filter(id => id.toString() !== bookId.toString());
    return this.books.length < initialLength;
};

/**
 * Check if a book is assigned to this team
 * @param {string|ObjectId} bookId - Book ID to check
 * @returns {boolean} True if book is assigned to this team
 */
teamSchema.methods.hasBook = function(bookId) {
    return this.books.some(id => id.toString() === bookId.toString());
};

/**
 * Add a document to this team
 * @param {string|ObjectId} documentId - Document ID to add
 * @returns {boolean} True if document was added, false if already exists
 */
teamSchema.methods.addDocument = function(documentId) {
    if (!this.documents.includes(documentId)) {
        this.documents.push(documentId);
        return true;
    }
    return false;
};

/**
 * Remove a document from this team
 * @param {string|ObjectId} documentId - Document ID to remove
 * @returns {boolean} True if document was removed, false if not found
 */
teamSchema.methods.removeDocument = function(documentId) {
    const initialLength = this.documents.length;
    this.documents = this.documents.filter(id => id.toString() !== documentId.toString());
    return this.documents.length < initialLength;
};

/**
 * Check if a document is assigned to this team
 * @param {string|ObjectId} documentId - Document ID to check
 * @returns {boolean} True if document is assigned to this team
 */
teamSchema.methods.hasDocument = function(documentId) {
    return this.documents.some(id => id.toString() === documentId.toString());
};

/**
 * Add a project to this team
 * @param {string|ObjectId} projectId - Project ID to add
 * @returns {boolean} True if project was added, false if already exists
 */
teamSchema.methods.addProject = function(projectId) {
    if (!this.projects.includes(projectId)) {
        this.projects.push(projectId);
        return true;
    }
    return false;
};

/**
 * Remove a project from this team
 * @param {string|ObjectId} projectId - Project ID to remove
 * @returns {boolean} True if project was removed, false if not found
 */
teamSchema.methods.removeProject = function(projectId) {
    const initialLength = this.projects.length;
    this.projects = this.projects.filter(id => id.toString() !== projectId.toString());
    return this.projects.length < initialLength;
};

/**
 * Check if a project is assigned to this team
 * @param {string|ObjectId} projectId - Project ID to check
 * @returns {boolean} True if project is assigned to this team
 */
teamSchema.methods.hasProject = function(projectId) {
    return this.projects.some(id => id.toString() === projectId.toString());
};

/**
 * Team model for managing collaborative teams and memberships
 * @type {mongoose.Model}
 */
const Team = mongoose.model("Team", teamSchema);

export default Team;
