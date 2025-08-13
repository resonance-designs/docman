// backend/src/controllers/projectsController.js
import Project from "../models/Project.js";
import Team from "../models/Team.js";
import Doc from "../models/Doc.js";
import { 
    validateName, 
    sanitizeString 
} from "../lib/validation.js";

// Get projects for a team
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
        const filter = { team: teamId };

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
            .populate('collaborators.user', 'firstname lastname email')
            .populate('documents', 'title reviewDate')
            .sort(sortObj);

        res.status(200).json(projects);
    } catch (error) {
        console.error("Error fetching team projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Get user's projects across all teams
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
            .populate('team', 'name')
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

// Get project by ID
export async function getProjectById(req, res) {
    try {
        const projectId = req.params.id;
        const userId = req.user._id.toString();

        const project = await Project.findById(projectId)
            .populate('team', 'name')
            .populate('owner', 'firstname lastname email')
            .populate('collaborators.user', 'firstname lastname email')
            .populate('documents');

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check if user has access to this project
        const team = await Team.findById(project.team._id);
        const hasTeamAccess = team && team.isMember(userId);
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

// Create new project
export async function createProject(req, res) {
    try {
        const { name, description, teamId, status, priority, startDate, endDate, tags } = req.body;
        const userId = req.user._id.toString();

        // Validation
                const validationErrors = [];

                if (!name) {
                    validationErrors.push("Project name is required");
                } else {
                    const nameValidationError = validateName(name, "Project name");
                    if (nameValidationError) {
                        validationErrors.push(nameValidationError);
                    }
                }

        if (!teamId) {
            validationErrors.push("Team ID is required");
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Check if team exists and user has access
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        if (!team.isMember(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Create project
        const projectData = {
            name: sanitizeString(name),
            description: description ? sanitizeString(description) : undefined,
            team: teamId,
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

        // Populate the response
        const populatedProject = await Project.findById(newProject._id)
            .populate('team', 'name')
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

// Update project
export async function updateProject(req, res) {
    try {
        const projectId = req.params.id;
        const userId = req.user._id.toString();
        const { name, description, status, priority, startDate, endDate, tags, settings } = req.body;

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
            const nameValidationError = validateName(name, "Project name");
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
        .populate('team', 'name')
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

// Delete project
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

// Add collaborator to project
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

        // Check if user exists and is team member
        const team = await Team.findById(project.team);
        if (!team.isMember(collaboratorId)) {
            return res.status(400).json({ message: "User must be a team member" });
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

// Remove collaborator from project
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

// Add document to project
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

// Remove document from project
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
