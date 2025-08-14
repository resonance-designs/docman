/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { getSystemInfo } from "../controllers/systemController.js";

const router = express.Router();

// Only admins can view system information
router.get("/info", verifyAccessToken, requireRole("admin"), getSystemInfo);

export default router;
