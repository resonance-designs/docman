/*
 * @name teamsRoutes
 * @file /docman/backend/src/routes/teamsRoutes.js
 * @routes teamsRoutes
 * @description Team management routes for team operations, member management, and collaboration
 * @author Richard Bakos
 * @version 2.2.0
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

// Get user's teams (editors, admins, and superadmins can create teams)
router.get("/my-teams", verifyAccessToken, requireRole("editor", "admin", "superadmin"), getUserTeams);

// Get all teams (editors, admins, and superadmins can see all teams)
router.get("/", verifyAccessToken, requireRole("editor", "admin", "superadmin"), getAllTeams);

// Get specific team
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getTeamById);

// Create team (editors, admins, and superadmins only)
router.post("/", verifyAccessToken, requireRole("editor", "admin", "superadmin"), createTeam);

// Update team
router.put("/:id", verifyAccessToken, requireRole("editor", "admin", "superadmin"), updateTeam);

// Delete team
router.delete("/:id", verifyAccessToken, requireRole("editor", "admin", "superadmin"), deleteTeam);

// Team member management
router.post("/:id/invite", verifyAccessToken, requireRole("editor", "admin", "superadmin"), inviteToTeam);
router.post("/:id/members", verifyAccessToken, requireRole("editor", "admin", "superadmin"), addMemberToTeam);
router.post("/accept/:token", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), acceptInvitation);
router.delete("/:id/members/:userId", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), removeMember);
router.put("/:id/members/:userId/role", verifyAccessToken, requireRole("editor", "admin", "superadmin"), updateMemberRole);

// Team project management
router.get("/:id/projects", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getTeamProjects);
router.get("/:id/available-projects", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getAvailableProjects);
router.post("/:id/projects", verifyAccessToken, requireRole("editor", "admin", "superadmin"), addProjectsToTeam);
router.delete("/:id/projects", verifyAccessToken, requireRole("editor", "admin", "superadmin"), removeProjectsFromTeam);

// Team book management
router.get("/:id/books", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getTeamBooks);
router.get("/:id/available-books", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getAvailableBooks);
router.post("/:id/books", verifyAccessToken, requireRole("editor", "admin", "superadmin"), addBooksToTeam);
router.delete("/:id/books", verifyAccessToken, requireRole("editor", "admin", "superadmin"), removeBooksFromTeam);

// Team document management
router.get("/:id/documents", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getTeamDocuments);
router.get("/:id/available-documents", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getAvailableDocuments);
router.post("/:id/documents", verifyAccessToken, requireRole("editor", "admin", "superadmin"), addDocumentsToTeam);
router.delete("/:id/documents", verifyAccessToken, requireRole("editor", "admin", "superadmin"), removeDocumentsFromTeam);

export default router;
