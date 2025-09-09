/*
 * @name InviteMemberModal
 * @file /docman/frontend/src/components/teams/InviteMemberModal.jsx
 * @component InviteMemberModal
 * @description Modal component for inviting new members to teams with role assignment
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import { useState } from "react";
import { XIcon, MailIcon } from "lucide-react";
import PropTypes from "prop-types";
import api from "../../lib/axios";
import toast from "react-hot-toast";

/**
 * Modal component for inviting members to a team
 * @param {Object} props - Component properties
 * @param {string} props.teamId - ID of the team to invite member to
 * @param {Function} props.onClose - Function called when modal should be closed
 * @param {Function} props.onMemberInvited - Function called when member is successfully invited
 * @returns {JSX.Element} The invite member modal component
 */
const InviteMemberModal = ({ teamId, onClose, onMemberInvited }) => {
    const [formData, setFormData] = useState({
        email: "",
        role: "member"
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

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            newErrors.email = "Please enter a valid email address";
        }

        if (!["member", "admin"].includes(formData.role)) {
            newErrors.role = "Please select a valid role";
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

            await api.post(`/teams/${teamId}/invite`, {
                email: formData.email.trim().toLowerCase(),
                role: formData.role
            }, { headers });

            onMemberInvited();
        } catch (error) {
            console.error("Error inviting member:", error);
            
            if (error.response?.status === 409) {
                if (error.response.data.message.includes("already a team member")) {
                    setErrors({ email: "This user is already a team member" });
                } else if (error.response.data.message.includes("already sent")) {
                    setErrors({ email: "An invitation has already been sent to this email" });
                } else {
                    setErrors({ email: error.response.data.message });
                }
            } else if (error.response?.status === 403) {
                toast.error("You don't have permission to invite members");
            } else if (error.response?.data?.message) {
                setErrors({ email: error.response.data.message });
            } else {
                toast.error("Failed to send invitation");
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
                    <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
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
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MailIcon className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-resdes-blue ${
                                        errors.email ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Enter email address"
                                    disabled={loading}
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                            )}
                        </div>

                        {/* Role */}
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                                Role *
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-resdes-blue ${
                                    errors.role ? 'border-red-500' : 'border-gray-300'
                                }`}
                                disabled={loading}
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                            {errors.role && (
                                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Members can view and contribute to projects. Admins can manage team settings and invite others.
                            </p>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800">
                            An invitation email will be sent to this address. The user will need to accept the invitation to join the team.
                        </p>
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
                            disabled={loading || !formData.email.trim()}
                        >
                            {loading ? "Sending..." : "Send Invitation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

InviteMemberModal.propTypes = {
    teamId: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onMemberInvited: PropTypes.func.isRequired
};

export default InviteMemberModal;
