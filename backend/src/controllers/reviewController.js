/*
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import ReviewAssignment from "../models/ReviewAssignment.js";
import Doc from "../models/Doc.js";
import User from "../models/User.js";
import { sendEmail } from "../lib/emailService.js";

/**
 * Create review assignments for a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created assignments or error message
 */
export async function createReviewAssignments(req, res) {
    try {
        const { documentId, assignments } = req.body; // assignments is an array of { assignee, dueDate, notes }

        // Verify document exists
        const doc = await Doc.findById(documentId);
        if (!doc) {
            return res.status(404).json({ message: "Document not found." });
        }

        // Create review assignments
        const createdAssignments = [];
        for (const assignment of assignments) {
            const newAssignment = new ReviewAssignment({
                document: documentId,
                assignee: assignment.assignee,
                assignedBy: req.user._id || req.user.id,
                dueDate: assignment.dueDate,
                notes: assignment.notes,
                status: 'pending'
            });
            
            await newAssignment.save();
            createdAssignments.push(newAssignment);

            // Send email notification to assignee
            try {
                await sendReviewAssignmentEmail(newAssignment, doc);
            } catch (emailError) {
                console.error("Error sending email notification:", emailError);
                // Don't fail the entire operation if email fails
            }
        }

        // Populate the assignments with user details
        const populatedAssignments = await ReviewAssignment.find({
            _id: { $in: createdAssignments.map(a => a._id) }
        })
            .populate('assignee', 'firstname lastname email')
            .populate('assignedBy', 'firstname lastname email')
            .populate('document', 'title');

        res.status(201).json({
            message: "Review assignments created successfully",
            assignments: populatedAssignments
        });
    } catch (error) {
        console.error("Error creating review assignments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get review assignments for a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of assignments or error message
 */
export async function getDocumentReviewAssignments(req, res) {
    try {
        const { documentId } = req.params;

        // Verify document exists
        const doc = await Doc.findById(documentId);
        if (!doc) {
            return res.status(404).json({ message: "Document not found." });
        }

        // Clean up any orphaned and duplicate assignments first
        await cleanupOrphanedReviewAssignments(documentId);
        await cleanupDuplicateReviewAssignments(documentId);

        // Get all assignments for the document, sorted by creation date (newest first)
        const allAssignments = await ReviewAssignment.find({ document: documentId })
            .populate('assignee', 'firstname lastname email')
            .populate('assignedBy', 'firstname lastname email')
            .sort({ createdAt: -1 });

        // Filter to get only the latest assignment for each unique assignee
        const latestAssignments = [];
        const seenAssignees = new Set();

        for (const assignment of allAssignments) {
            // Skip assignments with null or undefined assignees
            if (!assignment.assignee || !assignment.assignee._id) {
                console.warn(`Skipping assignment ${assignment._id} with null assignee`);
                continue;
            }
            
            const assigneeId = assignment.assignee._id.toString();
            if (!seenAssignees.has(assigneeId)) {
                seenAssignees.add(assigneeId);
                latestAssignments.push(assignment);
            }
        }

        // Sort by due date for consistent ordering
        latestAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        res.status(200).json(latestAssignments);
    } catch (error) {
        console.error("Error fetching review assignments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get review assignments for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of assignments or error message
 */
export async function getUserReviewAssignments(req, res) {
    try {
        const { userId } = req.params;
        const { status } = req.query; // Optional filter by status

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Build filter
        const filter = { assignee: userId };
        if (status) {
            filter.status = status;
        }

        const assignments = await ReviewAssignment.find(filter)
            .populate('document', 'title description')
            .populate('assignedBy', 'firstname lastname email')
            .sort({ dueDate: 1 });

        res.status(200).json(assignments);
    } catch (error) {
        console.error("Error fetching user review assignments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Update review assignment status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated assignment or error message
 */
export async function updateReviewAssignment(req, res) {
    try {
        const { id } = req.params;
        const { status, requiresUpdates, updateNotes } = req.body;

        const assignment = await ReviewAssignment.findById(id);
        if (!assignment) {
            return res.status(404).json({ message: "Review assignment not found." });
        }

        // Update fields if provided
        if (status) {
            assignment.status = status;
            if (status === 'completed') {
                assignment.completedDate = new Date();
            }
        }

        if (requiresUpdates !== undefined) {
            assignment.requiresUpdates = requiresUpdates;
        }

        if (updateNotes !== undefined) {
            assignment.updateNotes = updateNotes;
        }

        await assignment.save();

        // If updates are required, create a new assignment for the author
        if (requiresUpdates && requiresUpdates === true) {
            await createUpdateAssignment(assignment);
        }

        // Check document review status whenever any assignment status changes
        if (status) {
            console.log(`🔄 Assignment ${id} status changed to: ${status}. Checking document review status...`);
            await checkAndUpdateDocumentReviewStatus(assignment.document);
        }

        // Populate the assignment with details
        const populatedAssignment = await ReviewAssignment.findById(assignment._id)
            .populate('assignee', 'firstname lastname email')
            .populate('assignedBy', 'firstname lastname email')
            .populate('document', 'title');

        res.status(200).json({
            message: "Review assignment updated successfully",
            assignment: populatedAssignment
        });
    } catch (error) {
        console.error("Error updating review assignment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get overdue review assignments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of overdue assignments or error message
 */
export async function getOverdueReviewAssignments(req, res) {
    try {
        const now = new Date();
        const assignments = await ReviewAssignment.find({
            dueDate: { $lt: now },
            status: { $in: ['pending', 'in-progress'] }
        })
            .populate('document', 'title description')
            .populate('assignee', 'firstname lastname email')
            .populate('assignedBy', 'firstname lastname email')
            .sort({ dueDate: 1 });

        res.status(200).json(assignments);
    } catch (error) {
        console.error("Error fetching overdue review assignments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Send email notification for review assignment
 * @param {Object} assignment - Review assignment object
 * @param {Object} doc - Document object
 * @returns {Promise<void>}
 */
async function sendReviewAssignmentEmail(assignment, doc) {
    try {
        // Get assignee details
        const assignee = await User.findById(assignment.assignee);
        if (!assignee) return;

        // Get document details
        const document = doc || await Doc.findById(assignment.document);
        if (!document) return;

        // Get assigned by details
        const assignedBy = await User.findById(assignment.assignedBy);
        if (!assignedBy) return;

        const subject = `Document Review Assignment: ${document.title}`;

        const text = `
Hello ${assignee.firstname},

You have been assigned to review the document "${document.title}" by ${assignedBy.firstname} ${assignedBy.lastname}.

Document details:
- Title: ${document.title}
- Due Date: ${assignment.dueDate.toDateString()}
${assignment.notes ? `- Notes: ${assignment.notes}` : ''}

Please review this document and provide your feedback.

Best regards,
DocMan System
        `;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Document Review Assignment</title>
</head>
<body>
    <h2>Hello ${assignee.firstname},</h2>
    
    <p>You have been assigned to review the document <strong>"${document.title}"</strong> by ${assignedBy.firstname} ${assignedBy.lastname}.</p>
    
    <h3>Document details:</h3>
    <ul>
        <li><strong>Title:</strong> ${document.title}</li>
        <li><strong>Due Date:</strong> ${assignment.dueDate.toDateString()}</li>
        ${assignment.notes ? `<li><strong>Notes:</strong> ${assignment.notes}</li>` : ''}
    </ul>
    
    <p>Please review this document and provide your feedback.</p>
    
    <p>Best regards,<br>
    DocMan System</p>
</body>
</html>
        `;

        await sendEmail(assignee.email, subject, text, html);
    } catch (error) {
        console.error("Error sending review assignment email:", error);
        throw error;
    }
}

/**
 * Create update assignment for author when updates are required
 * @param {Object} reviewAssignment - Review assignment object
 * @returns {Promise<Object>} Update assignment object
 */
async function createUpdateAssignment(reviewAssignment) {
    try {
        // Get the document
        const doc = await Doc.findById(reviewAssignment.document);
        if (!doc) return;

        // Create update assignment for the author
        const updateAssignment = new ReviewAssignment({
            document: reviewAssignment.document,
            assignee: doc.author, // Assign to document author
            assignedBy: reviewAssignment.assignee, // Assigned by the reviewer
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
            notes: `Updates required based on review: ${reviewAssignment.updateNotes || 'See review notes'}`,
            status: 'pending',
            updateAssignment: reviewAssignment._id // Link to the review assignment that required updates
        });

        await updateAssignment.save();

        // Send email notification to author
        try {
            await sendUpdateAssignmentEmail(updateAssignment, doc);
        } catch (emailError) {
            console.error("Error sending update assignment email:", emailError);
        }

        return updateAssignment;
    } catch (error) {
        console.error("Error creating update assignment:", error);
        throw error;
    }
}

/**
 * Send email notification for update assignment
 * @param {Object} assignment - Update assignment object
 * @param {Object} doc - Document object
 * @returns {Promise<void>}
 */
async function sendUpdateAssignmentEmail(assignment, doc) {
    try {
        // Get assignee details (author)
        const assignee = await User.findById(assignment.assignee);
        if (!assignee) return;

        // Get assigned by details (reviewer)
        const assignedBy = await User.findById(assignment.assignedBy);
        if (!assignedBy) return;

        const subject = `Document Update Required: ${doc.title}`;

        const text = `
Hello ${assignee.firstname},

Based on a recent review, updates have been requested for the document "${doc.title}".

Review details:
- Reviewer: ${assignedBy.firstname} ${assignedBy.lastname}
- Notes: ${assignment.notes}

Please make the necessary updates to this document.

Best regards,
DocMan System
        `;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Document Update Required</title>
</head>
<body>
    <h2>Hello ${assignee.firstname},</h2>
    
    <p>Based on a recent review, updates have been requested for the document <strong>"${doc.title}"</strong>.</p>
    
    <h3>Review details:</h3>
    <ul>
        <li><strong>Reviewer:</strong> ${assignedBy.firstname} ${assignedBy.lastname}</li>
        <li><strong>Notes:</strong> ${assignment.notes}</li>
    </ul>
    
    <p>Please make the necessary updates to this document.</p>
    
    <p>Best regards,<br>
    DocMan System</p>
</body>
</html>
        `;

        await sendEmail(assignee.email, subject, text, html);
    } catch (error) {
        console.error("Error sending update assignment email:", error);
        throw error;
    }
}

/**
 * Clean up duplicate review assignments for a document, keeping only the latest for each assignee
 * @param {string} documentId - Document ID
 */
export async function cleanupDuplicateReviewAssignments(documentId) {
    try {
        // Get all assignments for the document, sorted by creation date (newest first)
        const allAssignments = await ReviewAssignment.find({ document: documentId })
            .sort({ createdAt: -1 });

        // Group assignments by assignee
        const assignmentsByAssignee = new Map();
        const assignmentsToDelete = []; // Initialize early to handle null assignees
        
        for (const assignment of allAssignments) {
            // Skip assignments with null or undefined assignees
            if (!assignment.assignee) {
                console.warn(`Found assignment ${assignment._id} with null assignee, will be cleaned up`);
                // Add to deletion list since it's invalid
                assignmentsToDelete.push(assignment._id);
                continue;
            }
            
            const assigneeId = assignment.assignee.toString();
            if (!assignmentsByAssignee.has(assigneeId)) {
                assignmentsByAssignee.set(assigneeId, []);
            }
            assignmentsByAssignee.get(assigneeId).push(assignment);
        }

        // For each assignee, keep the latest assignment and delete the rest
        
        for (const [assigneeId, assignments] of assignmentsByAssignee) {
            if (assignments.length > 1) {
                // Keep the first one (latest due to sorting) and mark the rest for deletion
                const [latest, ...duplicates] = assignments;
                assignmentsToDelete.push(...duplicates.map(a => a._id));
            }
        }

        // Delete duplicate assignments
        if (assignmentsToDelete.length > 0) {
            await ReviewAssignment.deleteMany({ _id: { $in: assignmentsToDelete } });
            console.log(`Cleaned up ${assignmentsToDelete.length} duplicate review assignments for document ${documentId}`);
        }

        return assignmentsToDelete.length;
    } catch (error) {
        console.error("Error cleaning up duplicate review assignments:", error);
        throw error;
    }
}

/**
 * Clean up orphaned review assignments (assignments with null assignees)
 * @param {string} documentId - Document ID (optional, if not provided cleans all)
 */
export async function cleanupOrphanedReviewAssignments(documentId = null) {
    try {
        const query = { assignee: null };
        if (documentId) {
            query.document = documentId;
        }

        const orphanedAssignments = await ReviewAssignment.find(query);
        
        if (orphanedAssignments.length > 0) {
            await ReviewAssignment.deleteMany(query);
            console.log(`Cleaned up ${orphanedAssignments.length} orphaned review assignments${documentId ? ` for document ${documentId}` : ''}`);
        }

        return orphanedAssignments.length;
    } catch (error) {
        console.error("Error cleaning up orphaned review assignments:", error);
        throw error;
    }
}

/**
 * API endpoint to clean up duplicate review assignments for a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with cleanup results
 */
export async function cleanupDocumentReviewAssignments(req, res) {
    try {
        const { documentId } = req.params;

        // Verify document exists
        const doc = await Doc.findById(documentId);
        if (!doc) {
            return res.status(404).json({ message: "Document not found." });
        }

        const deletedDuplicates = await cleanupDuplicateReviewAssignments(documentId);
        const deletedOrphaned = await cleanupOrphanedReviewAssignments(documentId);

        res.status(200).json({
            message: "Review assignments cleaned up successfully",
            deletedDuplicates,
            deletedOrphaned,
            totalDeleted: deletedDuplicates + deletedOrphaned
        });
    } catch (error) {
        console.error("Error cleaning up review assignments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Mark all review assignments for a document as completed (for manual override)
 * @param {string} documentId - Document ID
 * @param {string} completedBy - User ID who is marking as completed
 */
export async function markAllReviewAssignmentsCompleted(documentId, completedBy) {
    try {
        // Clean up duplicates first
        await cleanupOrphanedReviewAssignments(documentId);
        await cleanupDuplicateReviewAssignments(documentId);

        // Get all current assignments for the document
        const allAssignments = await ReviewAssignment.find({ document: documentId })
            .sort({ createdAt: -1 });

        // Filter to get only the latest assignment for each unique assignee
        const latestAssignments = [];
        const seenAssignees = new Set();

        for (const assignment of allAssignments) {
            if (!assignment.assignee) continue;
            
            const assigneeId = assignment.assignee.toString();
            if (!seenAssignees.has(assigneeId)) {
                seenAssignees.add(assigneeId);
                latestAssignments.push(assignment);
            }
        }

        // Mark all latest assignments as completed
        const now = new Date();
        for (const assignment of latestAssignments) {
            assignment.status = 'completed';
            assignment.completedDate = now;
            assignment.completedBy = completedBy;
            await assignment.save();
        }

        console.log(`Marked ${latestAssignments.length} review assignments as completed for document ${documentId}`);
        return latestAssignments.length;
    } catch (error) {
        console.error("Error marking all review assignments as completed:", error);
        throw error;
    }
}

/**
 * Reset review assignments for a new review cycle
 * @param {string} documentId - Document ID
 */
export async function resetReviewAssignmentsForNewCycle(documentId) {
    try {
        // Reset all existing review assignments for this document to pending
        await ReviewAssignment.updateMany(
            { document: documentId },
            { 
                status: 'pending',
                completedDate: null,
                requiresUpdates: false,
                updateNotes: null
            }
        );
        
        console.log(`Reset review assignments for document ${documentId} for new review cycle`);
    } catch (error) {
        console.error("Error resetting review assignments:", error);
        throw error;
    }
}

/**
 * Check if all reviews for a document are completed and update document status
 * @param {string} documentId - Document ID
 */
async function checkAndUpdateDocumentReviewStatus(documentId) {
    try {
        console.log(`🔍 Checking review status for document: ${documentId}`);
        
        // Get the document first to access reviewAssignees
        const doc = await Doc.findById(documentId).populate('reviewAssignees', 'firstname lastname email');
        if (!doc) {
            console.error(`❌ Document ${documentId} not found`);
            return;
        }

        // Get all review assignments for this document, sorted by creation date (newest first)
        const allAssignments = await ReviewAssignment.find({ document: documentId })
            .populate('assignee', 'firstname lastname email')
            .sort({ createdAt: -1 });

        console.log(`📋 Found ${allAssignments.length} total assignments`);

        // Get the document's current reviewAssignees for comparison
        const docReviewAssignees = (doc.reviewAssignees || []).map(assignee => 
            assignee._id ? assignee._id.toString() : assignee.toString()
        );
        console.log(`📄 Current document reviewAssignees IDs: ${docReviewAssignees.join(', ')}`);

        // Filter to get only the latest assignment for each unique assignee
        // BUT only include assignments for users who are actually in the document's reviewAssignees
        const latestAssignments = [];
        const seenAssignees = new Set();

        for (const assignment of allAssignments) {
            // Skip assignments with null or undefined assignees
            if (!assignment.assignee) {
                console.warn(`⚠️ Skipping assignment ${assignment._id} with null assignee in status check`);
                continue;
            }
            
            const assigneeId = assignment.assignee._id ? assignment.assignee._id.toString() : assignment.assignee.toString();
            
            // Check if this assignee is actually in the document's reviewAssignees
            if (!docReviewAssignees.includes(assigneeId)) {
                const userName = assignment.assignee ? `${assignment.assignee.firstname} ${assignment.assignee.lastname} (${assignment.assignee.email})` : 'Unknown User';
                console.warn(`⚠️ Skipping orphaned assignment ${assignment._id} for ${assigneeId} (${userName}) - not in document's reviewAssignees`);
                continue;
            }
            
            if (!seenAssignees.has(assigneeId)) {
                seenAssignees.add(assigneeId);
                latestAssignments.push(assignment);
                const userName = assignment.assignee ? `${assignment.assignee.firstname} ${assignment.assignee.lastname} (${assignment.assignee.email})` : 'Unknown User';
                console.log(`✅ Added latest assignment for ${assigneeId} (${userName}): status = ${assignment.status}, assignmentId = ${assignment._id}`);
            }
        }
        
        console.log(`📊 Latest assignments count: ${latestAssignments.length}`);
        console.log(`📊 Assignment statuses: ${latestAssignments.map(a => {
            const id = a.assignee._id ? a.assignee._id.toString() : a.assignee.toString();
            const name = a.assignee.firstname ? `${a.assignee.firstname} ${a.assignee.lastname}` : 'Unknown';
            return `${name}(${id}):${a.status}`;
        }).join(', ')}`);
        
        // Check if all latest assignments are completed
        const allCompleted = latestAssignments.length > 0 && latestAssignments.every(assignment => assignment.status === 'completed');
        
        console.log(`✨ All assignments completed: ${allCompleted}`);
        console.log(`📄 Current document reviewCompleted status: ${doc.reviewCompleted}`);
        console.log(`📄 Document reviewAssignees: ${JSON.stringify(doc.reviewAssignees || [])}`);
        
        // Show detailed comparison
        console.log(`🔍 COMPARISON:`);
        console.log(`   Document reviewAssignees count: ${(doc.reviewAssignees || []).length}`);
        console.log(`   ReviewAssignment records count: ${allAssignments.length}`);
        console.log(`   Latest assignments count: ${latestAssignments.length}`);
        
        if (allCompleted) {
            const now = new Date();
            let nextOpensForReview = null;
            
            // Calculate next "Opens For Review" date based on reviewCompletedAt + interval
            switch (doc.reviewInterval) {
                case 'monthly':
                    nextOpensForReview = new Date(now);
                    nextOpensForReview.setMonth(nextOpensForReview.getMonth() + 1);
                    break;
                case 'quarterly':
                    nextOpensForReview = new Date(now);
                    nextOpensForReview.setMonth(nextOpensForReview.getMonth() + 3);
                    break;
                case 'semiannually':
                    nextOpensForReview = new Date(now);
                    nextOpensForReview.setMonth(nextOpensForReview.getMonth() + 6);
                    break;
                case 'annually':
                    nextOpensForReview = new Date(now);
                    nextOpensForReview.setFullYear(nextOpensForReview.getFullYear() + 1);
                    break;
                case 'custom':
                    if (doc.reviewIntervalDays) {
                        nextOpensForReview = new Date(now);
                        nextOpensForReview.setDate(nextOpensForReview.getDate() + doc.reviewIntervalDays);
                    }
                    break;
            }
            
            // Calculate next review due date (opensForReview + review period)
            let nextReviewDueDate = null;
            if (nextOpensForReview && doc.reviewPeriod) {
                nextReviewDueDate = new Date(nextOpensForReview);
                switch (doc.reviewPeriod) {
                    case '1week':
                        nextReviewDueDate.setDate(nextReviewDueDate.getDate() + 7);
                        break;
                    case '2weeks':
                        nextReviewDueDate.setDate(nextReviewDueDate.getDate() + 14);
                        break;
                    case '3weeks':
                        nextReviewDueDate.setDate(nextReviewDueDate.getDate() + 21);
                        break;
                    case '1month':
                        nextReviewDueDate.setMonth(nextReviewDueDate.getMonth() + 1);
                        break;
                }
            }
            
            // Update document with completion info
            console.log(`🎉 Setting reviewCompleted to true for document ${documentId}`);
            console.log(`📅 Next opensForReview: ${nextOpensForReview?.toDateString()}`);
            console.log(`📅 Next reviewDueDate: ${nextReviewDueDate?.toDateString()}`);
            
            await Doc.findByIdAndUpdate(documentId, {
                lastReviewedOn: now,
                nextReviewDueOn: nextReviewDueDate,    // Due date for NEXT review cycle
                opensForReview: nextOpensForReview,    // When NEXT review opens
                reviewDueDate: null,                   // Clear current review due date (completed)
                reviewCompleted: true,
                reviewCompletedAt: now
            });
            
            console.log(`✅ Document ${documentId} review completed. Next opens for review: ${nextOpensForReview?.toDateString()}, Next due: ${nextReviewDueDate?.toDateString()}`);
        } else {
            // If not all reviews are completed, ensure reviewCompleted is false
            console.log(`⏳ Not all reviews completed. Current status: ${doc.reviewCompleted}`);
            if (doc.reviewCompleted === true) {
                console.log(`🔄 Setting reviewCompleted to false for document ${documentId}`);
                await Doc.findByIdAndUpdate(documentId, {
                    reviewCompleted: false,
                    reviewCompletedAt: null
                });
                
                console.log(`❌ Document ${documentId} review status reset to incomplete`);
            }
        }
    } catch (error) {
        console.error("Error checking document review status:", error);
    }
}