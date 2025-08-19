/*
 * @name teamsRoutes
 * @file /docman/backend/src/routes/teamsRoutes.js
 * @routes teamsRoutes
 * @description Team management routes for team operations, member management, and collaboration
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
    getUserTeams,
    getAllTeams,
    getTeamById,
    createTeam,
    updateTeam,
    deleteTeam,
    inviteToTeam,
    addMemberToTeam,
    acceptInvitation,
    removeMember,
    updateMemberRole,
    getTeamProjects,
    getAvailableProjects,
    addProjectsToTeam,
    removeProjectsFromTeam,
    getTeamBooks,
    getAvailableBooks,
    addBooksToTeam,
    removeBooksFromTeam,
    getTeamDocuments,
    getAvailableDocuments,
    addDocumentsToTeam,
    removeDocumentsFromTeam
} from "../controllers/teamsController.js";

/**
 * Express router for team management endpoints
 * Handles team CRUD operations, member management, and invitation workflows
 * All routes require authentication with role-based access control
 * @type {express.Router}
 */
const router = express.Router();

// Get user's teams (editors and admins can create teams)
router.get("/my-teams", verifyAccessToken, requireRole("editor", "admin"), getUserTeams);

// Get all teams (editors and admins can see all teams)
router.get("/", verifyAccessToken, requireRole("editor", "admin"), getAllTeams);

// Get specific team
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getTeamById);

// Create team (editors and admins only)
router.post("/", verifyAccessToken, requireRole("editor", "admin"), createTeam);

// Update team
router.put("/:id", verifyAccessToken, requireRole("editor", "admin"), updateTeam);

// Delete team
router.delete("/:id", verifyAccessToken, requireRole("editor", "admin"), deleteTeam);

// Team member management
router.post("/:id/invite", verifyAccessToken, requireRole("editor", "admin"), inviteToTeam);
router.post("/:id/members", verifyAccessToken, requireRole("editor", "admin"), addMemberToTeam);
router.post("/accept/:token", verifyAccessToken, requireRole("viewer", "editor", "admin"), acceptInvitation);
router.delete("/:id/members/:userId", verifyAccessToken, requireRole("viewer", "editor", "admin"), removeMember);
router.put("/:id/members/:userId/role", verifyAccessToken, requireRole("editor", "admin"), updateMemberRole);

// Team project management
router.get("/:id/projects", verifyAccessToken, requireRole("viewer", "editor", "admin"), getTeamProjects);
router.get("/:id/available-projects", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAvailableProjects);
router.post("/:id/projects", verifyAccessToken, requireRole("editor", "admin"), addProjectsToTeam);
router.delete("/:id/projects", verifyAccessToken, requireRole("editor", "admin"), removeProjectsFromTeam);

// Team book management
router.get("/:id/books", verifyAccessToken, requireRole("viewer", "editor", "admin"), getTeamBooks);
router.get("/:id/available-books", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAvailableBooks);
router.post("/:id/books", verifyAccessToken, requireRole("editor", "admin"), addBooksToTeam);
router.delete("/:id/books", verifyAccessToken, requireRole("editor", "admin"), removeBooksFromTeam);

// Team document management
router.get("/:id/documents", verifyAccessToken, requireRole("viewer", "editor", "admin"), getTeamDocuments);
router.get("/:id/available-documents", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAvailableDocuments);
router.post("/:id/documents", verifyAccessToken, requireRole("editor", "admin"), addDocumentsToTeam);
router.delete("/:id/documents", verifyAccessToken, requireRole("editor", "admin"), removeDocumentsFromTeam);

export default router;
