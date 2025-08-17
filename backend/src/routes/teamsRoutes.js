/*
 * @name teamsRoutes
 * @file /docman/backend/src/routes/teamsRoutes.js
 * @routes teamsRoutes
 * @description Team management routes for team operations, member management, and collaboration
 * @author Richard Bakos
 * @version 2.0.2
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
    acceptInvitation,
    removeMember,
    updateMemberRole
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

// Get all teams (admin only)
router.get("/", verifyAccessToken, requireRole("admin"), getAllTeams);

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
router.post("/accept/:token", verifyAccessToken, requireRole("viewer", "editor", "admin"), acceptInvitation);
router.delete("/:id/members/:userId", verifyAccessToken, requireRole("viewer", "editor", "admin"), removeMember);
router.put("/:id/members/:userId/role", verifyAccessToken, requireRole("editor", "admin"), updateMemberRole);

export default router;
