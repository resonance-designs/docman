import { getAccount, saveProfile, changePassword } from '../controllers/accountController.js';
import { resendInvitation } from '../controllers/invitationController.js';
import { limitPasswordReset } from '../middleware/authRateLimiter.js';
/*
 * @name usersRoutes
 * @file /docman/backend/src/routes/usersRoutes.js
 * @routes usersRoutes
 * @description User management routes for CRUD operations, profile updates, and administrative functions
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import express from "express";
import { listAccounts, createAccount, editAccount } from "../controllers/userAdminController.js";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import uploadMid from "../middleware/uploadMid.js";
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getUsersMissingAuthentikLink,
    linkUserToAuthentikIdentity,
} from "../controllers/usersController.js";
import { uploadProfilePicture, deleteProfilePicture, uploadBackgroundImage, deleteBackgroundImage } from "../controllers/profilePictureController.js";

/**
 * Express router for user management endpoints
 * Handles user CRUD operations, profile pictures, and background images
 * All routes require authentication and appropriate role permissions
 * @type {express.Router}
 */
const router = express.Router();
router.get('/me/account', verifyAccessToken, getAccount);
router.patch('/me/account', verifyAccessToken, saveProfile);
router.post('/me/password', verifyAccessToken, limitPasswordReset, changePassword);

// Account administration is separate from the user picker/profile API.
router.post('/manage/:id/invitation', verifyAccessToken, requireRole('superadmin'), limitPasswordReset, resendInvitation);
router.get('/manage', verifyAccessToken, requireRole('superadmin'), listAccounts);
router.post('/manage', verifyAccessToken, requireRole('superadmin'), createAccount);
router.patch('/manage/:id', verifyAccessToken, requireRole('superadmin'), editAccount);

// GET /api/users - Get all users (viewers and above can view users)
router.get("/", verifyAccessToken, requireRole("viewer"), getAllUsers);

// GET /api/users/authentik/unlinked - Get users missing Authentik links (admin and superadmin only)
router.get("/authentik/unlinked", verifyAccessToken, requireRole("admin", "superadmin"), getUsersMissingAuthentikLink);

// POST /api/users/authentik/link - Link a local user to an Authentik subject (superadmin only)
router.post("/authentik/link", verifyAccessToken, requireRole("superadmin"), linkUserToAuthentikIdentity);

// GET /api/users/:id - Get specific user by ID (for profile editing)
router.get("/:id", verifyAccessToken, requireRole("viewer"), getUserById);

// PUT /api/users/:id - Update user information (users can update themselves, admins can update anyone)
router.put("/:id", verifyAccessToken, requireRole("viewer"), updateUser);

// POST /api/users/:id/profile-picture - Upload profile picture (users can upload their own, admins can upload for anyone)
router.post("/:id/profile-picture", verifyAccessToken, requireRole("viewer"), uploadMid.single("profilePicture"), uploadProfilePicture);

// DELETE /api/users/:id/profile-picture - Delete profile picture (users can delete their own, admins can delete for anyone)
router.delete("/:id/profile-picture", verifyAccessToken, requireRole("viewer"), deleteProfilePicture);

// POST /api/users/:id/background-image - Upload background image (users can upload their own, admins can upload for anyone)
router.post("/:id/background-image", verifyAccessToken, requireRole("viewer"), uploadMid.single("backgroundImage"), uploadBackgroundImage);

// DELETE /api/users/:id/background-image - Delete background image (users can delete their own, admins can delete for anyone)
router.delete("/:id/background-image", verifyAccessToken, requireRole("viewer"), deleteBackgroundImage);

// DELETE /api/users/:id - Delete a user (only super admins can delete users)
router.delete("/:id", verifyAccessToken, requireRole("superadmin"), deleteUser);

export default router;
