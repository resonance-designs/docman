// backend/src/routes/categoriesRoutes.js
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { getAllCategories, createCategory, deleteCategory } from "../controllers/categoriesController.js";

const router = express.Router();

// Everyone can view categories
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllCategories);

// Only admins can create categories
router.post("/", verifyAccessToken, requireRole("admin"), createCategory);

// Only admins can delete categories
router.delete("/:id", verifyAccessToken, requireRole("admin"), deleteCategory);

export default router;