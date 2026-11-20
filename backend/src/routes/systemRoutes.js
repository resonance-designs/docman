import { readPublicSharingPolicy, savePublicSharingPolicy } from '../controllers/publicSharingSettingsController.js';
import { readNotificationSettings, saveNotificationSettings, retryNotifications } from '../controllers/notificationSettingsController.js';
import { readPolicy, savePolicy } from '../controllers/accountPolicyController.js';
/*
 * @name systemRoutes
 * @file /docman/backend/src/routes/systemRoutes.js
 * @routes systemRoutes
 * @description System information routes for health checks, status monitoring, and diagnostics
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import { getStorageSettingsHandler, updateStorageSettingsHandler } from '../controllers/storageSettingsController.js';
import express from "express";
import { getEmailSettings, updateEmailSettings, testEmailSettings } from "../controllers/emailSettingsController.js";
import { verifyAccessToken } from "../lib/secretToken.js";
import { record, AUDIT_ACTIONS } from "../services/auditService.js";
import { requireRole } from "../middleware/requireRole.js";
import { 
    getSystemInfo, 
    getPerformanceMetrics,
    clearCollection,
    restoreCollection,
    archiveFiles,
    restoreFiles,
    generateDummyData,
    getRedisSettings,
    updateRedisSettings
} from "../controllers/systemController.js";

/**
 * Express router for system administration endpoints
 * Handles system information, health checks, and administrative operations
 * All routes require admin authentication
 * @type {express.Router}
 */
const router = express.Router();
router.get('/public-sharing', verifyAccessToken, requireRole('superadmin'), readPublicSharingPolicy);
router.put('/public-sharing', verifyAccessToken, requireRole('superadmin'), savePublicSharingPolicy);
router.get('/notifications', verifyAccessToken, requireRole('superadmin'), readNotificationSettings);
router.put('/notifications', verifyAccessToken, requireRole('superadmin'), saveNotificationSettings);
router.post('/notifications/retry', verifyAccessToken, requireRole('superadmin'), retryNotifications);
router.get('/accounts', verifyAccessToken, requireRole('superadmin'), readPolicy);
router.put('/accounts', verifyAccessToken, requireRole('superadmin'), savePolicy);
// Document storage: encryption at rest + maximum upload size. Everyone signed in can read (upload forms show the limit).
router.get('/storage', verifyAccessToken, requireRole('viewer', 'editor', 'admin', 'superadmin'), getStorageSettingsHandler);
router.put('/storage', verifyAccessToken, requireRole('superadmin'), updateStorageSettingsHandler);
router.get('/email', verifyAccessToken, requireRole('superadmin'), getEmailSettings);
router.put('/email', verifyAccessToken, requireRole('superadmin'), updateEmailSettings);
router.post('/email/test', verifyAccessToken, requireRole('superadmin'), testEmailSettings);

// GET /api/system/info - Get system information and health status (admins and super admins can view system info)
/**
 * Destructive maintenance tools (clear/restore collections, archive files, dummy data) permanently change
 * records. They are disabled unless ALLOW_DESTRUCTIVE_ADMIN_TOOLS=true, and every use is audited.
 */
async function guardDestructiveTool(req, res, next) {
    const enabled = String(process.env.ALLOW_DESTRUCTIVE_ADMIN_TOOLS || "").toLowerCase() === "true";
    await record(req, {
        action: AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE,
        outcome: enabled ? "success" : "denied",
        resourceType: "maintenance",
        resourceId: req.path,
        summary: `${enabled ? "Ran" : "Blocked"} destructive maintenance tool ${req.method} ${req.originalUrl.split("?")[0]}`,
    });
    if (!enabled) {
        return res.status(403).json({ message: "Destructive maintenance tools are disabled on this server (ALLOW_DESTRUCTIVE_ADMIN_TOOLS)." });
    }
    return next();
}

// Rate-limit store (Upstash / self-hosted Redis / memory)
router.get("/redis", verifyAccessToken, requireRole("admin", "superadmin"), getRedisSettings);
router.put("/redis", verifyAccessToken, requireRole("superadmin"), updateRedisSettings);

router.get("/info", verifyAccessToken, requireRole("admin", "superadmin"), getSystemInfo);

// GET /api/system/performance - Get performance metrics (admin and super admin only)
router.get("/performance", verifyAccessToken, requireRole("admin", "superadmin"), getPerformanceMetrics);

// POST /api/system/clear/:collection - Clear a collection and archive its documents (super admin only)
router.post("/clear/:collection", verifyAccessToken, requireRole("superadmin"), guardDestructiveTool, clearCollection);

// POST /api/system/restore/:collection - Restore a collection from its archive (super admin only)
router.post("/restore/:collection", verifyAccessToken, requireRole("superadmin"), guardDestructiveTool, restoreCollection);

// POST /api/system/archive-files - Archive files from uploads directory (super admin only)
router.post("/archive-files", verifyAccessToken, requireRole("superadmin"), guardDestructiveTool, archiveFiles);

// POST /api/system/restore-files - Restore files from archive directory (super admin only)
router.post("/restore-files", verifyAccessToken, requireRole("superadmin"), guardDestructiveTool, restoreFiles);

// POST /api/system/generate-dummy-data - Generate dummy data for testing (super admin only)
router.post("/generate-dummy-data", verifyAccessToken, requireRole("superadmin"), guardDestructiveTool, generateDummyData);

export default router;
