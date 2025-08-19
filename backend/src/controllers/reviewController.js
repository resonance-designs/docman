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

        const assignments = await ReviewAssignment.find({ document: documentId })
            .populate('assignee', 'firstname lastname email')
            .populate('assignedBy', 'firstname lastname email')
            .sort({ dueDate: 1 });

        res.status(200).json(assignments);
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