/*
 * @name systemRoutes
 * @file /docman/backend/src/routes/systemRoutes.js
 * @routes systemRoutes
 * @description System information routes for health checks, status monitoring, and diagnostics
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { 
    getSystemInfo, 
    getPerformanceMetrics,
    clearCollection,
    restoreCollection,
    archiveFiles,
    restoreFiles,
    generateDummyData
} from "../controllers/systemController.js";

/**
 * Express router for system administration endpoints
 * Handles system information, health checks, and administrative operations
 * All routes require admin authentication
 * @type {express.Router}
 */
const router = express.Router();

// GET /api/system/info - Get system information and health status (admins and super admins can view system info)
router.get("/info", verifyAccessToken, requireRole("admin", "superadmin"), getSystemInfo);

// GET /api/system/performance - Get performance metrics (admin and super admin only)
router.get("/performance", verifyAccessToken, requireRole("admin", "superadmin"), getPerformanceMetrics);

// POST /api/system/clear/:collection - Clear a collection and archive its documents (super admin only)
router.post("/clear/:collection", verifyAccessToken, requireRole("superadmin"), clearCollection);

// POST /api/system/restore/:collection - Restore a collection from its archive (super admin only)
router.post("/restore/:collection", verifyAccessToken, requireRole("superadmin"), restoreCollection);

// POST /api/system/archive-files - Archive files from uploads directory (super admin only)
router.post("/archive-files", verifyAccessToken, requireRole("superadmin"), archiveFiles);

// POST /api/system/restore-files - Restore files from archive directory (super admin only)
router.post("/restore-files", verifyAccessToken, requireRole("superadmin"), restoreFiles);

// POST /api/system/generate-dummy-data - Generate dummy data for testing (super admin only)
router.post("/generate-dummy-data", verifyAccessToken, requireRole("superadmin"), generateDummyData);

export default router;
