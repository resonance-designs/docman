import mongoose from 'mongoose';
import { tryReconcileProjectTeams } from '../services/projectTeamReconciliation.js';
import { documentReadFilter } from '../middleware/documentAccess.js';
import Notification from '../models/Notification.js';
/*
 * @author Richard Bakos
 * @version 3.0.0
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
        const filter = req.user.role === 'superadmin' ? {} : { $and: [{ $or: [{ owner: req.user._id }, { 'members.user': req.user._id }] }] };

        // Search filter
        if (search) {
            filter.$or = [
                { name: { $regex: literalSearch(search), $options: 'i' } },
                { description: { $regex: literalSearch(search), $options: 'i' } }
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
        if (typeof name !== 'string' || !name.trim() || name.length>100 || (description!==undefined && (typeof description!=='string' || description.length>500))) return res.status(400).json({message:'Enter a team name up to 100 characters and description up to 500.'});
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
        if ((name!==undefined && (typeof name!=='string' || !name.trim() || name.length>100)) || (description!==undefined && (typeof description!=='string' || description.length>500)) || (settings!==undefined && (!settings || typeof settings!=='object' || Array.isArray(settings) || Object.keys(settings).some(key=>!['allowMemberInvites','isPrivate'].includes(key)) || Object.values(settings).some(value=>typeof value!=='boolean')))) return res.status(400).json({message:'Invalid team name, description or settings.'});

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
            { new: true, runValidators: true }
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

        await Project.updateMany({ teams: teamId, teamSyncDeleting: { $ne: true } }, {
            $pull: { teams: teamId }, $set: { teamSyncPending: true, teamSyncActor: req.user._id },
            $inc: { teamSyncRevision: 1 }, $addToSet: { teamSyncCandidates: teamId },
        });
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
        const { role = 'member' } = req.body;
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

        // Validation
        if (!email || !validateEmail(email).isValid) {
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

        if (role === 'admin' && !team.isAdmin(userId) && String(team.owner) !== userId && req.user.role !== 'superadmin') return res.status(403).json({ message: 'Only team managers can invite team admins.' });
        // Check if user is already a member
        const existingUser = await User.findOne({ email, isActive: { $ne: false }, invitationPending: { $ne: true } });
        if (!existingUser) return res.status(400).json({ message: 'Invite an active registered user. A superadmin must invite new accounts through Users first.' });
        if (existingUser && team.isMember(existingUser._id)) {
            return res.status(409).json({ message: "User is already a team member" });
        }

        // Check if invitation already exists
        const existingInvitation = team.invitations.find(inv =>
            inv.email === email && inv.status === 'pending' && inv.expiresAt > new Date()
        );

        if (existingInvitation) {
            return res.status(409).json({ message: "Invitation already sent" });
        }

        // Create invitation
        const invitationToken = crypto.randomBytes(32).toString('hex');

        const now = new Date();
        const invited = await Team.findOneAndUpdate({
            _id: teamId,
            invitations: { $not: { $elemMatch: { email, status: 'pending', expiresAt: { $gt: now } } } },
            'members.user': { $ne: existingUser._id }
        }, {
            $push: { invitations: { email, role, invitedBy: userId, token: invitationToken,
                invitedAt: now, expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), status: 'pending' } },
            $set: { lastUpdatedBy: userId }
        }, { new: true, runValidators: true });
        if (!invited) return res.status(409).json({ message: 'Invitation already sent or user is already a member.' });

        const notice = await sendTeamInvitationNotification(existingUser._id, userId, teamId, invitationToken);
        if (!notice) {
            await Team.updateOne({ _id: teamId }, { $pull: { invitations: { token: invitationToken } } });
            return res.status(503).json({ message: 'Invitation could not be delivered. Try inviting again.' });
        }

        res.status(200).json({
            message: "Invitation sent. The recipient can accept it from Activity."
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
        if (typeof userId !== 'string' || !mongoose.isValidObjectId(userId)) return res.status(400).json({message:'Select a valid user.'});

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
        if (!userToAdd || userToAdd.isActive === false || userToAdd.invitationPending) {
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
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({message:'Invalid invitation.'});
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
        if (!user || user.isActive === false || user.invitationPending || user.email !== invitation.email) {
            return res.status(403).json({ message: "Email mismatch" });
        }

        // Check if user is already a member
        if (team.isMember(userId)) {
            return res.status(409).json({ message: "Already a team member" });
        }

        const accepted = await Team.findOneAndUpdate({
            _id: team._id,
            invitations: { $elemMatch: { token, email: user.email, status: 'pending', expiresAt: { $gt: new Date() } } },
            'members.user': { $ne: user._id }
        }, { $push: { members: { user: user._id, role: invitation.role, joinedAt: new Date() } },
             $set: { 'invitations.$.status': 'accepted', lastUpdatedBy: user._id } }, { new: true, runValidators: true });
        if (!accepted) return res.status(409).json({ message: 'Invitation is no longer available.' });
        try {
            await Notification.updateMany({ recipient: user._id, invitationToken: token }, { $unset: { invitationToken: 1 }, $set: { isRead: true, readAt: new Date() } });
        } catch {
            console.error('Team invitation accepted; notification cleanup failed. Membership is committed.');
        }
        res.status(200).json({ message: 'Invitation accepted successfully', teamId: team._id });
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
                         req.user.role === 'superadmin';

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
                         req.user.role === 'superadmin';

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

        if (!validIdList(bookIds)) {
            return res.status(400).json({ message: "Book IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         req.user.role === 'superadmin';

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

        if (!validIdList(bookIds)) {
            return res.status(400).json({ message: "Book IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         req.user.role === 'superadmin';

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
                match: documentReadFilter(req.user),
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
                         req.user.role === 'superadmin';

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
                         req.user.role === 'superadmin';

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Get all documents not assigned to this team
        const availableDocuments = await Doc.find({
            $and: [documentReadFilter(req.user), { _id: { $nin: team.documents } }]
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

        if (!validIdList(documentIds)) {
            return res.status(400).json({ message: "Document IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         req.user.role === 'superadmin';

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Verify all documents exist
        const documents = await Doc.find({ $and: [documentReadFilter(req.user), { _id: { $in: documentIds } }] });
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

        if (!validIdList(documentIds)) {
            return res.status(400).json({ message: "Document IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         req.user.role === 'superadmin';

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
                         req.user.role === 'superadmin';

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
                         req.user.role === 'superadmin';

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Get all projects not assigned to this team
        const availableProjects = await Project.find({
            _id: { $nin: team.projects },
            ...projectManagementFilter(req.user)
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

        if (!validIdList(projectIds)) {
            return res.status(400).json({ message: "Project IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         req.user.role === 'superadmin';

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Verify all projects exist
        const projects = await Project.find({ _id: { $in: projectIds }, ...projectManagementFilter(req.user) });
        if (projects.length !== projectIds.length) {
            return res.status(400).json({ message: "One or more projects not found" });
        }

        // Add projects to team and team to projects
        let addedCount = 0;
        let relationshipsPending = false;
        for (const projectId of projectIds) {
            const result = await Project.updateOne({ _id: projectId.toLowerCase(), teams: { $ne: teamId }, teamSyncDeleting: { $ne: true } }, {
                $addToSet: { teams: teamId, teamSyncCandidates: teamId },
                $inc: { teamSyncRevision: 1 }, $set: { teamSyncPending: true, teamSyncActor: currentUserId },
            });
            addedCount += result.modifiedCount;
            if (!await tryReconcileProjectTeams(projectId)) relationshipsPending = true;
        }

        res.status(200).json({ 
            message: `${addedCount} project(s) added to team successfully`,
            addedCount,
            relationshipsPending
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

        if (!validIdList(projectIds)) {
            return res.status(400).json({ message: "Project IDs array is required" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check permissions (owner, admin, or system admin)
        const canManage = team.owner.toString() === currentUserId ||
                         team.isAdmin(currentUserId) ||
                         req.user.role === 'superadmin';

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Remove projects from team and team from projects
        let removedCount = 0;
        let relationshipsPending = false;
        for (const projectId of projectIds) {
            const result = await Project.updateOne({ _id: projectId.toLowerCase(), teams: teamId, teamSyncDeleting: { $ne: true } }, {
                $pull: { teams: teamId }, $addToSet: { teamSyncCandidates: teamId },
                $inc: { teamSyncRevision: 1 }, $set: { teamSyncPending: true, teamSyncActor: currentUserId },
            });
            removedCount += result.modifiedCount;
            if (!await tryReconcileProjectTeams(projectId)) relationshipsPending = true;
        }

        res.status(200).json({ 
            message: `${removedCount} project(s) removed from team successfully`,
            removedCount,
            relationshipsPending
        });
    } catch (error) {
        console.error("Error removing projects from team:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
function projectManagementFilter(user) {
    if (user.role === 'superadmin') return {};
    const actor = user._id || user.id;
    return {$or:[{owner:actor},{collaborators:{$elemMatch:{user:actor,role:'manager'}}}]};
}

function validIdList(values) {
    return Array.isArray(values) && values.length > 0 && values.length <= 500
        && values.every(value => typeof value === 'string' && mongoose.isValidObjectId(value))
        && new Set(values).size === values.length;
}
function literalSearch(value) {
    return String(value).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
