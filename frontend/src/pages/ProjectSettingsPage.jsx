/*
 * @name ProjectSettingsPage
 * @file /docman/frontend/src/pages/ProjectSettingsPage.jsx
 * @page ProjectSettingsPage
 * @description Project settings page for managing project configuration and preferences
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Link } from "react-router";
import { 
    ArrowLeft, 
    Save, 
    Trash2, 
    Folder as FolderIcon, 
    Shield, 
    AlertTriangle, 
    Calendar, 
    Tag 
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmationModal from "../components/modals/ConfirmationModal";

const ProjectSettingsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "active",
        priority: "medium",
        dueDate: "",
        isPrivate: false,
        allowExternalSharing: false,
        notificationsEnabled: true,
        tags: []
    });
    const [userRole, setUserRole] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [newTag, setNewTag] = useState("");

    // Status options
    const statusOptions = ["active", "completed", "on-hold", "cancelled"];
    
    // Priority options
    const priorityOptions = ["low", "medium", "high", "critical"];

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
            
            // Store user ID to check ownership
            const userId = decoded?._id;
            if (userId && project) {
                setIsOwner(project.owner === userId || (project.owner && project.owner._id === userId));
            }
        }
    }, [project]);

    // Fetch project data
    useEffect(() => {
        const fetchProject = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get(`/projects/${id}`, { headers });
                setProject(res.data);
                
                // Format date for input field if it exists
                let formattedDueDate = "";
                if (res.data.dueDate) {
                    const date = new Date(res.data.dueDate);
                    formattedDueDate = date.toISOString().split('T')[0];
                }
                
                // Initialize form data with project settings
                setFormData({
                    name: res.data.name || "",
                    description: res.data.description || "",
                    status: res.data.status || "active",
                    priority: res.data.priority || "medium",
                    dueDate: formattedDueDate,
                    isPrivate: res.data.settings?.isPrivate || false,
                    allowExternalSharing: res.data.settings?.allowExternalSharing || false,
                    notificationsEnabled: res.data.settings?.notificationsEnabled !== false, // default to true
                    tags: res.data.tags || []
                });
                
                // Check if user is owner
                const token2 = localStorage.getItem("token");
                if (token2) {
                    const decoded = decodeJWT(token2);
                    const userId = decoded?._id;
                    if (userId) {
                        setIsOwner(res.data.owner === userId || (res.data.owner && res.data.owner._id === userId));
                    }
                }
            } catch (error) {
                console.error("Error fetching project:", error);
                toast.error("Failed to load project settings");
                navigate("/projects");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProject();
        }
    }, [id, navigate]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    // Handle adding a new tag
    const handleAddTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()]
            }));
            setNewTag("");
        }
    };

    // Handle removing a tag
    const handleRemoveTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            // Prepare project update object
            const updatedProject = {
                name: formData.name,
                description: formData.description,
                status: formData.status,
                priority: formData.priority,
                dueDate: formData.dueDate || null,
                tags: formData.tags,
                settings: {
                    isPrivate: formData.isPrivate,
                    allowExternalSharing: formData.allowExternalSharing,
                    notificationsEnabled: formData.notificationsEnabled
                }
            };
            
            await api.put(`/projects/${id}`, updatedProject, { headers });
            toast.success("Project settings updated successfully");
        } catch (error) {
            console.error("Error updating project settings:", error);
            toast.error("Failed to update project settings");
        } finally {
            setSaving(false);
        }
    };

    // Handle project deletion
    const handleDeleteProject = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            await api.delete(`/projects/${id}`, { headers });
            toast.success("Project deleted successfully");
            navigate("/projects");
        } catch (error) {
            console.error("Error deleting project:", error);
            toast.error("Failed to delete project");
        }
    };

    // Check if user has permission to edit
    const canEdit = userRole === "admin" || userRole === "superadmin" || isOwner;

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center text-resdes-teal py-10">
                            <LoadingSpinner 
                                message="Loading project settings..." 
                                size="lg" 
                                color="purple" 
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!canEdit) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-base-200 rounded-lg p-8 shadow-md">
                            <div className="text-center py-8">
                                <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                                <p className="text-gray-500 mb-4">
                                    You don't have permission to edit this project's settings.
                                </p>
                                <Link
                                    to={`/projects/${id}`}
                                    className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                >
                                    <ArrowLeft size={16} className="mr-2" />
                                    Back to Project
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center mb-6">
                        <Link
                            to={`/projects/${id}`}
                            className="mr-4 p-2 rounded-full hover:bg-base-300 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-bold">Project Settings</h1>
                    </div>

                    {/* Settings Form */}
                    <div className="bg-base-200 rounded-lg p-8 shadow-md">
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-6">
                                {/* Basic Information */}
                                <div>
                                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                                        <FolderIcon size={20} className="mr-2 text-resdes-blue" />
                                        Basic Information
                                    </h2>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium mb-1">
                                                Project Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-teal"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="description" className="block text-sm font-medium mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                id="description"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows={4}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-teal"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Project Details */}
                                <div>
                                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                                        <Calendar size={20} className="mr-2 text-resdes-green" />
                                        Project Details
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="status" className="block text-sm font-medium mb-1">
                                                Status
                                            </label>
                                            <select
                                                id="status"
                                                name="status"
                                                value={formData.status}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-teal"
                                            >
                                                {statusOptions.map(option => (
                                                    <option key={option} value={option}>
                                                        {option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="priority" className="block text-sm font-medium mb-1">
                                                Priority
                                            </label>
                                            <select
                                                id="priority"
                                                name="priority"
                                                value={formData.priority}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-teal"
                                            >
                                                {priorityOptions.map(option => (
                                                    <option key={option} value={option}>
                                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="dueDate" className="block text-sm font-medium mb-1">
                                                Due Date (Optional)
                                            </label>
                                            <input
                                                type="date"
                                                id="dueDate"
                                                name="dueDate"
                                                value={formData.dueDate}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-teal"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                                        <Tag size={20} className="mr-2 text-resdes-orange" />
                                        Tags
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="flex">
                                            <input
                                                type="text"
                                                value={newTag}
                                                onChange={(e) => setNewTag(e.target.value)}
                                                placeholder="Add a tag"
                                                className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-resdes-teal"
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddTag();
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddTag}
                                                className="px-4 py-2 bg-resdes-teal text-white rounded-r-md hover:bg-resdes-teal hover:opacity-80"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.tags.map((tag, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center bg-resdes-blue/20 text-resdes-blue px-3 py-1 rounded-full"
                                                >
                                                    <span>{tag}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="ml-2 text-resdes-blue hover:text-resdes-blue/75"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                            {formData.tags.length === 0 && (
                                                <p className="text-sm text-gray-500">No tags added yet</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Privacy Settings */}
                                <div>
                                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                                        <Shield size={20} className="mr-2 text-resdes-purple" />
                                        Privacy Settings
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="isPrivate"
                                                name="isPrivate"
                                                checked={formData.isPrivate}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-resdes-teal focus:ring-resdes-teal border-gray-300 rounded"
                                            />
                                            <label htmlFor="isPrivate" className="ml-2 block text-sm">
                                                Private Project (Only visible to collaborators)
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="allowExternalSharing"
                                                name="allowExternalSharing"
                                                checked={formData.allowExternalSharing}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-resdes-teal focus:ring-resdes-teal border-gray-300 rounded"
                                            />
                                            <label htmlFor="allowExternalSharing" className="ml-2 block text-sm">
                                                Allow External Sharing (Collaborators can share with non-members)
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="notificationsEnabled"
                                                name="notificationsEnabled"
                                                checked={formData.notificationsEnabled}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-resdes-teal focus:ring-resdes-teal border-gray-300 rounded"
                                            />
                                            <label htmlFor="notificationsEnabled" className="ml-2 block text-sm">
                                                Enable Project Notifications
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                    >
                                        {saving ? (
                                            <>
                                                <LoadingSpinner size="sm" color="white" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} className="mr-2" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Danger Zone */}
                    <div className="mt-8 bg-red-50 rounded-lg p-6 border border-red-200">
                        <h2 className="text-xl font-semibold mb-4 flex items-center text-red-600">
                            <AlertTriangle size={20} className="mr-2" />
                            Danger Zone
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Deleting this project will remove all associated data and cannot be undone.
                        </p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="btn bg-red-600 text-white hover:bg-red-700"
                        >
                            <Trash2 size={16} className="mr-2" />
                            Delete Project
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <ConfirmationModal
                    title="Delete Project"
                    message={`Are you sure you want to delete the project "${project.name}"? This action cannot be undone and all project data will be lost.`}
                    confirmText="Delete Project"
                    cancelText="Cancel"
                    confirmButtonClass="btn bg-red-600 text-white hover:bg-red-700"
                    onConfirm={handleDeleteProject}
                    onCancel={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
};

export default ProjectSettingsPage;