/*
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
// backend/src/models/Project.js
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Project name is required"],
            trim: true,
            maxlength: [100, "Project name cannot exceed 100 characters"]
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, "Description cannot exceed 1000 characters"]
        },
        team: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
            required: [true, "Project must belong to a team"]
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, "Project owner is required"]
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'archived', 'on-hold'],
            default: 'active'
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: {
            type: Date
        },
        documents: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document'
        }],
        collaborators: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            role: {
                type: String,
                enum: ['viewer', 'contributor', 'manager'],
                default: 'contributor'
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }],
        tags: [{
            type: String,
            trim: true,
            maxlength: [50, "Tag cannot exceed 50 characters"]
        }],
        settings: {
            isPrivate: {
                type: Boolean,
                default: false
            },
            allowDocumentUpload: {
                type: Boolean,
                default: true
            },
            requireApproval: {
                type: Boolean,
                default: false
            }
        }
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual for document count
projectSchema.virtual('documentCount').get(function() {
    return this.documents ? this.documents.length : 0;
});

// Virtual for collaborator count
projectSchema.virtual('collaboratorCount').get(function() {
    return this.collaborators ? this.collaborators.length : 0;
});

// Virtual for progress calculation (based on document review dates)
projectSchema.virtual('progress').get(function() {
    if (!this.documents || this.documents.length === 0) return 0;
    
    const now = new Date();
    const reviewedDocs = this.documents.filter(doc => 
        doc.reviewDate && new Date(doc.reviewDate) > now
    );
    
    return Math.round((reviewedDocs.length / this.documents.length) * 100);
});

// Index for efficient queries
projectSchema.index({ team: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ 'collaborators.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to ensure owner is in collaborators
projectSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('owner')) {
        // Check if owner is already in collaborators
        const ownerInCollaborators = this.collaborators.some(collab => 
            collab.user.toString() === this.owner.toString()
        );
        
        if (!ownerInCollaborators) {
            this.collaborators.push({
                user: this.owner,
                role: 'manager',
                addedAt: new Date()
            });
        }
    }
    next();
});

// Instance method to check if user is collaborator
projectSchema.methods.isCollaborator = function(userId) {
    return this.collaborators.some(collab => 
        collab.user.toString() === userId.toString()
    );
};

// Instance method to check if user is manager
projectSchema.methods.isManager = function(userId) {
    return this.collaborators.some(collab => 
        collab.user.toString() === userId.toString() && collab.role === 'manager'
    );
};

// Instance method to get user's role in project
projectSchema.methods.getUserRole = function(userId) {
    const collaborator = this.collaborators.find(collab => 
        collab.user.toString() === userId.toString()
    );
    return collaborator ? collaborator.role : null;
};

// Instance method to add document to project
projectSchema.methods.addDocument = function(documentId) {
    if (!this.documents.includes(documentId)) {
        this.documents.push(documentId);
    }
};

// Instance method to remove document from project
projectSchema.methods.removeDocument = function(documentId) {
    this.documents = this.documents.filter(docId => 
        docId.toString() !== documentId.toString()
    );
};

const Project = mongoose.model("Project", projectSchema);

export default Project;
