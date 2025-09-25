/*
 * @name EditProjectPage
 * @file /docman/frontend/src/pages/EditProjectPage.jsx
 * @page EditProjectPage
 * @description Project editing page for updating project details, status, and team members
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { FolderIcon, ArrowLeftIcon, CalendarIcon, TagIcon, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import { ensureArray } from "../lib/safeUtils";
import LoadingSpinner from "../components/LoadingSpinner";
import InlineLoader from "../components/InlineLoader";

const EditProjectPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        teamIds: [],
        status: "active",
        priority: "medium",
        startDate: "",
        endDate: "",
        tags: ""
    });
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [teamsLoading, setTeamsLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [userRole, setUserRole] = useState(null);
    const [projectLoading, setProjectLoading] = useState(true);

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
        }
    }, []);

    // Fetch user's teams
    useEffect(() => {
        const fetchTeams = async () => {
            setTeamsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get("/teams/my-teams", { headers });
                setTeams(res.data);
            } catch (error) {
                console.error("Error fetching teams:", error);
                toast.error("Failed to load teams");
            } finally {
                setTeamsLoading(false);
            }
        };

        if (userRole === "editor" || userRole === "admin" || userRole === "superadmin") {
            fetchTeams();
        } else {
            setTeamsLoading(false);
        }
    }, [userRole]);

    // Fetch project details
    useEffect(() => {
        const fetchProject = async () => {
            setProjectLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get(`/projects/${id}`, { headers });
                const project = res.data;
                
                // Handle both single team (legacy) and multiple teams (new format)
                let teamIds = [];
                if (project.teams && Array.isArray(project.teams)) {
                    // New format with multiple teams
                    teamIds = project.teams.map(team => typeof team === 'object' ? team._id : team);
                } else if (project.team) {
                    // Legacy format with single team
                    teamIds = [typeof project.team === 'object' ? project.team._id : project.team];
                }
                
                setFormData({
                    name: project.name || "",
                    description: project.description || "",
                    teamIds: teamIds,
                    status: project.status || "active",
                    priority: project.priority || "medium",
                    startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
                    endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
                    tags: project.tags ? project.tags.join(', ') : ""
                });
            } catch (error) {
                console.error("Error fetching project:", error);
                toast.error("Failed to load project");
                navigate("/projects");
            } finally {
                setProjectLoading(false);
            }
        };

        if (id) {
            fetchProject();
        }
    }, [id, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) {
            newErrors.name = "Project name is required";
        } else if (formData.name.trim().length < 2) {
            newErrors.name = "Project name must be at least 2 characters";
        } else if (formData.name.trim().length > 100) {
            newErrors.name = "Project name cannot exceed 100 characters";
        }

        if (!formData.teamIds || formData.teamIds.length === 0) {
            newErrors.teamIds = "Please select at least one team";
        }

        if (formData.description && formData.description.length > 1000) {
            newErrors.description = "Description cannot exceed 1000 characters";
        }

        if (formData.startDate && formData.endDate) {
            const startDate = new Date(formData.startDate);
            const endDate = new Date(formData.endDate);
            if (endDate <= startDate) {
                newErrors.endDate = "End date must be after start date";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const projectData = {
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                teamIds: formData.teamIds,
                status: formData.status,
                priority: formData.priority,
                startDate: formData.startDate || undefined,
                endDate: formData.endDate || undefined,
                tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : undefined
            };

            const response = await api.put(`/projects/${id}`, projectData, { headers });

            toast.success("Project updated successfully!");
            navigate(`/projects/${response.data.project._id}`);
        } catch (error) {
            console.error("Error updating project:", error);
            
            if (error.response?.data?.errors) {
                const serverErrors = {};
                error.response.data.errors.forEach(err => {
                    // Convert error to string if it's not already a string
                    const errorMessage = typeof err === 'string' ? err : err.message || String(err);

                    if (errorMessage.toLowerCase().includes("name")) {
                        serverErrors.name = errorMessage;
                    } else if (errorMessage.toLowerCase().includes("team")) {
                        serverErrors.teamIds = errorMessage;
                    }
                });
                setErrors(serverErrors);
            } else {
                toast.error("Failed to update project");
            }
        } finally {
            setLoading(false);
        }
    };

    // Helper functions for team management
    const getTeamById = (teamId) => teams.find(team => team._id === teamId);

    const getAvailableTeams = () => {
        const safeTeams = ensureArray(teams);
        const safeSelectedTeamIds = ensureArray(formData.teamIds);
        return safeTeams.filter(team => !safeSelectedTeamIds.includes(team._id));
    };

    const handleTeamAdd = (teamId) => {
        if (teamId && !formData.teamIds.includes(teamId)) {
            setFormData(prev => ({
                ...prev,
                teamIds: [...prev.teamIds, teamId]
            }));
            
            // Clear team error when user adds a team
            if (errors.teamIds) {
                setErrors(prev => ({
                    ...prev,
                    teamIds: ""
                }));
            }
        }
    };

    const handleTeamRemove = (teamId) => {
        setFormData(prev => ({
            ...prev,
            teamIds: prev.teamIds.filter(id => id !== teamId)
        }));
    };

    if (userRole !== "editor" && userRole !== "admin" && userRole !== "superadmin") {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="max-w-screen-xl mx-auto">
                        <div className="text-center py-8">
                            <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                            <p className="text-gray-500">
                                You need editor, admin, or superadmin privileges to edit projects.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (projectLoading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="text-center text-resdes-teal py-10">
                        <LoadingSpinner 
                            message="Loading project..." 
                            size="lg" 
                            color="green" 
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
                            <FolderIcon className="size-8 text-resdes-orange" />
                            Edit Project
                        </h1>
                    </div>
                    <Link to="/projects" className="btn btn-ghost mb-4">
                        <ArrowLeftIcon />
                        Back To Projects
                    </Link>

                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                            <div className="space-y-6">
                                {/* Project Name */}
                                <div className="form-control">
                                    <label className="label" htmlFor="name">
                                        <span className="label-text">Project Name *</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        placeholder="Enter project name"
                                        disabled={loading}
                                        maxLength={100}
                                    />
                                    {errors.name && (
                                        <p className="text-red-500 mt-1">{errors.name}</p>
                                    )}
                                </div>

                                {/* Team Selection */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Teams *</span>
                                    </label>
                                    <p className="text-sm text-gray-600 mb-2">
                                        Select teams that will be assigned to this project
                                    </p>
                                    
                                    {teamsLoading ? (
                                        <InlineLoader message="Loading teams..." size="xs" color="teal" />
                                    ) : (
                                        <>
                                            {/* Team Selection Dropdown */}
                                            <select 
                                                className="select select-bordered mb-3"
                                                value=""
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleTeamAdd(e.target.value);
                                                        e.target.value = ""; // Reset selection
                                                    }
                                                }}
                                                disabled={loading}
                                            >
                                                <option value="">Add a team...</option>
                                                {getAvailableTeams().map((team) => (
                                                    <option key={team._id} value={team._id}>
                                                        {team.name}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Selected Teams Chips */}
                                            <div className="flex flex-wrap gap-2">
                                                {ensureArray(formData.teamIds).map((teamId) => {
                                                    const team = getTeamById(teamId);
                                                    if (!team) return null;
                                                    
                                                    return (
                                                        <div 
                                                            key={teamId} 
                                                            className="badge badge-primary gap-2 p-3"
                                                        >
                                                            <span>{team.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTeamRemove(teamId)}
                                                                className="btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4"
                                                                disabled={loading}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {formData.teamIds.length === 0 && (
                                                <p className="text-sm text-gray-500 italic">No teams selected</p>
                                            )}
                                        </>
                                    )}
                                    
                                    {errors.teamIds && (
                                        <p className="text-red-500 mt-1">{errors.teamIds}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="form-control">
                                    <label className="label" htmlFor="description">
                                        <span className="label-text">Description</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={4}
                                        className="textarea textarea-bordered"
                                        placeholder="Optional project description"
                                        disabled={loading}
                                        maxLength={1000}
                                    />
                                    {errors.description && (
                                        <p className="text-red-500 mt-1">{errors.description}</p>
                                    )}
                                    <div className="label">
                                        <span className="label-text-alt">
                                            {formData.description.length}/1000 characters
                                        </span>
                                    </div>
                                </div>

                                {/* Status and Priority */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-control">
                                        <label className="label" htmlFor="status">
                                            <span className="label-text">Status</span>
                                        </label>
                                        <select
                                            id="status"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="select select-bordered"
                                            disabled={loading}
                                        >
                                            <option value="active">Active</option>
                                            <option value="on-hold">On Hold</option>
                                            <option value="completed">Completed</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>

                                    <div className="form-control">
                                        <label className="label" htmlFor="priority">
                                            <span className="label-text">Priority</span>
                                        </label>
                                        <select
                                            id="priority"
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleChange}
                                            className="select select-bordered"
                                            disabled={loading}
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-control">
                                        <label className="label" htmlFor="startDate">
                                            <span className="label-text">
                                                <CalendarIcon size={14} className="inline mr-1" />
                                                Start Date
                                            </span>
                                        </label>
                                        <input
                                            type="date"
                                            id="startDate"
                                            name="startDate"
                                            value={formData.startDate}
                                            onChange={handleChange}
                                            className="input input-bordered"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="form-control">
                                        <label className="label" htmlFor="endDate">
                                            <span className="label-text">
                                                <CalendarIcon size={14} className="inline mr-1" />
                                                End Date
                                            </span>
                                        </label>
                                        <input
                                            type="date"
                                            id="endDate"
                                            name="endDate"
                                            value={formData.endDate}
                                            onChange={handleChange}
                                            className="input input-bordered"
                                            disabled={loading}
                                        />
                                        {errors.endDate && (
                                            <p className="text-red-500 mt-1">{errors.endDate}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="form-control">
                                    <label className="label" htmlFor="tags">
                                        <span className="label-text">
                                            <TagIcon size={14} className="inline mr-1" />
                                            Tags
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        id="tags"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        placeholder="Enter tags separated by commas"
                                        disabled={loading}
                                    />
                                    <div className="label">
                                        <span className="label-text-alt">
                                            Separate multiple tags with commas (e.g., "frontend, urgent, client-work")
                                        </span>
                                    </div>
                                </div>
                            </div>

                                {/* Submit Button */}
                                <div className="form-control mt-4">
                                    <button type="submit" className="uppercase font-mono btn bg-resdes-green text-slate-950 hover:bg-resdes-green hover:opacity-[.8] transition-opacity duration-300" disabled={loading || !formData.name.trim() || formData.teamIds.length === 0}>
                                        {loading ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProjectPage;