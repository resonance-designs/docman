/*
 * @name projectsRoutes
 * @file /docman/backend/src/routes/projectsRoutes.js
 * @routes projectsRoutes
 * @description Project management routes for project operations and team assignments
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
    getAllProjects,
    getTeamProjects,
    getUserProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    addCollaborator,
    removeCollaborator,
    removeDocument,
    getProjectBooks,
    getAvailableProjectBooks,
    addBooksToProject,
    removeBooksFromProject,
    getProjectDocuments,
    getAvailableProjectDocuments,
    addDocumentsToProject,
    removeDocumentsFromProject,
    getProjectCollaborators,
    getAvailableCollaborators
} from "../controllers/projectsController.js";

/**
 * Express router for project management endpoints
 * Handles project CRUD operations, collaborator management, and document organization
 * All routes require authentication with role-based access control
 * @type {express.Router}
 */
const router = express.Router();

// Get all projects (editors and admins can see all projects)
router.get("/", verifyAccessToken, requireRole("editor", "admin"), getAllProjects);

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

// Project collaborator management (enhanced)
router.get("/:id/collaborators", verifyAccessToken, requireRole("viewer", "editor", "admin"), getProjectCollaborators);
router.get("/:id/available-collaborators", verifyAccessToken, requireRole("editor", "admin"), getAvailableCollaborators);

// Project book management
router.get("/:id/books", verifyAccessToken, requireRole("viewer", "editor", "admin"), getProjectBooks);
router.get("/:id/available-books", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAvailableProjectBooks);
router.post("/:id/books", verifyAccessToken, requireRole("editor", "admin"), addBooksToProject);
router.delete("/:id/books", verifyAccessToken, requireRole("editor", "admin"), removeBooksFromProject);

// Project document management (enhanced)
router.get("/:id/documents", verifyAccessToken, requireRole("viewer", "editor", "admin"), getProjectDocuments);
router.get("/:id/available-documents", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAvailableProjectDocuments);
router.post("/:id/documents", verifyAccessToken, requireRole("editor", "admin"), addDocumentsToProject);
router.delete("/:id/documents", verifyAccessToken, requireRole("editor", "admin"), removeDocumentsFromProject);

// Legacy single document management (keep for backward compatibility)
router.delete("/:id/documents/:documentId", verifyAccessToken, requireRole("editor", "admin"), removeDocument);

export default router;
