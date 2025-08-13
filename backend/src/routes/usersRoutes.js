import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import uploadMid from "../middleware/uploadMid.js";
import { getAllUsers, getUserById, updateUser, deleteUser } from "../controllers/usersController.js";
import { uploadProfilePicture, deleteProfilePicture, uploadBackgroundImage, deleteBackgroundImage } from "../controllers/profilePictureController.js";

const router = express.Router();

// Everyone can view users
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllUsers);

// Get specific user (for profile editing)
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getUserById);

// Update user (users can update themselves, admins can update anyone)
router.put("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), updateUser);

// Profile picture upload (users can upload their own, admins can upload for anyone)
router.post("/:id/profile-picture", verifyAccessToken, requireRole("viewer", "editor", "admin"), uploadMid.single("profilePicture"), uploadProfilePicture);

// Profile picture delete (users can delete their own, admins can delete for anyone)
router.delete("/:id/profile-picture", verifyAccessToken, requireRole("viewer", "editor", "admin"), deleteProfilePicture);

// Background image upload (users can upload their own, admins can upload for anyone)
router.post("/:id/background-image", verifyAccessToken, requireRole("viewer", "editor", "admin"), uploadMid.single("backgroundImage"), uploadBackgroundImage);

// Background image delete (users can delete their own, admins can delete for anyone)
router.delete("/:id/background-image", verifyAccessToken, requireRole("viewer", "editor", "admin"), deleteBackgroundImage);

// Only admins can delete users
router.delete("/:id", verifyAccessToken, requireRole("admin"), deleteUser);

export default router;
