/*
 * @name AddMembersModal
 * @file /docman/frontend/src/components/teams/AddMembersModal.jsx
 * @component AddMembersModal
 * @description Modal component for adding existing users to a team
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { XIcon, UserPlusIcon, SearchIcon, UsersIcon } from "lucide-react";
import api from "../../lib/axios";
import toast from "react-hot-toast";

const AddMembersModal = ({ isOpen, onClose, teamId, onMemberAdded, currentMembers = [] }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedRole, setSelectedRole] = useState('member');

    // Get current member user IDs for filtering
    const currentMemberIds = currentMembers.map(member => member.user._id);

    // Fetch all users when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSelectedUsers([]);
            setSearchTerm('');
            setSelectedRole('member');
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await api.get("/users", {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Filter out users who are already team members
            const allUsers = response.data.users || [];
            const availableUsers = allUsers.filter(user => 
                !currentMemberIds.includes(user._id)
            );
            
            setUsers(availableUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleUserToggle = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAll = () => {
        const filteredUsers = getFilteredUsers();
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(user => user._id));
        }
    };

    const getFilteredUsers = () => {
        return users.filter(user => {
            if (!searchTerm) return true;
            const searchLower = searchTerm.toLowerCase();
            return (
                user.firstname?.toLowerCase().includes(searchLower) ||
                user.lastname?.toLowerCase().includes(searchLower) ||
                user.email?.toLowerCase().includes(searchLower) ||
                user.username?.toLowerCase().includes(searchLower)
            );
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (selectedUsers.length === 0) {
            toast.error("Please select at least one user to add");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            
            // Add each selected user to the team
            const promises = selectedUsers.map(userId => 
                api.post(`/teams/${teamId}/members`, {
                    userId,
                    role: selectedRole
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            );

            await Promise.all(promises);
            
            toast.success(`Successfully added ${selectedUsers.length} member(s) to the team`);
            onMemberAdded();
            onClose();
        } catch (error) {
            console.error("Error adding members:", error);
            toast.error(error.response?.data?.message || "Failed to add members");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredUsers = getFilteredUsers();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <UserPlusIcon className="h-6 w-6 text-resdes-blue" />
                        <h2 className="text-xl font-semibold text-gray-900">Add Members to Team</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <XIcon className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 flex-1 overflow-y-auto">
                        {/* Role Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Role for new members
                            </label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resdes-blue focus:border-transparent"
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                            <p className="text-sm text-gray-500 mt-1">
                                {selectedRole === 'admin' 
                                    ? 'Admins can manage team settings and invite other members'
                                    : 'Members can view team content and collaborate on projects'
                                }
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="mb-4">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search users by name, email, or username..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resdes-blue focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Select All */}
                        {filteredUsers.length > 0 && (
                            <div className="mb-4">
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-sm text-resdes-blue hover:text-resdes-blue hover:underline"
                                >
                                    {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                                    {filteredUsers.length > 0 && ` (${filteredUsers.length})`}
                                </button>
                            </div>
                        )}

                        {/* Users List */}
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-resdes-blue mx-auto"></div>
                                    <p className="text-gray-500 mt-2">Loading users...</p>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center py-8">
                                    <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        {searchTerm ? 'No users found' : 'No available users'}
                                    </h3>
                                    <p className="text-gray-500">
                                        {searchTerm 
                                            ? 'Try adjusting your search criteria'
                                            : 'All users are already members of this team'
                                        }
                                    </p>
                                </div>
                            ) : (
                                filteredUsers.map((user) => (
                                    <div
                                        key={user._id}
                                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                            selectedUsers.includes(user._id)
                                                ? 'bg-resdes-blue bg-opacity-10 border-resdes-blue'
                                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                        onClick={() => handleUserToggle(user._id)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user._id)}
                                            onChange={() => handleUserToggle(user._id)}
                                            className="h-4 w-4 text-resdes-blue focus:ring-resdes-blue border-gray-300 rounded mr-3"
                                        />
                                        <div className="h-10 w-10 bg-resdes-blue rounded-full flex items-center justify-center mr-3">
                                            <span className="text-white font-medium text-sm">
                                                {user.firstname?.[0]?.toUpperCase()}{user.lastname?.[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-gray-900">
                                                {user.firstname} {user.lastname}
                                            </h4>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                            {user.username && (
                                                <p className="text-xs text-gray-400">@{user.username}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Selected Count */}
                        {selectedUsers.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-resdes-blue"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || selectedUsers.length === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-resdes-blue border border-transparent rounded-lg hover:bg-resdes-blue hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-resdes-blue disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                                    Adding...
                                </>
                            ) : (
                                `Add ${selectedUsers.length} Member${selectedUsers.length !== 1 ? 's' : ''}`
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMembersModal;