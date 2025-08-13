import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { getAnalyticsData, getAnalyticsExport } from "../controllers/analyticsController.js";

const router = express.Router();

// Get analytics data (all authenticated users)
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAnalyticsData);

// Export analytics data (all authenticated users)
router.get("/export", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAnalyticsExport);

export default router;
