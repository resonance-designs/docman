/*
 * @name analyticsRoutes
 * @file /docman/backend/src/routes/analyticsRoutes.js
 * @routes analyticsRoutes
 * @description Analytics routes for generating reports, metrics, and data visualizations
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { getAnalyticsData, getAnalyticsExport } from "../controllers/analyticsController.js";
import { cacheAnalytics, setCacheHeaders } from "../middleware/cacheMiddleware.js";

/**
 * Express router for analytics and reporting endpoints
 * Handles system metrics, document statistics, and data export functionality
 * All routes require authentication with role-based access control
 * @type {express.Router}
 */
const router = express.Router();

// GET /api/analytics - Get analytics data and system metrics (all authenticated users can view analytics)
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), cacheAnalytics(), setCacheHeaders(600), getAnalyticsData);

// GET /api/analytics/export - Export analytics data in various formats (all authenticated users can export)
router.get("/export", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAnalyticsExport);

export default router;
