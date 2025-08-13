import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
    getAllCustomCharts,
    getCustomChartById,
    createCustomChart,
    updateCustomChart,
    deleteCustomChart,
    getChartData
} from "../controllers/customChartsController.js";

const router = express.Router();

// Get all custom charts (authenticated users)
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllCustomCharts);

// Get a specific custom chart by ID (authenticated users)
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getCustomChartById);

// Get chart data for rendering (authenticated users)
router.get("/:id/data", verifyAccessToken, requireRole("viewer", "editor", "admin"), getChartData);

// Create a new custom chart (editors and admins)
router.post("/", verifyAccessToken, requireRole("editor", "admin"), createCustomChart);

// Update a custom chart (editors and admins)
router.put("/:id", verifyAccessToken, requireRole("editor", "admin"), updateCustomChart);

// Delete a custom chart (editors and admins)
router.delete("/:id", verifyAccessToken, requireRole("editor", "admin"), deleteCustomChart);

export default router;