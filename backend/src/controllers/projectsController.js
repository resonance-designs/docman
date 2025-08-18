/*
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import Project from "../models/Project.js";
import Team from "../models/Team.js";
import Doc from "../models/Doc.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import { 
    validateName, 
    sanitizeString 
} from "../lib/validation.js";

/**
 * Get all projects (for admin/editor users)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of projects or error message
 */
export async function getAllProjects(req, res) {
    try {
        const { search, status, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build filter object
        const filter = {};

        // Search filter
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Status filter
        if (status) {
            filter.status = status;
        }

        // Priority filter
        if (priority) {
            filter.priority = priority;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const projects = await Project.find(filter)
            .populate('teams', 'name')
            .populate('collaborators', 'name email')
            .populate('documents', 'title')
            .sort(sort);

        res.status(200).json({ 
            projects,
            total: projects.length
        });
    } catch (error) {
        console.error("Error fetching all projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get projects for a specific team
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of projects or error message
 */
export async function getTeamProjects(req, res) {
    try {
        const teamId = req.params.teamId;
        const userId = req.user._id.toString();
        const { search, status, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Check if user has access to the team
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        if (!team.isMember(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Build filter object
        const filter = { teams: teamId };

        // Search filter
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Status filter
        if (status) {
            filter.status = status;
        }

        // Priority filter
        if (priority) {
            filter.priority = priority;
        }

        // Build sort object
        const validSortFields = ['name', 'createdAt', 'status', 'priority', 'startDate', 'endDate'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const sortObj = { [sortField]: sortDirection };

        const projects = await Project.find(filter)
            .populate('owner', 'firstname lastname email')
            .populate('teams', 'name')
            .populate('collaborators.user', 'firstname lastname email')
            .populate('documents', 'title reviewDate')
            .sort(sortObj);

        res.status(200).json(projects);
    } catch (error) {
        console.error("Error fetching team projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get user's projects across all teams
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of projects or error message
 */
export async function getUserProjects(req, res) {
    try {
        const userId = req.user._id.toString();
        const { search, status, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build filter object
        const filter = {
            $or: [
                { owner: userId },
                { 'collaborators.user': userId }
            ]
        };

        // Search filter
        if (search) {
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // Status filter
        if (status) {
            filter.status = status;
        }

        // Priority filter
        if (priority) {
            filter.priority = priority;
        }

        // Build sort object
        const validSortFields = ['name', 'createdAt', 'status', 'priority', 'startDate', 'endDate'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const sortObj = { [sortField]: sortDirection };

        const projects = await Project.find(filter)
            .populate('teams', 'name')
            .populate('owner', 'firstname lastname email')
            .populate('collaborators.user', 'firstname lastname email')
            .populate('documents', 'title reviewDate')
            .sort(sortObj);

        res.status(200).json(projects);
    } catch (error) {
        console.error("Error fetching user projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get project by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with project data or error message
 */
export async function getProjectById(req, res) {
    try {
        const projectId = req.params.id;
        const userId = req.user._id.toString();

        const project = await Project.findById(projectId)
            .populate('teams', 'name')
            .populate('owner', 'firstname lastname email')
            .populate('collaborators.user', 'firstname lastname email')
            .populate('documents');

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check if user has access to this project
        let hasTeamAccess = false;
        if (project.teams && project.teams.length > 0) {
            for (const teamId of project.teams) {
                const team = await Team.findById(teamId._id);
                if (team && team.isMember(userId)) {
                    hasTeamAccess = true;
                    break;
                }
            }
        }
        const hasProjectAccess = project.isCollaborator(userId);

        if (!hasTeamAccess && !hasProjectAccess && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(project);
    } catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Create new project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created project data or error message
 */
export async function createProject(req, res) {
    try {
        const { name, description, teamIds, status, priority, startDate, endDate, tags } = req.body;
        const userId = req.user._id.toString();

        // Validation
        const validationErrors = [];

        if (!name) {
            validationErrors.push("Project name is required");
        } else {
            const nameValidationResult = validateName(name, "Project name");
            if (!nameValidationResult.isValid) {
                validationErrors.push(nameValidationResult.error);
            }
        }

        if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
            validationErrors.push("At least one team ID is required");
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Check if teams exist and user has access to at least one
        const teams = await Team.find({ _id: { $in: teamIds } });
        if (teams.length !== teamIds.length) {
            return res.status(404).json({ message: "One or more teams not found" });
        }

        let hasAccess = false;
        for (const team of teams) {
            if (team.isMember(userId) || req.user.role === 'admin') {
                hasAccess = true;
                break;
            }
        }

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied - must be member of at least one team" });
        }

        // Create project
        const projectData = {
            name: sanitizeString(name),
            description: description ? sanitizeString(description) : undefined,
            teams: teamIds,
            owner: userId
        };

        if (status && ['active', 'completed', 'archived', 'on-hold'].includes(status)) {
            projectData.status = status;
        }

        if (priority && ['low', 'medium', 'high', 'critical'].includes(priority)) {
            projectData.priority = priority;
        }

        if (startDate) {
            projectData.startDate = new Date(startDate);
        }

        if (endDate) {
            projectData.endDate = new Date(endDate);
        }

        if (tags && Array.isArray(tags)) {
            projectData.tags = tags.map(tag => sanitizeString(tag)).filter(tag => tag.length > 0);
        }

        const newProject = new Project(projectData);
        await newProject.save();

        // Add project to teams
        for (const teamId of teamIds) {
            const team = await Team.findById(teamId);
            if (team) {
                team.addProject(newProject._id);
                await team.save();
            }
        }

        // Populate the response
        const populatedProject = await Project.findById(newProject._id)
            .populate('teams', 'name')
            .populate('owner', 'firstname lastname email')
            .populate('collaborators.user', 'firstname lastname email');

        res.status(201).json({
            message: "Project created successfully",
            project: populatedProject
        });
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Update project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated project data or error message
 */
export async function updateProject(req, res) {
    try {
        const projectId = req.params.id;
        const userId = req.user._id.toString();
        const { name, description, teamIds, status, priority, startDate, endDate, tags, settings } = req.body;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions (owner, manager, or admin)
        if (project.owner.toString() !== userId && !project.isManager(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Validation
        const validationErrors = [];

        if (name) {
            const nameValidationResult = validateName(name, "Project name");
            if (!nameValidationResult.isValid) {
                validationErrors.push(nameValidationResult.error);
            }
        }

        if (teamIds !== undefined) {
            if (!Array.isArray(teamIds) || teamIds.length === 0) {
                validationErrors.push("At least one team ID is required");
            }
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Handle team updates if provided
        if (teamIds !== undefined) {
            // Check if teams exist and user has access to at least one
            const teams = await Team.find({ _id: { $in: teamIds } });
            if (teams.length !== teamIds.length) {
                return res.status(404).json({ message: "One or more teams not found" });
            }

            let hasAccess = false;
            for (const team of teams) {
                if (team.isMember(userId) || req.user.role === 'admin') {
                    hasAccess = true;
                    break;
                }
            }

            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied - must be member of at least one team" });
            }

            // Remove project from old teams
            const oldTeams = await Team.find({ projects: projectId });
            for (const oldTeam of oldTeams) {
                oldTeam.removeProject(projectId);
                await oldTeam.save();
            }

            // Add project to new teams
            for (const teamId of teamIds) {
                const team = await Team.findById(teamId);
                if (team) {
                    team.addProject(projectId);
                    await team.save();
                }
            }
        }

        // Update fields
        const updateData = {};
        if (name) updateData.name = sanitizeString(name);
        if (description !== undefined) updateData.description = description ? sanitizeString(description) : "";
        if (teamIds !== undefined) updateData.teams = teamIds;
        if (status && ['active', 'completed', 'archived', 'on-hold'].includes(status)) {
            updateData.status = status;
        }
        if (priority && ['low', 'medium', 'high', 'critical'].includes(priority)) {
            updateData.priority = priority;
        }
        if (startDate) updateData.startDate = new Date(startDate);
        if (endDate) updateData.endDate = new Date(endDate);
        if (tags && Array.isArray(tags)) {
            updateData.tags = tags.map(tag => sanitizeString(tag)).filter(tag => tag.length > 0);
        }
        if (settings) updateData.settings = { ...project.settings, ...settings };

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            updateData,
            { new: true }
        )
        .populate('teams', 'name')
        .populate('owner', 'firstname lastname email')
        .populate('collaborators.user', 'firstname lastname email');

        res.status(200).json({
            message: "Project updated successfully",
            project: updatedProject
        });
    } catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Delete project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function deleteProject(req, res) {
    try {
        const projectId = req.params.id;
        const userId = req.user._id.toString();

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions (owner or admin)
        if (project.owner.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Remove project references from documents
        await Doc.updateMany(
            { projects: projectId },
            { $pull: { projects: projectId } }
        );

        await Project.findByIdAndDelete(projectId);

        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Add collaborator to project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function addCollaborator(req, res) {
    try {
        const projectId = req.params.id;
        const userId = req.user._id.toString();
        const { collaboratorId, role = 'contributor' } = req.body;

        if (!['viewer', 'contributor', 'manager'].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions (owner, manager, or admin)
        if (project.owner.toString() !== userId && !project.isManager(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Check if user exists and is member of at least one team
        let isTeamMember = false;
        if (project.teams && project.teams.length > 0) {
            for (const teamId of project.teams) {
                const team = await Team.findById(teamId);
                if (team && team.isMember(collaboratorId)) {
                    isTeamMember = true;
                    break;
                }
            }
        }
        if (!isTeamMember) {
            return res.status(400).json({ message: "User must be a member of at least one project team" });
        }

        // Check if already a collaborator
        if (project.isCollaborator(collaboratorId)) {
            return res.status(409).json({ message: "User is already a collaborator" });
        }

        // Add collaborator
        project.collaborators.push({
            user: collaboratorId,
            role
        });

        await project.save();

        res.status(200).json({ message: "Collaborator added successfully" });
    } catch (error) {
        console.error("Error adding collaborator:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Remove collaborator from project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function removeCollaborator(req, res) {
    try {
        const projectId = req.params.id;
        const collaboratorId = req.params.userId;
        const currentUserId = req.user._id.toString();

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions
        const canRemove = project.owner.toString() === currentUserId ||
                         project.isManager(currentUserId) ||
                         collaboratorId === currentUserId; // Users can remove themselves

        if (!canRemove && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Cannot remove project owner
        if (project.owner.toString() === collaboratorId) {
            return res.status(400).json({ message: "Cannot remove project owner" });
        }

        // Remove collaborator
        project.collaborators = project.collaborators.filter(collab =>
            collab.user.toString() !== collaboratorId
        );

        await project.save();

        res.status(200).json({ message: "Collaborator removed successfully" });
    } catch (error) {
        console.error("Error removing collaborator:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Add document to project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function addDocument(req, res) {
    try {
        const projectId = req.params.id;
        const userId = req.user._id.toString();
        const { documentId } = req.body;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions (collaborator or admin)
        if (!project.isCollaborator(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Check if document exists
        const document = await Doc.findById(documentId);
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Check if document is already in project
        if (project.documents.includes(documentId)) {
            return res.status(409).json({ message: "Document already in project" });
        }

        // Add document to project
        project.documents.push(documentId);
        await project.save();

        // Add project to document
        if (!document.projects.includes(projectId)) {
            document.projects.push(projectId);
            await document.save();
        }

        res.status(200).json({ message: "Document added to project successfully" });
    } catch (error) {
        console.error("Error adding document to project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Remove document from project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function removeDocument(req, res) {
    try {
        const projectId = req.params.id;
        const documentId = req.params.documentId;
        const userId = req.user._id.toString();

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions (manager or admin)
        if (!project.isManager(userId) && project.owner.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Remove document from project
        project.documents = project.documents.filter(docId =>
            docId.toString() !== documentId
        );
        await project.save();

        // Remove project from document
        const document = await Doc.findById(documentId);
        if (document) {
            document.projects = document.projects.filter(projId =>
                projId.toString() !== projectId
            );
            await document.save();
        }

        res.status(200).json({ message: "Document removed from project successfully" });
    } catch (error) {
        console.error("Error removing document from project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get books assigned to a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of books or error message
 */
export async function getProjectBooks(req, res) {
    try {
        const projectId = req.params.id;
        const currentUserId = req.user._id.toString();

        const project = await Project.findById(projectId)
            .populate({
                path: 'books',
                populate: [
                    { path: 'category', select: 'name' },
                    { path: 'owners', select: 'firstname lastname email' }
                ]
            });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check if user has access to this project
        const hasAccess = project.owner.toString() === currentUserId ||
                         project.isCollaborator(currentUserId) ||
                         req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(project.books || []);
    } catch (error) {
        console.error("Error fetching project books:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get books not assigned to a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of books or error message
 */
export async function getAvailableProjectBooks(req, res) {
    try {
        const projectId = req.params.id;
        const currentUserId = req.user._id.toString();

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check if user has access to this project
        const hasAccess = project.owner.toString() === currentUserId ||
                         project.isCollaborator(currentUserId) ||
                         req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Get all books not assigned to this project
        const availableBooks = await Book.find({
            _id: { $nin: project.books || [] }
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
 * Add books to a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function addBooksToProject(req, res) {
    try {
        const projectId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { bookIds } = req.body;

        if (!Array.isArray(bookIds) || bookIds.length === 0) {
            return res.status(400).json({ message: "Book IDs array is required" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions (owner, manager, or admin)
        const canManage = project.owner.toString() === currentUserId ||
                         project.isManager(currentUserId) ||
                         req.user.role === 'admin';

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Verify all books exist
        const books = await Book.find({ _id: { $in: bookIds } });
        if (books.length !== bookIds.length) {
            return res.status(400).json({ message: "One or more books not found" });
        }

        // Add books to project
        let addedCount = 0;
        for (const bookId of bookIds) {
            if (!project.books) {
                project.books = [];
            }
            if (!project.books.includes(bookId)) {
                project.books.push(bookId);
                addedCount++;
            }
        }

        await project.save();

        res.status(200).json({ 
            message: `${addedCount} book(s) added to project successfully`,
            addedCount
        });
    } catch (error) {
        console.error("Error adding books to project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Remove books from a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function removeBooksFromProject(req, res) {
    try {
        const projectId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { bookIds } = req.body;

        if (!Array.isArray(bookIds) || bookIds.length === 0) {
            return res.status(400).json({ message: "Book IDs array is required" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions (owner, manager, or admin)
        const canManage = project.owner.toString() === currentUserId ||
                         project.isManager(currentUserId) ||
                         req.user.role === 'admin';

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Remove books from project
        let removedCount = 0;
        if (project.books) {
            for (const bookId of bookIds) {
                const index = project.books.indexOf(bookId);
                if (index > -1) {
                    project.books.splice(index, 1);
                    removedCount++;
                }
            }
        }

        await project.save();

        res.status(200).json({ 
            message: `${removedCount} book(s) removed from project successfully`,
            removedCount
        });
    } catch (error) {
        console.error("Error removing books from project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get documents assigned to a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of documents or error message
 */
export async function getProjectDocuments(req, res) {
    try {
        const projectId = req.params.id;
        const currentUserId = req.user._id.toString();

        const project = await Project.findById(projectId)
            .populate({
                path: 'documents',
                populate: [
                    { path: 'author', select: 'firstname lastname email' },
                    { path: 'category', select: 'name' }
                ]
            });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check if user has access to this project
        const hasAccess = project.owner.toString() === currentUserId ||
                         project.isCollaborator(currentUserId) ||
                         req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(project.documents || []);
    } catch (error) {
        console.error("Error fetching project documents:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get documents not assigned to a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of documents or error message
 */
export async function getAvailableProjectDocuments(req, res) {
    try {
        const projectId = req.params.id;
        const currentUserId = req.user._id.toString();

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check if user has access to this project
        const hasAccess = project.owner.toString() === currentUserId ||
                         project.isCollaborator(currentUserId) ||
                         req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Get all documents not assigned to this project
        const availableDocuments = await Doc.find({
            _id: { $nin: project.documents || [] }
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
 * Add documents to a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function addDocumentsToProject(req, res) {
    try {
        const projectId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { documentIds } = req.body;

        if (!Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({ message: "Document IDs array is required" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions (owner, manager, or admin)
        const canManage = project.owner.toString() === currentUserId ||
                         project.isManager(currentUserId) ||
                         req.user.role === 'admin';

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Verify all documents exist
        const documents = await Doc.find({ _id: { $in: documentIds } });
        if (documents.length !== documentIds.length) {
            return res.status(400).json({ message: "One or more documents not found" });
        }

        // Add documents to project
        let addedCount = 0;
        for (const documentId of documentIds) {
            if (!project.documents) {
                project.documents = [];
            }
            if (!project.documents.includes(documentId)) {
                project.documents.push(documentId);
                addedCount++;
            }
        }

        await project.save();

        // Also add project to documents
        for (const documentId of documentIds) {
            const document = await Doc.findById(documentId);
            if (document) {
                if (!document.projects) {
                    document.projects = [];
                }
                if (!document.projects.includes(projectId)) {
                    document.projects.push(projectId);
                    await document.save();
                }
            }
        }

        res.status(200).json({ 
            message: `${addedCount} document(s) added to project successfully`,
            addedCount
        });
    } catch (error) {
        console.error("Error adding documents to project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Remove documents from a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function removeDocumentsFromProject(req, res) {
    try {
        const projectId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { documentIds } = req.body;

        if (!Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({ message: "Document IDs array is required" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions (owner, manager, or admin)
        const canManage = project.owner.toString() === currentUserId ||
                         project.isManager(currentUserId) ||
                         req.user.role === 'admin';

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Remove documents from project
        let removedCount = 0;
        if (project.documents) {
            for (const documentId of documentIds) {
                const index = project.documents.indexOf(documentId);
                if (index > -1) {
                    project.documents.splice(index, 1);
                    removedCount++;
                }
            }
        }

        await project.save();

        // Also remove project from documents
        for (const documentId of documentIds) {
            const document = await Doc.findById(documentId);
            if (document && document.projects) {
                const index = document.projects.indexOf(projectId);
                if (index > -1) {
                    document.projects.splice(index, 1);
                    await document.save();
                }
            }
        }

        res.status(200).json({ 
            message: `${removedCount} document(s) removed from project successfully`,
            removedCount
        });
    } catch (error) {
        console.error("Error removing documents from project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get collaborators for a project (includes direct collaborators and team members)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of collaborators or error message
 */
export async function getProjectCollaborators(req, res) {
    try {
        const projectId = req.params.id;
        const currentUserId = req.user._id.toString();

        const project = await Project.findById(projectId)
            .populate('collaborators.user', 'firstname lastname email username phone')
            .populate({
                path: 'teams',
                populate: {
                    path: 'members.user',
                    select: 'firstname lastname email username phone'
                }
            });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check if user has access to this project
        const hasAccess = project.owner.toString() === currentUserId ||
                         project.isCollaborator(currentUserId) ||
                         req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Extract direct collaborators
        const directCollaborators = project.collaborators.map(collab => ({
            ...collab.user.toObject(),
            role: collab.role,
            joinedAt: collab.joinedAt,
            source: 'direct',
            isDirect: true
        }));

        // Extract team members
        const teamMembers = [];
        if (project.teams && project.teams.length > 0) {
            project.teams.forEach(team => {
                if (team.members && team.members.length > 0) {
                    team.members.forEach(member => {
                        // Avoid duplicates with direct collaborators
                        const isAlreadyDirectCollaborator = directCollaborators.some(
                            collab => collab._id.toString() === member.user._id.toString()
                        );
                        
                        if (!isAlreadyDirectCollaborator) {
                            teamMembers.push({
                                ...member.user.toObject(),
                                role: member.role || 'team-member',
                                joinedAt: member.joinedAt,
                                source: 'team',
                                teamName: team.name,
                                teamId: team._id,
                                isDirect: false
                            });
                        }
                    });
                }
            });
        }

        // Remove duplicates from team members (in case user is in multiple teams)
        const uniqueTeamMembers = teamMembers.filter((member, index, self) =>
            index === self.findIndex(m => m._id.toString() === member._id.toString())
        );

        // Combine all collaborators
        const allCollaborators = [...directCollaborators, ...uniqueTeamMembers];

        res.status(200).json(allCollaborators);
    } catch (error) {
        console.error("Error fetching project collaborators:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get available users to add as collaborators to a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of available users or error message
 */
export async function getAvailableCollaborators(req, res) {
    try {
        const projectId = req.params.id;
        const currentUserId = req.user._id.toString();

        const project = await Project.findById(projectId)
            .populate('collaborators.user', '_id')
            .populate({
                path: 'teams',
                populate: {
                    path: 'members.user',
                    select: '_id'
                }
            });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check if user has permission to manage collaborators
        const canManage = project.owner.toString() === currentUserId ||
                         project.collaborators.some(collab => 
                             collab.user._id.toString() === currentUserId && 
                             ['manager', 'admin'].includes(collab.role)
                         ) ||
                         req.user.role === 'admin';

        if (!canManage) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Get all existing collaborator IDs (direct + team members)
        const existingCollaboratorIds = new Set();
        
        // Add direct collaborators
        project.collaborators.forEach(collab => {
            existingCollaboratorIds.add(collab.user._id.toString());
        });

        // Add team members
        if (project.teams && project.teams.length > 0) {
            project.teams.forEach(team => {
                if (team.members && team.members.length > 0) {
                    team.members.forEach(member => {
                        existingCollaboratorIds.add(member.user._id.toString());
                    });
                }
            });
        }

        // Add project owner
        existingCollaboratorIds.add(project.owner.toString());

        // Get all users except existing collaborators
        const availableUsers = await User.find({
            _id: { $nin: Array.from(existingCollaboratorIds) },
            role: { $ne: 'admin' } // Optionally exclude admins
        }).select('firstname lastname email username');

        res.status(200).json(availableUsers);
    } catch (error) {
        console.error("Error fetching available collaborators:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
