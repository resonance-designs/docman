/*
 * @name TeamSettingsPage
 * @file /docman/frontend/src/pages/TeamSettingsPage.jsx
 * @page TeamSettingsPage
 * @description Team settings page for managing team configuration and preferences
 * @version 2.2.0
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Link } from "react-router";
import { 
    ArrowLeft, 
    Save, 
    Trash2, 
    Users, 
    Shield, 
    AlertTriangle 
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmationModal from "../components/modals/ConfirmationModal";

const TeamSettingsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        isPrivate: false,
        allowExternalSharing: false,
        notificationsEnabled: true
    });
    const [userRole, setUserRole] = useState(null);
    const [isOwner, setIsOwner] = useState(false);

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
            
            // Store user ID to check ownership
            const userId = decoded?._id;
            if (userId && team) {
                setIsOwner(team.owner === userId || (team.owner && team.owner._id === userId));
            }
        }
    }, [team]);

    // Fetch team data
    useEffect(() => {
        const fetchTeam = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get(`/teams/${id}`, { headers });
                setTeam(res.data);
                
                // Initialize form data with team settings
                setFormData({
                    name: res.data.name || "",
                    description: res.data.description || "",
                    isPrivate: res.data.settings?.isPrivate || false,
                    allowExternalSharing: res.data.settings?.allowExternalSharing || false,
                    notificationsEnabled: res.data.settings?.notificationsEnabled !== false // default to true
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
                console.error("Error fetching team:", error);
                toast.error("Failed to load team settings");
                navigate("/teams");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchTeam();
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

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            // Prepare settings object
            const updatedTeam = {
                name: formData.name,
                description: formData.description,
                settings: {
                    isPrivate: formData.isPrivate,
                    allowExternalSharing: formData.allowExternalSharing,
                    notificationsEnabled: formData.notificationsEnabled
                }
            };
            
            await api.put(`/teams/${id}`, updatedTeam, { headers });
            toast.success("Team settings updated successfully");
        } catch (error) {
            console.error("Error updating team settings:", error);
            toast.error("Failed to update team settings");
        } finally {
            setSaving(false);
        }
    };

    // Handle team deletion
    const handleDeleteTeam = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            await api.delete(`/teams/${id}`, { headers });
            toast.success("Team deleted successfully");
            navigate("/teams");
        } catch (error) {
            console.error("Error deleting team:", error);
            toast.error("Failed to delete team");
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
                                message="Loading team settings..." 
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
                                    You don't have permission to edit this team's settings.
                                </p>
                                <Link
                                    to={`/teams/${id}`}
                                    className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                >
                                    <ArrowLeft size={16} className="mr-2" />
                                    Back to Team
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
                            to={`/teams/${id}`}
                            className="mr-4 p-2 rounded-full hover:bg-base-300 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-bold">Team Settings</h1>
                    </div>

                    {/* Settings Form */}
                    <div className="bg-base-200 rounded-lg p-8 shadow-md">
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-6">
                                {/* Basic Information */}
                                <div>
                                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                                        <Users size={20} className="mr-2 text-resdes-blue" />
                                        Basic Information
                                    </h2>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium mb-1">
                                                Team Name
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

                                {/* Privacy Settings */}
                                <div>
                                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                                        <Shield size={20} className="mr-2 text-resdes-green" />
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
                                                Private Team (Only visible to members)
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
                                                Allow External Sharing (Members can share with non-members)
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Notification Settings */}
                                <div>
                                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                                        <Shield size={20} className="mr-2 text-resdes-orange" />
                                        Notification Settings
                                    </h2>
                                    <div className="space-y-4">
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
                                                Enable Team Notifications
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
                            Deleting this team will remove all associated data and cannot be undone.
                        </p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="btn bg-red-600 text-white hover:bg-red-700"
                        >
                            <Trash2 size={16} className="mr-2" />
                            Delete Team
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <ConfirmationModal
                    title="Delete Team"
                    message={`Are you sure you want to delete the team "${team.name}"? This action cannot be undone and all team data will be lost.`}
                    confirmText="Delete Team"
                    cancelText="Cancel"
                    confirmButtonClass="btn bg-red-600 text-white hover:bg-red-700"
                    onConfirm={handleDeleteTeam}
                    onCancel={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
};

export default TeamSettingsPage;