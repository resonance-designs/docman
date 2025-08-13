// backend/src/controllers/teamsController.js
import Team from "../models/Team.js";
import User from "../models/User.js";
import crypto from "crypto";
import { 
    validateName, 
    validateEmail, 
    sanitizeString 
} from "../lib/validation.js";

// Get all teams for the current user
export async function getUserTeams(req, res) {
    try {
        const userId = req.user.id;
        
        const teams = await Team.find({
            $or: [
                { owner: userId },
                { 'members.user': userId }
            ]
        })
        .populate('owner', 'firstname lastname email')
        .populate('members.user', 'firstname lastname email')
        .sort({ createdAt: -1 });

        res.status(200).json(teams);
    } catch (error) {
        console.error("Error fetching user teams:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Get all teams (admin only)
export async function getAllTeams(req, res) {
    try {
        const { search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        // Build filter object
        const filter = {};
        
        // Search filter
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort object
        const validSortFields = ['name', 'createdAt', 'memberCount'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const sortObj = { [sortField]: sortDirection };

        const teams = await Team.find(filter)
            .populate('owner', 'firstname lastname email')
            .populate('members.user', 'firstname lastname email')
            .sort(sortObj);

        res.status(200).json(teams);
    } catch (error) {
        console.error("Error fetching all teams:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Get team by ID
export async function getTeamById(req, res) {
    try {
        const teamId = req.params.id;
        const userId = req.user.id;
        
        const team = await Team.findById(teamId)
            .populate('owner', 'firstname lastname email')
            .populate('members.user', 'firstname lastname email')
            .populate('invitations.invitedBy', 'firstname lastname email');

        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check if user has access to this team
        if (!team.isMember(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(team);
    } catch (error) {
        console.error("Error fetching team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Create new team
export async function createTeam(req, res) {
    try {
        const { name, description } = req.body;
        const userId = req.user.id;

        // Validation
        const validationErrors = [];
        
        if (!name || !validateName(name)) {
            validationErrors.push("Valid team name is required");
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                message: "Validation failed", 
                errors: validationErrors 
            });
        }

        // Check if team name already exists for this user
        const existingTeam = await Team.findOne({ 
            name: sanitizeString(name),
            owner: userId 
        });
        
        if (existingTeam) {
            return res.status(409).json({ 
                message: "You already have a team with this name" 
            });
        }

        // Create team
        const newTeam = new Team({
            name: sanitizeString(name),
            description: description ? sanitizeString(description) : undefined,
            owner: userId
        });

        await newTeam.save();

        // Populate the response
        const populatedTeam = await Team.findById(newTeam._id)
            .populate('owner', 'firstname lastname email')
            .populate('members.user', 'firstname lastname email');

        res.status(201).json({ 
            message: "Team created successfully", 
            team: populatedTeam 
        });
    } catch (error) {
        console.error("Error creating team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Update team
export async function updateTeam(req, res) {
    try {
        const teamId = req.params.id;
        const userId = req.user.id;
        const { name, description, settings } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner or admin)
        if (team.owner.toString() !== userId && !team.isAdmin(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Validation
        const validationErrors = [];
        
        if (name && !validateName(name)) {
            validationErrors.push("Valid team name is required");
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                message: "Validation failed", 
                errors: validationErrors 
            });
        }

        // Update fields
        const updateData = {};
        if (name) updateData.name = sanitizeString(name);
        if (description !== undefined) updateData.description = description ? sanitizeString(description) : "";
        if (settings) updateData.settings = { ...team.settings, ...settings };

        const updatedTeam = await Team.findByIdAndUpdate(
            teamId, 
            updateData, 
            { new: true }
        )
        .populate('owner', 'firstname lastname email')
        .populate('members.user', 'firstname lastname email');

        res.status(200).json({ 
            message: "Team updated successfully", 
            team: updatedTeam 
        });
    } catch (error) {
        console.error("Error updating team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Delete team
export async function deleteTeam(req, res) {
    try {
        const teamId = req.params.id;
        const userId = req.user.id;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner or admin)
        if (team.owner.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        await Team.findByIdAndDelete(teamId);

        res.status(200).json({ message: "Team deleted successfully" });
    } catch (error) {
        console.error("Error deleting team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Invite user to team
export async function inviteToTeam(req, res) {
    try {
        const teamId = req.params.id;
        const userId = req.user.id;
        const { email, role = 'member' } = req.body;

        // Validation
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ message: "Valid email is required" });
        }

        if (!['member', 'admin'].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions
        const canInvite = team.owner.toString() === userId ||
                         team.isAdmin(userId) ||
                         (team.settings.allowMemberInvites && team.isMember(userId));

        if (!canInvite && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Check if user is already a member
        const existingUser = await User.findOne({ email });
        if (existingUser && team.isMember(existingUser._id)) {
            return res.status(409).json({ message: "User is already a team member" });
        }

        // Check if invitation already exists
        const existingInvitation = team.invitations.find(inv =>
            inv.email === email && inv.status === 'pending'
        );

        if (existingInvitation) {
            return res.status(409).json({ message: "Invitation already sent" });
        }

        // Create invitation
        const invitationToken = crypto.randomBytes(32).toString('hex');

        team.invitations.push({
            email,
            role,
            invitedBy: userId,
            token: invitationToken
        });

        await team.save();

        // TODO: Send invitation email here

        res.status(200).json({
            message: "Invitation sent successfully",
            token: invitationToken // For testing purposes
        });
    } catch (error) {
        console.error("Error inviting to team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Accept team invitation
export async function acceptInvitation(req, res) {
    try {
        const { token } = req.params;
        const userId = req.user.id;

        const team = await Team.findOne({ 'invitations.token': token });
        if (!team) {
            return res.status(404).json({ message: "Invalid invitation" });
        }

        const invitation = team.invitations.find(inv => inv.token === token);
        if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
            return res.status(400).json({ message: "Invitation expired or invalid" });
        }

        // Check if user email matches invitation
        const user = await User.findById(userId);
        if (user.email !== invitation.email) {
            return res.status(403).json({ message: "Email mismatch" });
        }

        // Check if user is already a member
        if (team.isMember(userId)) {
            return res.status(409).json({ message: "Already a team member" });
        }

        // Add user to team
        team.members.push({
            user: userId,
            role: invitation.role
        });

        // Update invitation status
        invitation.status = 'accepted';

        await team.save();

        res.status(200).json({ message: "Invitation accepted successfully" });
    } catch (error) {
        console.error("Error accepting invitation:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Remove member from team
export async function removeMember(req, res) {
    try {
        const teamId = req.params.id;
        const memberUserId = req.params.userId;
        const currentUserId = req.user.id;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions
        const canRemove = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         memberUserId === currentUserId; // Users can remove themselves

        if (!canRemove && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Cannot remove team owner
        if (team.owner.toString() === memberUserId) {
            return res.status(400).json({ message: "Cannot remove team owner" });
        }

        // Remove member
        team.members = team.members.filter(member =>
            member.user.toString() !== memberUserId
        );

        await team.save();

        res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Update member role
export async function updateMemberRole(req, res) {
    try {
        const teamId = req.params.id;
        const memberUserId = req.params.userId;
        const currentUserId = req.user.id;
        const { role } = req.body;

        if (!['member', 'admin'].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner or admin)
        if (team.owner.toString() !== currentUserId && !team.isAdmin(currentUserId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Cannot change owner role
        if (team.owner.toString() === memberUserId) {
            return res.status(400).json({ message: "Cannot change team owner role" });
        }

        // Find and update member
        const member = team.members.find(m => m.user.toString() === memberUserId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        member.role = role;
        await team.save();

        res.status(200).json({ message: "Member role updated successfully" });
    } catch (error) {
        console.error("Error updating member role:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
