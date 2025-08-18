/*
 * @name docsRoutes
 * @file /docman/backend/src/routes/docsRoutes.js
 * @routes docsRoutes
 * @description Document management routes for CRUD operations, file uploads, version control, and review workflows
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import uploadMid from "../middleware/uploadMid.js";
import { cacheUserData, setCacheHeaders } from "../middleware/cacheMiddleware.js";
import {
    getAllDocs,
    getDocById,
    createDoc,
    updateDoc,
    deleteDoc,
    getDocFiles,
    markDocAsReviewed,
    getDocVersion,
    getVersionHistory,
    compareDocVersions,
} from "../controllers/docsController.js";
import { uploadFileVersion } from "../controllers/uploadFileController.js";

/**
 * Express router for document management endpoints
 * Handles document CRUD operations, file uploads, version control, and review workflows
 * All routes require authentication with role-based access control
 * @type {express.Router}
 */
const router = express.Router();

// GET /api/docs - Get all documents (viewers, editors, and admins can view documents)
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), cacheUserData(), setCacheHeaders(120), getAllDocs);

// GET /api/docs/:id - Get a specific document by ID (viewers, editors, and admins can view documents)
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getDocById);

// GET /api/docs/:id/files - Get all files associated with a document (viewers, editors, and admins can view files)
router.get("/:id/files", verifyAccessToken, requireRole("viewer", "editor", "admin"), getDocFiles);

// GET /api/docs/:id/version/:version - Get a specific version of a document (viewers, editors, and admins can view versions)
router.get("/:id/version/:version", verifyAccessToken, requireRole("viewer", "editor", "admin"), getDocVersion);

// GET /api/docs/:id/history - Get version history for a document (viewers, editors, and admins can view history)
router.get("/:id/history", verifyAccessToken, requireRole("viewer", "editor", "admin"), getVersionHistory);

// GET /api/docs/:id/compare - Compare versions of a document (viewers, editors, and admins can compare versions)
router.get("/:id/compare", verifyAccessToken, requireRole("viewer", "editor", "admin"), compareDocVersions);

// POST /api/docs - Create a new document (only editors and admins can create documents)
router.post("/", verifyAccessToken, requireRole("editor", "admin"), uploadMid.single("file"), createDoc);

// POST /api/docs/:id/upload - Upload a new version of a document file (only editors and admins can upload files)
router.post("/:id/upload", verifyAccessToken, requireRole("editor", "admin"), uploadMid.single("file"), uploadFileVersion);

// PUT /api/docs/:id - Update a document (only editors and admins can update documents)
router.put("/:id", verifyAccessToken, requireRole("editor", "admin"), uploadMid.none(), updateDoc);

// PUT /api/docs/:id/review - Mark a document as reviewed (only editors and admins can mark documents as reviewed)
router.put("/:id/review", verifyAccessToken, requireRole("editor", "admin"), markDocAsReviewed);

// DELETE /api/docs/:id - Delete a document (only admins can delete documents)
router.delete("/:id", verifyAccessToken, requireRole("admin"), deleteDoc);

export default router;
