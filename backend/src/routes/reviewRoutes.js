import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
    createReviewAssignments,
    getDocumentReviewAssignments,
    getUserReviewAssignments,
    updateReviewAssignment,
    getOverdueReviewAssignments
} from "../controllers/reviewController.js";

const router = express.Router();

// Create review assignments for a document (editors and admins)
router.post("/", verifyAccessToken, requireRole("editor", "admin"), createReviewAssignments);

// Get review assignments for a document (authenticated users)
router.get("/document/:documentId", verifyAccessToken, requireRole("viewer", "editor", "admin"), getDocumentReviewAssignments);

// Get review assignments for a user (authenticated users)
router.get("/user/:userId", verifyAccessToken, requireRole("viewer", "editor", "admin"), getUserReviewAssignments);

// Update review assignment status (assignee or admins)
router.put("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), updateReviewAssignment);

// Get overdue review assignments (admins only)
router.get("/overdue", verifyAccessToken, requireRole("admin"), getOverdueReviewAssignments);

export default router;