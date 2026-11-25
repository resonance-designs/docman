/*
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
// backend/src/models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        eventKey: { type: String },
        relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        emailStatus: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'skipped'], default: 'pending', select: false },
        emailAttempts: { type: Number, default: 0, select: false },
        emailNextAttempt: { type: Date, default: Date.now, select: false },
        emailLeaseUntil: { type: Date, select: false },
        emailClaim: { type: String, select: false },
        emailLastError: { type: String, select: false },
        emailSentAt: { type: Date, select: false },
        allowInactiveEmail: { type: Boolean, default: false, select: false },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        type: {
            type: String,
            enum: [
                'team_invitation', 
                'team_invitation_accepted',
                'team_invitation_declined',
                'document_assigned',
                'document_review_due',
                'document_review_completed',
                'document_updated',
                'profile_updated',
                'system_updated',
                'message'
            ],
            required: true
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        relatedDoc: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            required: false
        },
        relatedTeam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
            required: false
        },
        isRead: {
            type: Boolean,
            default: false
        },
        readAt: {
            type: Date,
            required: false
        },
        // For team invitations, we might want to store the invitation token
        invitationToken: {
            type: String,
            required: false
        }
    },
    { 
        timestamps: true 
    }
);

notificationSchema.index({ eventKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ emailStatus: 1, emailNextAttempt: 1 });
// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
