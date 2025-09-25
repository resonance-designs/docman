/*
 * @name TeamCard
 * @file /docman/frontend/src/components/teams/TeamCard.jsx
 * @component TeamCard
 * @description Team card component displaying team info, member count, project count, and management actions
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { UsersIcon, FolderIcon, MoreVerticalIcon, EditIcon, TrashIcon, UserPlusIcon } from "lucide-react";
import PropTypes from "prop-types";
import api from "../../lib/axios";
import toast from "react-hot-toast";
import { useConfirmationContext } from "../../context/ConfirmationContext";
import { decodeJWT } from "../../lib/utils";

/**
 * Team card component for displaying team information with actions
 * @param {Object} props - Component properties
 * @param {Object} props.team - Team object containing team data
 * @param {Function} props.onTeamDeleted - Function called when team is deleted
 * @returns {JSX.Element} The team card component
 */
const TeamCard = ({ team, onTeamDeleted }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const { confirm } = useConfirmationContext();

    /**
     * Get current user info from token when component mounts
     */
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setCurrentUser(decoded);
            setUserRole(decoded?.role);
        }
    }, []);

    /**
     * Handle team deletion with confirmation
     */
    const handleDeleteTeam = async () => {
        confirm({
            title: "Delete Team",
            message: `Are you sure you want to delete "${team.name}"? This action cannot be undone.`,
            actionName: "Delete",
            onConfirm: async () => {
                setLoading(true);
                try {
                    const token = localStorage.getItem("token");
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};

                    await api.delete(`/teams/${team._id}`, { headers });
                    onTeamDeleted(team._id);
                } catch (error) {
                    console.error("Error deleting team:", error);
                    toast.error("Failed to delete team");
                } finally {
                    setLoading(false);
                    setShowMenu(false);
                }
            }
        });
    };

    // Check if current user is the team owner or has admin/superadmin privileges
    const isOwner = team.owner && currentUser && team.owner._id === currentUser.id;
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const canManageTeam = isOwner || isAdmin;
    
    const memberCount = team.memberCount || team.members?.length || 0;
    const projectCount = team.projectCount || 0;

    return (
        <div className="bg-base-100 rounded-lg shadow-md border-2 border-resdes-orange hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="p-6 border-b-2 border-resdes-orange">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <Link
                            to={`/teams/${team._id}`}
                            className="text-xl font-semibold text-base hover:text-resdes-blue"
                        >
                            {team.name}
                        </Link>
                        {team.description && (
                            <p className="text-base mt-1 text-sm line-clamp-2">
                                {team.description}
                            </p>
                        )}
                    </div>

                    {/* Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 rounded-full hover:bg-gray-100"
                            disabled={loading}
                        >
                            <MoreVerticalIcon size={16} className="text-gray-500" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                <div className="py-1">
                                    <Link
                                        to={`/teams/${team._id}/edit`}
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={() => setShowMenu(false)}
                                    >
                                        <EditIcon size={14} className="mr-2" />
                                        Edit Team
                                    </Link>
                                    <Link
                                        to={`/teams/${team._id}/invite`}
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={() => setShowMenu(false)}
                                    >
                                        <UserPlusIcon size={14} className="mr-2" />
                                        Invite Members
                                    </Link>
                                    {canManageTeam && (
                                        <button
                                            onClick={handleDeleteTeam}
                                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                            disabled={loading}
                                        >
                                            <TrashIcon size={14} className="mr-2" />
                                            Delete Team
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="p-6">
                <h3 className="font-semibold text-base mb-2">Members</h3>
                <div className="flex items-center justify-between text-sm text-base">
                    <div className="flex items-center">
                        <UsersIcon size={16} className="mr-1" />
                        <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center">
                        <FolderIcon size={16} className="mr-1" />
                        <span>{projectCount} project{projectCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Owner */}
                {team.owner && (
                    <div className="mt-4 pt-4 border-t border-base-300">
                        <p className="text-sm font-semibold text-base mb-1">Owner</p>
                        <a href={`mailto:${team.owner.email}`} className="text-xs underline text-resdes-teal">{team.owner.firstname} {team.owner.lastname}</a>
                    </div>
                )}

                {/* Recent Members */}
                {team.members && team.members.filter(member => member.user).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-base-300">
                        <p className="text-sm font-semibold text-base mb-2">Recent Members</p>
                        <div className="flex -space-x-2">
                            {team.members.slice(0, 4).filter(member => member.user).map((member, index) => (
                                <div
                                    key={member.user._id || index}
                                    className="w-8 h-8 rounded-full bg-resdes-blue text-white text-xs flex items-center justify-center border-2 border-white"
                                    title={`${member.user.firstname} ${member.user.lastname}`}
                                >
                                    {member.user.firstname?.[0]}{member.user.lastname?.[0]}
                                </div>
                            ))}
                            {team.members.filter(member => member.user).length > 4 && (
                                <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center border-2 border-white">
                                    +{team.members.filter(member => member.user).length - 4}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6">
                <Link
                    to={`/teams/${team._id}`}
                    className="w-full btn bg-resdes-blue text-white hover:bg-resdes-blue hover:opacity-80"
                >
                    View Team
                </Link>
            </div>

            {/* Click outside to close menu */}
            {showMenu && (
                <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
};

TeamCard.propTypes = {
    team: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        owner: PropTypes.shape({
            _id: PropTypes.string,
            firstname: PropTypes.string,
            lastname: PropTypes.string
        }),
        members: PropTypes.arrayOf(PropTypes.shape({
            user: PropTypes.shape({
                _id: PropTypes.string,
                firstname: PropTypes.string,
                lastname: PropTypes.string
            }),
            role: PropTypes.string
        })),
        memberCount: PropTypes.number,
        projectCount: PropTypes.number
    }).isRequired,
    onTeamDeleted: PropTypes.func.isRequired
};

export default TeamCard;
