/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Team from "../models/Team.js";
import Doc from "../models/Doc.js";

/**
 * Get all notifications for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of notifications or error message
 */
export async function getUserNotifications(req, res) {
    try {
        const userId = req.user._id.toString();
        
        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .populate('sender', 'firstname lastname email')
            .populate('relatedDoc', 'title')
            .populate('relatedTeam', 'name');
        
        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error fetching user notifications:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get unread notifications count for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with unread count or error message
 */
export async function getUnreadNotificationsCount(req, res) {
    try {
        const userId = req.user._id.toString();
        
        const count = await Notification.countDocuments({ 
            recipient: userId, 
            isRead: false 
        });
        
        res.status(200).json({ count });
    } catch (error) {
        console.error("Error fetching unread notifications count:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function markAsRead(req, res) {
    try {
        const notificationId = req.params.id;
        const userId = req.user._id.toString();
        
        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: userId
        });
        
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        
        if (notification.isRead) {
            return res.status(200).json({ message: "Notification already read" });
        }
        
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
        
        res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Mark all notifications as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function markAllAsRead(req, res) {
    try {
        const userId = req.user._id.toString();
        
        await Notification.updateMany(
            { 
                recipient: userId, 
                isRead: false 
            },
            { 
                isRead: true, 
                readAt: new Date() 
            }
        );
        
        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Delete notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function deleteNotification(req, res) {
    try {
        const notificationId = req.params.id;
        const userId = req.user._id.toString();
        
        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId
        });
        
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        
        res.status(200).json({ message: "Notification deleted successfully" });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Create a notification (internal function, not exposed as an API endpoint)
 * @param {Object} notificationData - Notification data object
 * @returns {Object|null} Created notification object or null if error
 */
export async function createNotification(notificationData) {
    try {
        const notification = new Notification(notificationData);
        await notification.save();
        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        return null;
    }
}

/**
 * Send team invitation notification
 * @param {string} recipientId - Recipient user ID
 * @param {string} senderId - Sender user ID
 * @param {string} teamId - Team ID
 * @param {string} invitationToken - Invitation token
 * @returns {Object|null} Created notification object or null if error
 */
export async function sendTeamInvitationNotification(recipientId, senderId, teamId, invitationToken) {
    try {
        const sender = await User.findById(senderId);
        const team = await Team.findById(teamId);
        
        if (!sender || !team) {
            console.error("Invalid sender or team");
            return null;
        }
        
        const notificationData = {
            recipient: recipientId,
            sender: senderId,
            type: 'team_invitation',
            title: 'Team Invitation',
            message: `${sender.firstname} ${sender.lastname} has invited you to join the team "${team.name}"`,
            relatedTeam: teamId,
            invitationToken: invitationToken
        };
        
        return await createNotification(notificationData);
    } catch (error) {
        console.error("Error sending team invitation notification:", error);
        return null;
    }
}

/**
 * Send document assigned notification
 * @param {string} recipientId - Recipient user ID
 * @param {string} senderId - Sender user ID
 * @param {string} docId - Document ID
 * @returns {Object|null} Created notification object or null if error
 */
export async function sendDocumentAssignedNotification(recipientId, senderId, docId) {
    try {
        const sender = await User.findById(senderId);
        const doc = await Doc.findById(docId);
        
        if (!sender || !doc) {
            console.error("Invalid sender or document");
            return null;
        }
        
        const notificationData = {
            recipient: recipientId,
            sender: senderId,
            type: 'document_assigned',
            title: 'Document Assigned',
            message: `${sender.firstname} ${sender.lastname} has assigned you the document "${doc.title}"`,
            relatedDoc: docId
        };
        
        return await createNotification(notificationData);
    } catch (error) {
        console.error("Error sending document assigned notification:", error);
        return null;
    }
}

/**
 * Send document review due notification
 * @param {string} recipientId - Recipient user ID
 * @param {string} docId - Document ID
 * @returns {Object|null} Created notification object or null if error
 */
export async function sendDocumentReviewDueNotification(recipientId, docId) {
    try {
        const doc = await Doc.findById(docId);
        
        if (!doc) {
            console.error("Invalid document");
            return null;
        }
        
        const notificationData = {
            recipient: recipientId,
            type: 'document_review_due',
            title: 'Document Review Due',
            message: `The document "${doc.title}" is due for review`,
            relatedDoc: docId
        };
        
        return await createNotification(notificationData);
    } catch (error) {
        console.error("Error sending document review due notification:", error);
        return null;
    }
}