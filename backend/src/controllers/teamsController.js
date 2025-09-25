/*
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import Team from "../models/Team.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import Doc from "../models/Doc.js";
import Project from "../models/Project.js";
import crypto from "crypto";
import {
    validateName,
    validateTeamName,
    validateEmail,
    sanitizeString
} from "../lib/validation.js";
import { sendTeamInvitationNotification } from "./notificationsController.js";

/**
 * Get all teams for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of teams or error message
 */
export async function getUserTeams(req, res) {
    try {
        const userId = req.user._id.toString();

        const teams = await Team.find({
            $or: [
                { owner: userId },
                { 'members.user': userId }
            ]
        })
        .populate('owner', 'firstname lastname email')
        .populate('members.user', 'firstname lastname email')
        .sort({ createdAt: -1 });

        // Filter out members with null user references (deleted users)
        const cleanedTeams = teams.map(team => ({
            ...team.toObject(),
            members: team.members.filter(member => member.user !== null)
        }));

        res.status(200).json(cleanedTeams);
    } catch (error) {
        console.error("Error fetching user teams:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get all teams (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of teams or error message
 */
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

        // Filter out members with null user references (deleted users)
        const cleanedTeams = teams.map(team => ({
            ...team.toObject(),
            members: team.members.filter(member => member.user !== null)
        }));

        res.status(200).json(cleanedTeams);
    } catch (error) {
        console.error("Error fetching all teams:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get team by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with team data or error message
 */
export async function getTeamById(req, res) {
    try {
        const teamId = req.params.id;
        const userId = req.user._id.toString();

        const team = await Team.findById(teamId)
            .populate('owner', 'firstname lastname email')
            .populate('members.user', 'firstname lastname email')
            .populate('invitations.invitedBy', 'firstname lastname email')
            .populate('lastUpdatedBy', 'firstname lastname email');

        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check if user has access to this team (member/owner or superadmin)
        if (!team.isMember(userId) && req.user.role !== 'superadmin') {
            console.log("Access denied for user:", userId, "Team owner:", team.owner?._id?.toString(), "User role:", req.user.role);
            return res.status(403).json({ message: "Access denied" });
        }

        // Filter out members with null user references (deleted users)
        const cleanedTeam = {
            ...team.toObject(),
            members: team.members.filter(member => member.user !== null)
        };

        res.status(200).json(cleanedTeam);
    } catch (error) {
        console.error("Error fetching team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Create new team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created team data or error message
 */
export async function createTeam(req, res) {
    try {
        const { name, description } = req.body;
        const userId = req.user._id.toString();

        // Validation
        const validationErrors = [];

        if (!name) {
            validationErrors.push("Team name is required");
        } else {
            const nameValidationError = validateTeamName(name);
            if (nameValidationError) {
                validationErrors.push(nameValidationError);
            }
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

        // Filter out members with null user references (deleted users)
        const cleanedTeam = {
            ...populatedTeam.toObject(),
            members: populatedTeam.members.filter(member => member.user !== null)
        };

        res.status(201).json({
            message: "Team created successfully",
            team: cleanedTeam
        });
    } catch (error) {
        console.error("Error creating team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Update team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated team data or error message
 */
export async function updateTeam(req, res) {
    try {
        const teamId = req.params.id;
        const userId = req.user._id.toString();
        const { name, description, settings } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner or admin)
        if (team.owner.toString() !== userId && !team.isAdmin(userId) && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Validation
        const validationErrors = [];

        if (name) {
            const nameValidationError = validateTeamName(name);
            if (nameValidationError) {
                validationErrors.push(nameValidationError);
            }
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
        updateData.lastUpdatedBy = userId;

        const updatedTeam = await Team.findByIdAndUpdate(
            teamId,
            updateData,
            { new: true }
        )
        .populate('owner', 'firstname lastname email')
        .populate('members.user', 'firstname lastname email')
        .populate('lastUpdatedBy', 'firstname lastname email');

        // Filter out members with null user references (deleted users)
        const cleanedTeam = {
            ...updatedTeam.toObject(),
            members: updatedTeam.members.filter(member => member.user !== null)
        };

        res.status(200).json({
            message: "Team updated successfully",
            team: cleanedTeam
        });
    } catch (error) {
        console.error("Error updating team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Delete team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function deleteTeam(req, res) {
    try {
        const teamId = req.params.id;
        const userId = req.user._id.toString();

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner or admin)
        if (team.owner.toString() !== userId && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: "Access denied" });
        }

        await Team.findByIdAndDelete(teamId);

        res.status(200).json({ message: "Team deleted successfully" });
    } catch (error) {
        console.error("Error deleting team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Invite user to team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function inviteToTeam(req, res) {
    try {
        const teamId = req.params.id;
        const userId = req.user._id.toString();
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

        if (!canInvite && req.user.role !== 'superadmin') {
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

        team.lastUpdatedBy = userId;
        await team.save();

        // Send notification to the user
        const recipientUser = await User.findOne({ email });
        if (recipientUser) {
            await sendTeamInvitationNotification(recipientUser._id, userId, teamId, invitationToken);
        }

        res.status(200).json({
            message: "Invitation sent successfully",
            token: invitationToken // For testing purposes
        });
    } catch (error) {
        console.error("Error inviting to team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Add existing user directly to team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function addMemberToTeam(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { userId, role = 'member' } = req.body;

        // Validation
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        if (!['member', 'admin'].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions
        const canAddMember = team.owner.toString() === currentUserId ||
                            team.isAdmin(currentUserId);

        if (!canAddMember && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Check if user exists
        const userToAdd = await User.findById(userId);
        if (!userToAdd) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user is already a member
        if (team.isMember(userId)) {
            return res.status(409).json({ message: "User is already a team member" });
        }

        // Add user to team
        team.members.push({
            user: userId,
            role: role,
            joinedAt: new Date()
        });

        team.lastUpdatedBy = currentUserId;
        await team.save();

        // Send notification to the added user
        try {
            await sendTeamInvitationNotification(userToAdd._id, team._id, currentUserId, 'added');
        } catch (notificationError) {
            console.error("Error sending notification:", notificationError);
            // Don't fail the request if notification fails
        }

        res.status(200).json({ message: "Member added successfully" });
    } catch (error) {
        console.error("Error adding member to team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Accept team invitation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function acceptInvitation(req, res) {
    try {
        const { token } = req.params;
        const userId = req.user._id.toString();

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

        team.lastUpdatedBy = userId;
        await team.save();

        res.status(200).json({ message: "Invitation accepted successfully" });
    } catch (error) {
        console.error("Error accepting invitation:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Remove member from team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function removeMember(req, res) {
    try {
        const teamId = req.params.id;
        const memberUserId = req.params.userId;
        const currentUserId = req.user._id.toString();

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions
        const canRemove = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         memberUserId === currentUserId; // Users can remove themselves

        if (!canRemove && req.user.role !== 'superadmin') {
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

        team.lastUpdatedBy = currentUserId;
        await team.save();

        res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Update member role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function updateMemberRole(req, res) {
    try {
        const teamId = req.params.id;
        const memberUserId = req.params.userId;
        const currentUserId = req.user._id.toString();
        const { role } = req.body;

        if (!['member', 'admin'].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner or admin)
        if (team.owner.toString() !== currentUserId && !team.isAdmin(currentUserId) && req.user.role !== 'superadmin') {
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
        team.lastUpdatedBy = currentUserId;
        await team.save();

        res.status(200).json({ message: "Member role updated successfully" });
    } catch (error) {
        console.error("Error updating member role:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get books assigned to a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of books or error message
 */
export async function getTeamBooks(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();

        const team = await Team.findById(teamId)
            .populate({
                path: 'books',
                populate: [
                    { path: 'category', select: 'name' },
                    { path: 'owners', select: 'firstname lastname email' }
                ]
            });

        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check if user has access to this team
        const hasAccess = team.owner.toString() === currentUserId ||
                         team.isMember(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(team.books);
    } catch (error) {
        console.error("Error fetching team books:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get books not assigned to a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of books or error message
 */
export async function getAvailableBooks(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check if user has access to this team
        const hasAccess = team.owner.toString() === currentUserId ||
                         team.isMember(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Get all books not assigned to this team
        const availableBooks = await Book.find({
            _id: { $nin: team.books }
        })
        .populate('category', 'name')
        .populate('owners', 'firstname lastname email')
        .sort({ createdAt: -1 });

        res.status(200).json(availableBooks);
    } catch (error) {
        console.error("Error fetching available books:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Add books to a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function addBooksToTeam(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { bookIds } = req.body;

        if (!Array.isArray(bookIds) || bookIds.length === 0) {
            return res.status(400).json({ message: "Book IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Verify all books exist
        const books = await Book.find({ _id: { $in: bookIds } });
        if (books.length !== bookIds.length) {
            return res.status(400).json({ message: "One or more books not found" });
        }

        // Add books to team
        let addedCount = 0;
        for (const bookId of bookIds) {
            if (team.addBook(bookId)) {
                addedCount++;
            }
        }

        team.lastUpdatedBy = currentUserId;
        await team.save();

        res.status(200).json({ 
            message: `${addedCount} book(s) added to team successfully`,
            addedCount
        });
    } catch (error) {
        console.error("Error adding books to team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Remove books from a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function removeBooksFromTeam(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { bookIds } = req.body;

        if (!Array.isArray(bookIds) || bookIds.length === 0) {
            return res.status(400).json({ message: "Book IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Remove books from team
        let removedCount = 0;
        for (const bookId of bookIds) {
            if (team.removeBook(bookId)) {
                removedCount++;
            }
        }

        team.lastUpdatedBy = currentUserId;
        await team.save();

        res.status(200).json({ 
            message: `${removedCount} book(s) removed from team successfully`,
            removedCount
        });
    } catch (error) {
        console.error("Error removing books from team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get documents assigned to a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of documents or error message
 */
export async function getTeamDocuments(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();

        const team = await Team.findById(teamId)
            .populate({
                path: 'documents',
                populate: [
                    { path: 'author', select: 'firstname lastname email' },
                    { path: 'category', select: 'name' }
                ]
            });

        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check if user has access to this team
        const hasAccess = team.owner.toString() === currentUserId ||
                         team.isMember(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(team.documents);
    } catch (error) {
        console.error("Error fetching team documents:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get documents not assigned to a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of documents or error message
 */
export async function getAvailableDocuments(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check if user has access to this team
        const hasAccess = team.owner.toString() === currentUserId ||
                         team.isMember(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Get all documents not assigned to this team
        const availableDocuments = await Doc.find({
            _id: { $nin: team.documents }
        })
        .populate('author', 'firstname lastname email')
        .populate('category', 'name')
        .sort({ createdAt: -1 });

        res.status(200).json(availableDocuments);
    } catch (error) {
        console.error("Error fetching available documents:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Add documents to a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function addDocumentsToTeam(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { documentIds } = req.body;

        if (!Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({ message: "Document IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Verify all documents exist
        const documents = await Doc.find({ _id: { $in: documentIds } });
        if (documents.length !== documentIds.length) {
            return res.status(400).json({ message: "One or more documents not found" });
        }

        // Add documents to team
        let addedCount = 0;
        for (const documentId of documentIds) {
            if (team.addDocument(documentId)) {
                addedCount++;
            }
        }

        team.lastUpdatedBy = currentUserId;
        await team.save();

        res.status(200).json({ 
            message: `${addedCount} document(s) added to team successfully`,
            addedCount
        });
    } catch (error) {
        console.error("Error adding documents to team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Remove documents from a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function removeDocumentsFromTeam(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { documentIds } = req.body;

        if (!Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({ message: "Document IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Remove documents from team
        let removedCount = 0;
        for (const documentId of documentIds) {
            if (team.removeDocument(documentId)) {
                removedCount++;
            }
        }

        team.lastUpdatedBy = currentUserId;
        await team.save();

        res.status(200).json({ 
            message: `${removedCount} document(s) removed from team successfully`,
            removedCount
        });
    } catch (error) {
        console.error("Error removing documents from team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get projects assigned to a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of projects or error message
 */
export async function getTeamProjects(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check if user has access to this team
        const hasAccess = team.owner.toString() === currentUserId ||
                         team.isMember(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Get team projects with populated fields
        const teamWithProjects = await Team.findById(teamId)
            .populate({
                path: 'projects',
                populate: [
                    { path: 'owner', select: 'firstname lastname email' },
                    { path: 'teams', select: 'name' },
                    { path: 'collaborators.user', select: 'firstname lastname email' }
                ]
            });

        res.status(200).json(teamWithProjects.projects);
    } catch (error) {
        console.error("Error fetching team projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get projects not assigned to a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of projects or error message
 */
export async function getAvailableProjects(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check if user has access to this team
        const hasAccess = team.owner.toString() === currentUserId ||
                         team.isMember(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Get all projects not assigned to this team
        const availableProjects = await Project.find({
            _id: { $nin: team.projects }
        })
        .populate('owner', 'firstname lastname email')
        .populate('teams', 'name')
        .populate('collaborators.user', 'firstname lastname email')
        .sort({ createdAt: -1 });

        res.status(200).json(availableProjects);
    } catch (error) {
        console.error("Error fetching available projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Add projects to a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function addProjectsToTeam(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { projectIds } = req.body;

        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({ message: "Project IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Verify all projects exist
        const projects = await Project.find({ _id: { $in: projectIds } });
        if (projects.length !== projectIds.length) {
            return res.status(400).json({ message: "One or more projects not found" });
        }

        // Add projects to team and team to projects
        let addedCount = 0;
        for (const projectId of projectIds) {
            if (team.addProject(projectId)) {
                addedCount++;
                // Also add team to project
                const project = projects.find(p => p._id.toString() === projectId);
                if (project) {
                    project.addTeam(teamId);
                    await project.save();
                }
            }
        }

        team.lastUpdatedBy = currentUserId;
        await team.save();

        res.status(200).json({ 
            message: `${addedCount} project(s) added to team successfully`,
            addedCount
        });
    } catch (error) {
        console.error("Error adding projects to team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Remove projects from a team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function removeProjectsFromTeam(req, res) {
    try {
        const teamId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { projectIds } = req.body;

        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({ message: "Project IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         (req.user.role === 'admin' || req.user.role === 'superadmin');

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Remove projects from team and team from projects
        let removedCount = 0;
        for (const projectId of projectIds) {
            if (team.removeProject(projectId)) {
                removedCount++;
                // Also remove team from project
                const project = await Project.findById(projectId);
                if (project) {
                    project.removeTeam(teamId);
                    await project.save();
                }
            }
        }

        team.lastUpdatedBy = currentUserId;
        await team.save();

        res.status(200).json({ 
            message: `${removedCount} project(s) removed from team successfully`,
            removedCount
        });
    } catch (error) {
        console.error("Error removing projects from team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}