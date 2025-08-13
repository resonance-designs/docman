// backend/src/models/Team.js
import mongoose from "mongoose";

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
        settings: {
            isPrivate: {
                type: Boolean,
                default: false
            },
            allowMemberInvites: {
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

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
    return this.members ? this.members.length : 0;
});

// Virtual for project count
teamSchema.virtual('projectCount', {
    ref: 'Project',
    localField: '_id',
    foreignField: 'team',
    count: true
});

// Index for efficient queries
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to ensure owner is in members
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

// Instance method to check if user is member
teamSchema.methods.isMember = function(userId) {
    return this.members.some(member => 
        member.user.toString() === userId.toString()
    );
};

// Instance method to check if user is admin
teamSchema.methods.isAdmin = function(userId) {
    return this.members.some(member => 
        member.user.toString() === userId.toString() && member.role === 'admin'
    );
};

// Instance method to get user's role in team
teamSchema.methods.getUserRole = function(userId) {
    const member = this.members.find(member => 
        member.user.toString() === userId.toString()
    );
    return member ? member.role : null;
};

const Team = mongoose.model("Team", teamSchema);

export default Team;
