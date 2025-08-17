/*
 * @name customChartsRoutes
 * @file /docman/backend/src/routes/customChartsRoutes.js
 * @routes customChartsRoutes
 * @description Custom chart routes for creating and managing personalized analytics
 * @author Richard Bakos
 * @version 2.0.2
 * @license UNLICENSED
 */
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

/**
 * Express router for custom chart management endpoints
 * Handles chart CRUD operations and data visualization rendering
 * All routes require authentication with role-based access control
 * @type {express.Router}
 */
const router = express.Router();

// GET /api/custom-charts - Get all custom charts (all authenticated users can view charts)
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllCustomCharts);

// GET /api/custom-charts/:id - Get a specific custom chart by ID (all authenticated users can view)
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getCustomChartById);

// GET /api/custom-charts/:id/data - Get chart data for rendering (all authenticated users can view data)
router.get("/:id/data", verifyAccessToken, requireRole("viewer", "editor", "admin"), getChartData);

// POST /api/custom-charts - Create a new custom chart (only editors and admins can create charts)
router.post("/", verifyAccessToken, requireRole("editor", "admin"), createCustomChart);

// PUT /api/custom-charts/:id - Update a custom chart (only editors and admins can update charts)
router.put("/:id", verifyAccessToken, requireRole("editor", "admin"), updateCustomChart);

// DELETE /api/custom-charts/:id - Delete a custom chart (only editors and admins can delete charts)
router.delete("/:id", verifyAccessToken, requireRole("editor", "admin"), deleteCustomChart);

export default router;