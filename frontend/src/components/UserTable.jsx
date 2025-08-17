/*
 * @name User Table Component
 * @file /docman/frontend/src/components/UserTable.jsx
 * @component UserTable
 * @description Component for displaying a user in a table row with actions.
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */

import { EyeIcon, Trash2Icon, EditIcon } from "lucide-react";
import { formatDate } from "../lib/utils";
import api from "../lib/axios";
import toast from "react-hot-toast";

import { useUserRole } from "../hooks";
import { Link } from "react-router";
import PropTypes from "prop-types";

/**
 * Component for displaying a user in a table row with actions
 * @param {Object} props - Component properties
 * @param {Object} props.user - User object to display
 * @param {Function} props.setUsers - Function to update the users list
 * @returns {JSX.Element} The user table row component
 */
const UserTable = ({ user, setUsers }) => {
    const { userId: currentUserId, isAdmin } = useUserRole();

    /**
     * Handle user deletion
     * @param {Object} e - Event object from button click
     * @param {string} id - ID of the user to delete
     */
    const handleDelete = async (e, id) => {
        e.preventDefault(); // get rid of the navigation behavior

        // Prevent users from deleting themselves
        if (id === currentUserId) {
            toast.error("You cannot delete your own account");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/users/${id}`);
            setUsers((prev) => prev.filter((u) => u._id !== id)); // get rid of the deleted one
            toast.success("User deleted successfully");
        } catch (error) {
            console.log("Error in handleDelete", error);
            toast.error("Failed to delete user");
        }
    };

    /**
     * Helper function to format user name
     * @param {Object} user - User object with firstname and lastname properties
     * @returns {string} Formatted full name of the user
     */
    const getFullName = (user) => {
        return `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Unknown User';
    };

    /**
     * Helper function to format role with badge styling
     * @param {string} role - User role
     * @returns {JSX.Element} Badge element with appropriate styling for the role
     */
    const getRoleBadge = (role) => {
        const roleColors = {
            admin: 'badge-error',
            editor: 'badge-warning', 
            viewer: 'badge-info'
        };
        return (
            <span className={`badge ${roleColors[role] || 'badge-neutral'} capitalize`}>
                {role || 'unknown'}
            </span>
        );
    };

    const isCurrentUser = user._id === currentUserId;

    return (
        <tr className="bg-base-100 p-4 border-b border-resdes-orange text-base-content text-sm antialiased font-normal leading-normal">
            <td className="p-4">
                <p className="block font-semibold leading-normal">
                    {getFullName(user)}
                    {isCurrentUser && <span className="ml-2 text-xs text-resdes-teal">(You)</span>}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {user.email}
                </p>
            </td>
            <td className="p-4">
                {getRoleBadge(user.role)}
            </td>
            <td className="p-4">
                <p className="block">
                    {formatDate(new Date(user.createdAt))}
                </p>
            </td>
            <td className="p-4 flex items-center gap-1 float-right">
                <div className="flex items-center gap-1">
                    <Link
                        to={`/user/${user._id}`}
                        className="btn btn-ghost btn-xs text-resdes-teal"
                        title="View User"
                    >
                        <EyeIcon className="size-4" />
                    </Link>
                    {isAdmin && (
                        <Link
                            to={`/edit-user/${user._id}`}
                            className="btn btn-ghost btn-xs text-resdes-teal"
                            title="Edit User"
                        >
                            <EditIcon className="size-4" />
                        </Link>
                    )}
                    {isAdmin && !isCurrentUser && (
                        <button
                            className="btn btn-ghost btn-xs text-resdes-teal"
                            onClick={(e) => handleDelete(e, user._id)}
                            title="Delete User"
                        >
                            <Trash2Icon className="size-4" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

UserTable.propTypes = {
    user: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        firstname: PropTypes.string,
        lastname: PropTypes.string,
        email: PropTypes.string.isRequired,
        role: PropTypes.string.isRequired,
        createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    }).isRequired,
    setUsers: PropTypes.func.isRequired,
};

export default UserTable;
