/*
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
    UsersIcon,
    FolderIcon,
    UserPlusIcon,
    SettingsIcon,
    ArrowLeftIcon,
    MoreVerticalIcon,
    EditIcon,
    TrashIcon
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import ProjectCard from "../components/projects/ProjectCard";
import InviteMemberModal from "../components/teams/InviteMemberModal";

const TeamDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [team, setTeam] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showMemberMenu, setShowMemberMenu] = useState({});

    // Get current user from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setCurrentUser(decoded);
        }
    }, []);

    // Fetch team details
    useEffect(() => {
        const fetchTeam = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get(`/teams/${id}`, { headers });
                setTeam(res.data);
            } catch (error) {
                console.error("Error fetching team:", error);
                if (error.response?.status === 404) {
                    toast.error("Team not found");
                    navigate("/teams");
                } else if (error.response?.status === 403) {
                    toast.error("Access denied");
                    navigate("/teams");
                } else {
                    toast.error("Failed to load team");
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchTeam();
        }
    }, [id, navigate]);

    // Fetch team projects
    useEffect(() => {
        const fetchProjects = async () => {
            setProjectsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get(`/projects/team/${id}`, { headers });
                setProjects(res.data);
            } catch (error) {
                console.error("Error fetching projects:", error);
                toast.error("Failed to load projects");
            } finally {
                setProjectsLoading(false);
            }
        };

        if (id) {
            fetchProjects();
        }
    }, [id]);

    const handleMemberInvited = () => {
        setShowInviteModal(false);
        toast.success("Invitation sent successfully!");
        // Refresh team data to get updated invitations
        window.location.reload();
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await api.delete(`/teams/${id}/members/${memberId}`, { headers });

            // Update team state
            setTeam(prev => ({
                ...prev,
                members: prev.members.filter(member => member.user._id !== memberId)
            }));

            toast.success("Member removed successfully");
        } catch (error) {
            console.error("Error removing member:", error);
            toast.error("Failed to remove member");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="text-center text-resdes-teal py-10">
                        Loading team...
                    </div>
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="text-center py-8">
                        <p className="text-gray-500 text-lg">Team not found.</p>
                        <Link to="/teams" className="btn bg-resdes-blue text-white mt-4">
                            Back to Teams
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const isOwner = team.owner && currentUser && team.owner._id === currentUser.id;
    const isAdmin = team.members?.some(member => 
        member.user._id === currentUser?.id && member.role === 'admin'
    );
    const canManageTeam = isOwner || isAdmin || currentUser?.role === 'admin';
    const canInvite = canManageTeam || team.settings?.allowMemberInvites;

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                            <Link 
                                to="/teams"
                                className="p-2 rounded-full hover:bg-gray-100"
                            >
                                <ArrowLeftIcon size={20} className="text-gray-600" />
                            </Link>
                            <div>
                                <h1 className="text-4xl font-bold flex items-center gap-2">
                                    <UsersIcon className="size-8 text-resdes-orange" />
                                    {team.name}
                                </h1>
                                {team.description && (
                                    <p className="text-gray-600 mt-1">{team.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            {canInvite && (
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                >
                                    <UserPlusIcon size={16} />
                                    Invite Members
                                </button>
                            )}
                            {canManageTeam && (
                                <Link
                                    to={`/teams/${id}/settings`}
                                    className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                                >
                                    <SettingsIcon size={16} />
                                    Settings
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <UsersIcon className="h-8 w-8 text-resdes-blue" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Members</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {team.members?.length || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <FolderIcon className="h-8 w-8 text-resdes-green" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Projects</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {projects.length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="h-8 w-8 bg-resdes-orange rounded flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">
                                        {team.owner?.firstname?.[0]}{team.owner?.lastname?.[0]}
                                    </span>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Owner</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {team.owner?.firstname} {team.owner?.lastname}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Tabs */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8 px-6">
                                <button className="border-b-2 border-resdes-blue text-resdes-blue py-4 px-1 text-sm font-medium">
                                    Projects
                                </button>
                                <button className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 py-4 px-1 text-sm font-medium">
                                    Members
                                </button>
                            </nav>
                        </div>

                        {/* Projects Tab Content */}
                        <div className="p-6">
                            {projectsLoading ? (
                                <div className="text-center text-resdes-teal py-10">
                                    Loading projects...
                                </div>
                            ) : projects.length === 0 ? (
                                <div className="text-center py-8">
                                    <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                                    <p className="text-gray-500 mb-4">
                                        Create your first project to start organizing documents.
                                    </p>
                                    <Link
                                        to={`/projects/create?team=${id}`}
                                        className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                    >
                                        Create Project
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {projects.map((project) => (
                                        <ProjectCard key={project._id} project={project} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Invite Modal */}
                    {showInviteModal && (
                        <InviteMemberModal
                            teamId={id}
                            onClose={() => setShowInviteModal(false)}
                            onMemberInvited={handleMemberInvited}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamDetailPage;
