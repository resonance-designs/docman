/*
 * @name AddCollaboratorModal
 * @file /docman/frontend/src/components/projects/AddCollaboratorModal.jsx
 * @component AddCollaboratorModal
 * @description Modal component for adding collaborators to a project
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */

import { useState, useEffect } from 'react';
import { XIcon, SearchIcon, UserPlusIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

const AddCollaboratorModal = ({ isOpen, onClose, projectId, onCollaboratorAdded }) => {
    const [availableUsers, setAvailableUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Fetch available users when modal opens
    useEffect(() => {
        if (isOpen && projectId) {
            fetchAvailableUsers();
        }
    }, [isOpen, projectId]);

    // Filter users based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredUsers(availableUsers);
        } else {
            const filtered = availableUsers.filter(user =>
                `${user.firstname} ${user.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.username?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, availableUsers]);

    const fetchAvailableUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await api.get(`/projects/${projectId}/available-collaborators`, { headers });
            setAvailableUsers(response.data);
        } catch (error) {
            console.error("Error fetching available users:", error);
            toast.error("Failed to load available users");
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAll = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(user => user._id));
        }
    };

    const handleSubmit = async () => {
        if (selectedUsers.length === 0) {
            toast.error("Please select at least one user to add");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            // Add each selected user as a collaborator
            const promises = selectedUsers.map(userId =>
                api.post(`/projects/${projectId}/collaborators`, {
                    collaboratorId: userId,
                    role: 'contributor'
                }, { headers })
            );

            await Promise.all(promises);

            toast.success(`${selectedUsers.length} collaborator(s) added successfully`);
            onCollaboratorAdded();
            handleClose();
        } catch (error) {
            console.error("Error adding collaborators:", error);
            toast.error("Failed to add collaborators");
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSearchTerm('');
        setSelectedUsers([]);
        setAvailableUsers([]);
        setFilteredUsers([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">Add Collaborators</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <XIcon size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 border-b">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-blue"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-resdes-blue mx-auto"></div>
                            <p className="text-gray-500 mt-2">Loading users...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-8">
                            <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-gray-500">
                                {searchTerm ? 'No users found matching your search.' : 'No users available to add.'}
                            </p>
                        </div>
                    ) : (
                        <div>
                            {/* Select All */}
                            <div className="flex items-center mb-4 p-3 bg-gray-50 rounded-lg">
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                    onChange={handleSelectAll}
                                    className="mr-3"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Select All ({filteredUsers.length} users)
                                </span>
                            </div>

                            {/* User List */}
                            <div className="space-y-2">
                                {filteredUsers.map((user) => (
                                    <div
                                        key={user._id}
                                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                            selectedUsers.includes(user._id)
                                                ? 'bg-resdes-blue bg-opacity-10 border-resdes-blue'
                                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                        onClick={() => handleUserSelect(user._id)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user._id)}
                                            onChange={() => handleUserSelect(user._id)}
                                            className="mr-3"
                                        />
                                        <div className="h-10 w-10 bg-resdes-blue rounded-full flex items-center justify-center mr-3">
                                            <span className="text-white font-bold text-sm">
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
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                    <div className="text-sm text-gray-500">
                        {selectedUsers.length > 0 && (
                            <span>{selectedUsers.length} user(s) selected</span>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={selectedUsers.length === 0 || submitting}
                            className="px-4 py-2 bg-resdes-green text-slate-900 rounded-md hover:bg-resdes-green hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Adding...' : `Add ${selectedUsers.length} Collaborator${selectedUsers.length !== 1 ? 's' : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddCollaboratorModal;