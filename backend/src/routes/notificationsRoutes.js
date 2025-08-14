// backend/src/routes/notificationsRoutes.js
import { Router } from "express";
import { 
    getUserNotifications,
    getUnreadNotificationsCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from "../controllers/notificationsController.js";
import authMiddleware from "../middleware/authMid.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all notifications for the current user
router.get("/", getUserNotifications);

// Get unread notifications count for the current user
router.get("/unread-count", getUnreadNotificationsCount);

// Mark notification as read
router.patch("/:id/read", markAsRead);

// Mark all notifications as read
router.patch("/read-all", markAllAsRead);

// Delete notification
router.delete("/:id", deleteNotification);

export default router;