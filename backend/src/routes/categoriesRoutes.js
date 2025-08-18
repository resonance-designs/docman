/*
 * @name categoriesRoutes
 * @file /docman/backend/src/routes/categoriesRoutes.js
 * @routes categoriesRoutes
 * @description Category management routes for organizing and managing document categories
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { getAllCategories, createCategory, updateCategory, deleteCategory } from "../controllers/categoriesController.js";

/**
 * Express router for document category management endpoints
 * Handles category CRUD operations for document classification
 * All routes require authentication with role-based access control
 * @type {express.Router}
 */
const router = express.Router();

// GET /api/categories - Get all document categories (all authenticated users can view categories)
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllCategories);

// POST /api/categories - Create a new document category (only admins can create categories)
router.post("/", verifyAccessToken, requireRole("admin"), createCategory);

// PUT /api/categories/:id - Update a document category (only admins can update categories)
router.put("/:id", verifyAccessToken, requireRole("admin"), updateCategory);

// DELETE /api/categories/:id - Delete a document category (only admins can delete categories)
router.delete("/:id", verifyAccessToken, requireRole("admin"), deleteCategory);

export default router;