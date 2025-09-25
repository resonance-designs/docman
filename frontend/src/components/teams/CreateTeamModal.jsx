/*
 * @name CreateTeamModal
 * @file /docman/frontend/src/components/teams/CreateTeamModal.jsx
 * @component CreateTeamModal
 * @description Modal component for creating new teams with form validation and member invitation
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import { useState } from "react";
import { XIcon } from "lucide-react";
import PropTypes from "prop-types";
import api from "../../lib/axios";
import toast from "react-hot-toast";

/**
 * Modal component for creating new teams
 * @param {Object} props - Component properties
 * @param {Function} props.onClose - Function called when modal should be closed
 * @param {Function} props.onTeamCreated - Function called when team is successfully created
 * @returns {JSX.Element} The create team modal component
 */
const CreateTeamModal = ({ onClose, onTeamCreated }) => {
    const [formData, setFormData] = useState({
        name: "",
        description: ""
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    /**
     * Handle form input changes and clear related errors
     * @param {Event} e - Input change event
     */
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

    /**
     * Validate form data and set errors
     * @returns {boolean} True if form is valid
     */
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

    /**
     * Handle form submission to create new team
     * @param {Event} e - Form submit event
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await api.post("/teams", {
                name: formData.name.trim(),
                description: formData.description.trim() || undefined
            }, { headers });

            onTeamCreated(response.data.team);
        } catch (error) {
            console.error("Error creating team:", error);

            if (error.response?.status === 409) {
                setErrors({ name: "You already have a team with this name" });
            } else if (error.response?.data?.errors) {
                const serverErrors = {};
                error.response.data.errors.forEach(err => {
                    if (err.includes("name")) {
                        serverErrors.name = err;
                    } else if (err.includes("description")) {
                        serverErrors.description = err;
                    }
                });
                setErrors(serverErrors);
            } else {
                toast.error("Failed to create team");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Create New Team</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        disabled={loading}
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
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
                                rows={3}
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
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-resdes-blue rounded-md hover:bg-resdes-blue hover:opacity-80 disabled:opacity-50"
                            disabled={loading || !formData.name.trim()}
                        >
                            {loading ? "Creating..." : "Create Team"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

CreateTeamModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onTeamCreated: PropTypes.func.isRequired
};

export default CreateTeamModal;
