/*
 * @name Project Card Component
 * @file /docman/frontend/src/components/projects/ProjectCard.jsx
 * @component ProjectCard
 * @description Project card component displaying project summary, status, priority, and quick actions
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useState } from "react";
import { Link } from "react-router";
import {
    FolderIcon,
    FileTextIcon,
    UsersIcon,
    MoreVerticalIcon,
    EditIcon,
    TrashIcon,
    CalendarIcon,
    AlertCircleIcon
} from "lucide-react";
import PropTypes from "prop-types";
import api from "../../lib/axios";
import toast from "react-hot-toast";
import { useConfirmationContext } from "../../context/ConfirmationContext";

/**
 * Project card component for displaying project information with actions
 * @param {Object} props - Component properties
 * @param {Object} props.project - Project object containing project data
 * @param {Function} [props.onProjectDeleted] - Function called when project is deleted
 * @returns {JSX.Element} The project card component
 */
const ProjectCard = ({ project, onProjectDeleted }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(false);
    const { confirm } = useConfirmationContext();

    /**
     * Handle project deletion with confirmation
     */
    const handleDeleteProject = async () => {
        confirm({
            title: "Delete Project",
            message: `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
            actionName: "Delete",
            onConfirm: async () => {
                setLoading(true);
                try {
                    const token = localStorage.getItem("token");
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};

                    await api.delete(`/projects/${project._id}`, { headers });
                    if (onProjectDeleted) {
                        onProjectDeleted(project._id);
                    }
                } catch (error) {
                    console.error("Error deleting project:", error);
                    toast.error("Failed to delete project");
                } finally {
                    setLoading(false);
                    setShowMenu(false);
                }
            }
        });
    };

    /**
     * Get CSS classes for status badge based on project status
     * @param {string} status - Project status
     * @returns {string} CSS classes for status styling
     */
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            case 'on-hold': return 'bg-yellow-100 text-yellow-800';
            case 'archived': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Get CSS classes for priority text color based on project priority
     * @param {string} priority - Project priority level
     * @returns {string} CSS classes for priority styling
     */
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return 'text-red-600';
            case 'high': return 'text-orange-600';
            case 'medium': return 'text-yellow-600';
            case 'low': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    /**
     * Get priority icon for high priority projects
     * @param {string} priority - Project priority level
     * @returns {JSX.Element|null} Priority icon or null for low priority
     */
    const getPriorityIcon = (priority) => {
        if (priority === 'critical' || priority === 'high') {
            return <AlertCircleIcon size={14} className={getPriorityColor(priority)} />;
        }
        return null;
    };

    const documentCount = project.documentCount || project.documents?.length || 0;
    const collaboratorCount = project.collaboratorCount || project.collaborators?.length || 0;
    const isOverdue = project.endDate && new Date(project.endDate) < new Date();

    return (
        <div className="bg-base-100 rounded-lg shadow-md border-2 border-resdes-orange hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="p-6 border-b-2 border-resdes-orange">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                            <Link 
                                to={`/projects/${project._id}`}
                                className="text-xl font-semibold text-base hover:text-resdes-blue"
                            >
                                {project.name}
                            </Link>
                            {getPriorityIcon(project.priority)}
                        </div>
                        
                        {project.description && (
                            <p className="text-base mt-1 text-sm line-clamp-2 mb-3">
                                {project.description}
                            </p>
                        )}

                        {/* Status and Priority */}
                        <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                {project.status}
                            </span>
                            <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
                                {project.priority} priority
                            </span>
                        </div>
                    </div>
                    
                    {/* Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 rounded-full hover:bg-gray-100"
                            disabled={loading}
                        >
                            <MoreVerticalIcon size={16} className="text-gray-500" />
                        </button>
                        
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                <div className="py-1">
                                    <Link
                                        to={`/projects/${project._id}/edit`}
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={() => setShowMenu(false)}
                                    >
                                        <EditIcon size={14} className="mr-2" />
                                        Edit Project
                                    </Link>
                                    <button
                                        onClick={handleDeleteProject}
                                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                        disabled={loading}
                                    >
                                        <TrashIcon size={14} className="mr-2" />
                                        Delete Project
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="p-6">
                <h3 className="font-semibold text-base mb-2">Project Details</h3>
                <div className="flex items-center justify-between text-sm text-base">
                    <div className="flex items-center">
                        <FileTextIcon size={16} className="mr-1" />
                        <span>{documentCount} document{documentCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center">
                        <UsersIcon size={16} className="mr-1" />
                        <span>{collaboratorCount} member{collaboratorCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Dates */}
                {(project.startDate || project.endDate) && (
                    <div className="mt-4 pt-4 border-t border-base-300">
                        {project.startDate && (
                            <div className="flex items-center text-xs text-base mb-1">
                                <CalendarIcon size={12} className="mr-1" />
                                Started: {new Date(project.startDate).toLocaleDateString()}
                            </div>
                        )}
                        {project.endDate && (
                            <div className={`flex items-center text-xs mb-1 ${isOverdue ? 'text-red-600' : 'text-base'}`}>
                                <CalendarIcon size={12} className="mr-1" />
                                Due: {new Date(project.endDate).toLocaleDateString()}
                                {isOverdue && <span className="ml-1 font-medium">(Overdue)</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* Team */}
                {project.team && (
                    <div className="mt-4 pt-4 border-t border-base-300">
                        <p className="text-sm font-semibold text-base mb-1">Team</p>
                        <Link 
                            to={`/teams/${project.team._id || project.team}`}
                            className="text-xs underline text-resdes-teal"
                        >
                            {project.team.name || 'View Team'}
                        </Link>
                    </div>
                )}

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-base-300">
                        <p className="text-sm font-semibold text-base mb-2">Tags</p>
                        <div className="flex flex-wrap gap-1">
                            {project.tags.slice(0, 3).map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                    {tag}
                                </span>
                            ))}
                            {project.tags.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    +{project.tags.length - 3}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6">
                <Link
                    to={`/projects/${project._id}`}
                    className="w-full btn bg-resdes-blue text-white hover:bg-resdes-blue hover:opacity-80"
                >
                    View Project
                </Link>
            </div>

            {/* Click outside to close menu */}
            {showMenu && (
                <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
};

ProjectCard.propTypes = {
    project: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        status: PropTypes.string,
        priority: PropTypes.string,
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        team: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({
                _id: PropTypes.string,
                name: PropTypes.string
            })
        ]),
        documents: PropTypes.array,
        collaborators: PropTypes.array,
        documentCount: PropTypes.number,
        collaboratorCount: PropTypes.number,
        tags: PropTypes.arrayOf(PropTypes.string)
    }).isRequired,
    onProjectDeleted: PropTypes.func
};

export default ProjectCard;
