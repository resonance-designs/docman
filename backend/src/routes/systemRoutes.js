/*
 * @name systemRoutes
 * @file /docman/backend/src/routes/systemRoutes.js
 * @routes systemRoutes
 * @description System information routes for health checks, status monitoring, and diagnostics
 * @author Richard Bakos
 * @version 2.1.7
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

// GET /api/system/info - Get system information and health status (only admins can view system info)
router.get("/info", verifyAccessToken, requireRole("admin"), getSystemInfo);

// GET /api/system/performance - Get performance metrics (admin only)
router.get("/performance", verifyAccessToken, requireRole("admin"), getPerformanceMetrics);

// POST /api/system/clear/:collection - Clear a collection and archive its documents (admin only)
router.post("/clear/:collection", verifyAccessToken, requireRole("admin"), clearCollection);

// POST /api/system/restore/:collection - Restore a collection from its archive (admin only)
router.post("/restore/:collection", verifyAccessToken, requireRole("admin"), restoreCollection);

// POST /api/system/archive-files - Archive files from uploads directory (admin only)
router.post("/archive-files", verifyAccessToken, requireRole("admin"), archiveFiles);

// POST /api/system/restore-files - Restore files from archive directory (admin only)
router.post("/restore-files", verifyAccessToken, requireRole("admin"), restoreFiles);

// POST /api/system/generate-dummy-data - Generate dummy data for testing (admin only)
router.post("/generate-dummy-data", verifyAccessToken, requireRole("admin"), generateDummyData);

export default router;
