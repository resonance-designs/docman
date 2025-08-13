// backend/src/routes/teamsRoutes.js
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
