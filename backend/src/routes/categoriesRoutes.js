// backend/src/routes/categoriesRoutes.js
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { getAllCategories, createCategory } from "../controllers/categoriesController.js";

const router = express.Router();

// Everyone can view categories
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllCategories);

// Only admins can create categories
router.post("/", verifyAccessToken, requireRole("admin"), createCategory);

export default router;