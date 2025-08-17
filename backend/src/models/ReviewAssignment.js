/*
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import mongoose from "mongoose";

const reviewAssignmentSchema = new mongoose.Schema({
    document: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'overdue'],
        default: 'pending'
    },
    completedDate: {
        type: Date,
        required: false
    },
    notes: {
        type: String,
        required: false
    },
    // If review determines updates are needed
    requiresUpdates: {
        type: Boolean,
        default: false
    },
    updateNotes: {
        type: String,
        required: false
    },
    // Assignment for updates
    updateAssignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReviewAssignment',
        required: false
    }
}, {
    timestamps: true
});

// Index for efficient querying
reviewAssignmentSchema.index({ document: 1, assignee: 1 });
reviewAssignmentSchema.index({ dueDate: 1 });
reviewAssignmentSchema.index({ status: 1 });

const ReviewAssignment = mongoose.model("ReviewAssignment", reviewAssignmentSchema);

export default ReviewAssignment;