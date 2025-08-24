/*
 * @name EditTeamPage
 * @file /docman/frontend/src/pages/EditTeamPage.jsx
 * @page EditTeamPage
 * @description Team editing page for updating team information and managing member roles
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { UsersIcon, ArrowLeftIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";

const EditTeamPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        name: "",
        description: ""
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [userRole, setUserRole] = useState(null);
    const [teamLoading, setTeamLoading] = useState(true);

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
        }
    }, []);

    // Fetch team details
    useEffect(() => {
        const fetchTeam = async () => {
            setTeamLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get(`/teams/${id}`, { headers });
                const team = res.data;
                
                setFormData({
                    name: team.name || "",
                    description: team.description || ""
                });
            } catch (error) {
                console.error("Error fetching team:", error);
                toast.error("Failed to load team");
                navigate("/teams");
            } finally {
                setTeamLoading(false);
            }
        };

        if (id) {
            fetchTeam();
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
            newErrors.name = "Team name is required";
        } else if (formData.name.trim().length < 2) {
            newErrors.name = "Team name must be at least 2 characters";
        } else if (formData.name.trim().length > 100) {
            newErrors.name = "Team name cannot exceed 100 characters";
        }

        if (formData.description && formData.description.length > 500) {
            newErrors.description = "Description cannot exceed 500 characters";
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

            const response = await api.put(`/teams/${id}`, {
                name: formData.name.trim(),
                description: formData.description.trim() || undefined
            }, { headers });

            toast.success("Team updated successfully!");
            navigate(`/teams/${id}`);
        } catch (error) {
            console.error("Error updating team:", error);
            
            if (error.response?.data?.errors) {
                const serverErrors = {};
                error.response.data.errors.forEach(err => {
                    if (err.includes("name")) {
                        serverErrors.name = err;
                    }
                });
                setErrors(serverErrors);
            } else {
                toast.error("Failed to update team");
            }
        } finally {
            setLoading(false);
        }
    };

    if (userRole !== "editor" && userRole !== "admin" && userRole !== "superadmin") {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="max-w-screen-xl mx-auto">
                        <div className="text-center py-8">
                            <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                            <p className="text-gray-500">
                                You need editor, admin, or superadmin privileges to edit teams.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (teamLoading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="text-center text-resdes-teal py-10">
                        <LoadingSpinner 
                            message="Loading team..." 
                            size="lg" 
                            color="purple" 
                        />
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
                            <UsersIcon className="size-8 text-resdes-orange" />
                            Edit Team
                        </h1>
                    </div>

                    {/* Form */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-200">
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-6">
                                {/* Team Name */}
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Team Name *
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
                                        placeholder="Enter team name"
                                        disabled={loading}
                                        maxLength={100}
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
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
                                        placeholder="Optional team description"
                                        disabled={loading}
                                        maxLength={500}
                                    />
                                    {errors.description && (
                                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        {formData.description.length}/500 characters
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

export default EditTeamPage;