/*
 * @name TeamsPage
 * @file /docman/frontend/src/pages/TeamsPage.jsx
 * @page TeamsPage
 * @description Team management page displaying user teams with creation, editing, and member management capabilities
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Users as UsersIcon, Plus as PlusIcon, Settings } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import TeamCard from "../components/teams/TeamCard";
import CreateTeamModal from "../components/teams/CreateTeamModal";

const TeamsPage = () => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
        }
    }, []);

    // Fetch user's teams
    useEffect(() => {
        const fetchTeams = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get("/teams/my-teams", { headers });
                setTeams(res.data);
            } catch (error) {
                console.error("Error fetching teams:", error);
                toast.error("Failed to load teams");
            } finally {
                setLoading(false);
            }
        };

        if (userRole === "editor" || userRole === "admin" || userRole === "superadmin") {
            fetchTeams();
        } else {
            setLoading(false);
        }
    }, [userRole]);

    // Check if user can create teams (editor, admin, or superadmin)
    const canCreateTeam = userRole === "editor" || userRole === "admin" || userRole === "superadmin";

    const handleTeamCreated = (newTeam) => {
        setTeams(prev => [newTeam, ...prev]);
        setShowCreateModal(false);
        toast.success("Team created successfully!");
    };

    const handleTeamDeleted = (teamId) => {
        setTeams(prev => prev.filter(team => team._id !== teamId));
        toast.success("Team deleted successfully!");
    };

    if (!canCreateTeam) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="max-w-screen-xl mx-auto">
                        <div className="text-center py-8">
                            <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Teams Access Restricted</h3>
                            <p className="text-gray-500">
                                You need editor, admin, or superadmin privileges to access teams functionality.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
                            <UsersIcon className="size-8 text-resdes-orange" />
                            My Teams
                        </h1>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                        >
                            <PlusIcon size={16} />
                            Create Team
                        </button>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center text-resdes-teal py-10">
                            <LoadingSpinner 
                                message="Loading teams..." 
                                size="lg" 
                                color="purple" 
                            />
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && teams.length === 0 && (
                        <div className="text-center py-8">
                            <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
                            <p className="text-gray-500 mb-4">
                                Create your first team to start collaborating with others.
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                            >
                                <PlusIcon size={16} />
                                Create First Team
                            </button>
                        </div>
                    )}

                    {/* Teams Grid */}
                    {!loading && teams.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teams.map((team) => (
                                <TeamCard 
                                    key={team._id} 
                                    team={team} 
                                    onTeamDeleted={handleTeamDeleted}
                                />
                            ))}
                        </div>
                    )}

                    {/* Admin Link */}
                    {(userRole === "admin" || userRole === "superadmin") && (
                        <div className="mt-8 text-center">
                            <Link
                                to="/admin/teams"
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Settings size={16} className="mr-2" />
                                Manage All Teams
                            </Link>
                        </div>
                    )}

                    {/* Create Team Modal */}
                    {showCreateModal && (
                        <CreateTeamModal
                            onClose={() => setShowCreateModal(false)}
                            onTeamCreated={handleTeamCreated}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamsPage;
