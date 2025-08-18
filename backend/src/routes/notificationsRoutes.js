/*
 * @name notificationsRoutes
 * @file /docman/backend/src/routes/notificationsRoutes.js
 * @routes notificationsRoutes
 * @description Notification routes for managing user notifications and alerts
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import express from "express";
import {
    getUserNotifications,
    getUnreadNotificationsCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from "../controllers/notificationsController.js";
import { verifyAccessToken } from "../lib/secretToken.js";

/**
 * Express router for user notification management endpoints
 * Handles notification retrieval, read status updates, and deletion
 * All routes require authentication
 * @type {express.Router}
 */
const router = express.Router();

// All routes require authentication
router.use(verifyAccessToken);

// GET /api/notifications - Get all notifications for the current authenticated user
router.get("/", getUserNotifications);

// GET /api/notifications/unread-count - Get count of unread notifications for the current user
router.get("/unread-count", getUnreadNotificationsCount);

// PATCH /api/notifications/:id/read - Mark a specific notification as read
router.patch("/:id/read", markAsRead);

// PATCH /api/notifications/read-all - Mark all notifications as read for the current user
router.patch("/read-all", markAllAsRead);

// DELETE /api/notifications/:id - Delete a specific notification
router.delete("/:id", deleteNotification);

export default router;