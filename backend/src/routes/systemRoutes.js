/*
 * @name systemRoutes
 * @file /docman/backend/src/routes/systemRoutes.js
 * @routes systemRoutes
 * @description System information routes for health checks, status monitoring, and diagnostics
 * @author Richard Bakos
 * @version 2.1.3
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { getSystemInfo, getPerformanceMetrics } from "../controllers/systemController.js";

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

export default router;
