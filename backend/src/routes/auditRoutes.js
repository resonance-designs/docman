/*
 * @name auditRoutes
 * @file /docman/backend/src/routes/auditRoutes.js
 * @routes auditRoutes
 * @description Audit log endpoints. Search/export for admins; chain verification for superadmins.
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { listAuditEntries, exportAuditEntries, verifyAuditChain } from "../controllers/auditController.js";

const router = express.Router();

router.get("/", verifyAccessToken, requireRole("admin", "superadmin"), listAuditEntries);
router.get("/export", verifyAccessToken, requireRole("admin", "superadmin"), exportAuditEntries);
router.get("/verify", verifyAccessToken, requireRole("superadmin"), verifyAuditChain);

export default router;
