/*
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { FolderIcon, ArrowLeftIcon, CalendarIcon, TagIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";

const EditProjectPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        teamId: "",
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

        if (userRole === "editor" || userRole === "admin") {
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
                
                setFormData({
                    name: project.name || "",
                    description: project.description || "",
                    teamId: project.team?._id || project.team || "",
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

        if (!formData.teamId) {
            newErrors.teamId = "Please select a team";
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
                teamId: formData.teamId,
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
                    if (err.includes("name")) {
                        serverErrors.name = err;
                    } else if (err.includes("team")) {
                        serverErrors.teamId = err;
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

    if (userRole !== "editor" && userRole !== "admin") {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="max-w-screen-xl mx-auto">
                        <div className="text-center py-8">
                            <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                            <p className="text-gray-500">
                                You need editor or admin privileges to edit projects.
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
                        Loading project...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center space-x-4 mb-6">
                        <button 
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeftIcon size={20} className="text-gray-600" />
                        </button>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <FolderIcon className="size-8 text-resdes-orange" />
                            Edit Project
                        </h1>
                    </div>

                    {/* Form */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-200">
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-6">
                                {/* Project Name */}
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Project Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-resdes-blue ${
                                            errors.name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter project name"
                                        disabled={loading}
                                        maxLength={100}
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                    )}
                                </div>

                                {/* Team Selection */}
                                <div>
                                    <label htmlFor="teamId" className="block text-sm font-medium text-gray-700 mb-1">
                                        Team *
                                    </label>
                                    {teamsLoading ? (
                                        <div className="text-sm text-gray-500">Loading teams...</div>
                                    ) : (
                                        <select
                                            id="teamId"
                                            name="teamId"
                                            value={formData.teamId}
                                            onChange={handleChange}
                                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-resdes-blue ${
                                                errors.teamId ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            disabled={loading}
                                        >
                                            <option value="">Select a team</option>
                                            {teams.map(team => (
                                                <option key={team._id} value={team._id}>
                                                    {team.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {errors.teamId && (
                                        <p className="mt-1 text-sm text-red-600">{errors.teamId}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={4}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-resdes-blue ${
                                            errors.description ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Optional project description"
                                        disabled={loading}
                                        maxLength={1000}
                                    />
                                    {errors.description && (
                                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        {formData.description.length}/1000 characters
                                    </p>
                                </div>

                                {/* Status and Priority */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                            Status
                                        </label>
                                        <select
                                            id="status"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-resdes-blue"
                                            disabled={loading}
                                        >
                                            <option value="active">Active</option>
                                            <option value="on-hold">On Hold</option>
                                            <option value="completed">Completed</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                                            Priority
                                        </label>
                                        <select
                                            id="priority"
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-resdes-blue"
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
                                    <div>
                                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                                            <CalendarIcon size={14} className="inline mr-1" />
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            id="startDate"
                                            name="startDate"
                                            value={formData.startDate}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-resdes-blue"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                                            <CalendarIcon size={14} className="inline mr-1" />
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            id="endDate"
                                            name="endDate"
                                            value={formData.endDate}
                                            onChange={handleChange}
                                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-resdes-blue ${
                                                errors.endDate ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            disabled={loading}
                                        />
                                        {errors.endDate && (
                                            <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                                        <TagIcon size={14} className="inline mr-1" />
                                        Tags
                                    </label>
                                    <input
                                        type="text"
                                        id="tags"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-resdes-blue"
                                        placeholder="Enter tags separated by commas"
                                        disabled={loading}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Separate multiple tags with commas (e.g., "frontend, urgent, client-work")
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-resdes-blue rounded-md hover:bg-resdes-blue hover:opacity-80 disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProjectPage;