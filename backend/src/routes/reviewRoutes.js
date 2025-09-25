/*
 * @name reviewRoutes
 * @file /docman/backend/src/routes/reviewRoutes.js
 * @routes reviewRoutes
 * @description Document review routes for managing review workflows and approvals
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
    createReviewAssignments,
    getDocumentReviewAssignments,
    getUserReviewAssignments,
    updateReviewAssignment,
    getOverdueReviewAssignments,
    cleanupDocumentReviewAssignments
} from "../controllers/reviewController.js";

/**
 * Express router for document review assignment endpoints
 * Handles review workflow management, assignment tracking, and status updates
 * All routes require authentication with role-based access control
 * @type {express.Router}
 */
const router = express.Router();

// POST /api/reviews - Create review assignments for a document (only editors, admins, and superadmins can assign reviews)
router.post("/", verifyAccessToken, requireRole("editor", "admin", "superadmin"), createReviewAssignments);

// GET /api/reviews/document/:documentId - Get review assignments for a specific document (all authenticated users can view)
router.get("/document/:documentId", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getDocumentReviewAssignments);

// GET /api/reviews/user/:userId - Get review assignments for a specific user (all authenticated users can view)
router.get("/user/:userId", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getUserReviewAssignments);

// PUT /api/reviews/:id - Update review assignment status (assignee, admins, and superadmins can update)
router.put("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), updateReviewAssignment);

// GET /api/reviews/overdue - Get overdue review assignments (only admins and superadmins can view overdue reviews)
router.get("/overdue", verifyAccessToken, requireRole("admin", "superadmin"), getOverdueReviewAssignments);

// POST /api/reviews/document/:documentId/cleanup - Clean up duplicate review assignments (only admins and superadmins can cleanup)
router.post("/document/:documentId/cleanup", verifyAccessToken, requireRole("admin", "superadmin"), cleanupDocumentReviewAssignments);

export default router;