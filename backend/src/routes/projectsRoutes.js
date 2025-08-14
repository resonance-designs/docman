/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
// backend/src/routes/projectsRoutes.js
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
    getTeamProjects,
    getUserProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    addCollaborator,
    removeCollaborator,
    addDocument,
    removeDocument
} from "../controllers/projectsController.js";

const router = express.Router();

// Get user's projects across all teams
router.get("/my-projects", verifyAccessToken, requireRole("viewer", "editor", "admin"), getUserProjects);

// Get projects for a specific team
router.get("/team/:teamId", verifyAccessToken, requireRole("viewer", "editor", "admin"), getTeamProjects);

// Get specific project
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getProjectById);

// Create project (editors and admins only)
router.post("/", verifyAccessToken, requireRole("editor", "admin"), createProject);

// Update project
router.put("/:id", verifyAccessToken, requireRole("editor", "admin"), updateProject);

// Delete project
router.delete("/:id", verifyAccessToken, requireRole("editor", "admin"), deleteProject);

// Project collaborator management
router.post("/:id/collaborators", verifyAccessToken, requireRole("editor", "admin"), addCollaborator);
router.delete("/:id/collaborators/:userId", verifyAccessToken, requireRole("viewer", "editor", "admin"), removeCollaborator);

// Project document management
router.post("/:id/documents", verifyAccessToken, requireRole("viewer", "editor", "admin"), addDocument);
router.delete("/:id/documents/:documentId", verifyAccessToken, requireRole("editor", "admin"), removeDocument);

export default router;
