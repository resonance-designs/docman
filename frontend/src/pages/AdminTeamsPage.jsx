/*
 * @name AdminTeamsPage
 * @file /docman/frontend/src/pages/AdminTeamsPage.jsx
 * @page AdminTeamsPage
 * @description Admin page for managing all teams in the system
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import { 
    ArrowLeft, 
    Search, 
    Users, 
    Edit, 
    Trash2, 
    Plus, 
    Shield 
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import CreateTeamModal from "../components/teams/CreateTeamModal";

const AdminTeamsPage = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [userRole, setUserRole] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState(null);

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
            
            // Redirect if not admin
            if (decoded?.role !== "admin") {
                toast.error("You don't have permission to access this page");
                navigate("/teams");
            }
        } else {
            navigate("/login");
        }
    }, [navigate]);

    // Fetch all teams
    useEffect(() => {
        const fetchTeams = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get("/teams", { headers });
                setTeams(res.data);
                setFilteredTeams(res.data);
            } catch (error) {
                console.error("Error fetching teams:", error);
                toast.error("Failed to load teams");
            } finally {
                setLoading(false);
            }
        };

        if (userRole === "admin") {
            fetchTeams();
        }
    }, [userRole]);

    // Handle search
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredTeams(teams);
        } else {
            const filtered = teams.filter(team => 
                team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (team.owner?.firstname && team.owner.firstname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (team.owner?.lastname && team.owner.lastname.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setFilteredTeams(filtered);
        }
    }, [searchTerm, teams]);

    // Handle team creation
    const handleTeamCreated = (newTeam) => {
        setTeams(prev => [newTeam, ...prev]);
        setShowCreateModal(false);
        toast.success("Team created successfully!");
    };

    // Handle team deletion
    const handleDeleteTeam = async () => {
        if (!teamToDelete) return;
        
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            await api.delete(`/teams/${teamToDelete._id}`, { headers });
            setTeams(prev => prev.filter(team => team._id !== teamToDelete._id));
            toast.success("Team deleted successfully");
        } catch (error) {
            console.error("Error deleting team:", error);
            toast.error("Failed to delete team");
        } finally {
            setTeamToDelete(null);
        }
    };

    if (userRole !== "admin") {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center text-resdes-teal py-10">
                            <LoadingSpinner 
                                message="Checking permissions..." 
                                size="lg" 
                                color="purple" 
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center mb-6">
                        <Link
                            to="/teams"
                            className="mr-4 p-2 rounded-full hover:bg-base-300 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-bold flex items-center">
                            <Shield className="mr-2 text-resdes-orange" size={28} />
                            Admin: Manage All Teams
                        </h1>
                    </div>

                    {/* Search and Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div className="relative w-full md:w-96">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search teams..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-teal"
                            />
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                        >
                            <Plus size={16} className="mr-2" />
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
                    {!loading && filteredTeams.length === 0 && (
                        <div className="text-center py-8 bg-base-200 rounded-lg p-8">
                            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
                            <p className="text-gray-500 mb-4">
                                {searchTerm ? "No teams match your search criteria." : "There are no teams in the system yet."}
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80 mr-4"
                                >
                                    Clear Search
                                </button>
                            )}
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                            >
                                <Plus size={16} className="mr-2" />
                                Create Team
                            </button>
                        </div>
                    )}

                    {/* Teams Table */}
                    {!loading && filteredTeams.length > 0 && (
                        <div className="bg-base-200 rounded-lg overflow-hidden shadow-md">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Team Name
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Owner
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Members
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Privacy
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Created
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredTeams.map((team) => (
                                            <tr key={team._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-resdes-blue/20 rounded-full flex items-center justify-center">
                                                            <Users size={18} className="text-resdes-blue" />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                <Link to={`/teams/${team._id}`} className="hover:text-resdes-blue">
                                                                    {team.name}
                                                                </Link>
                                                            </div>
                                                            {team.description && (
                                                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                                                    {team.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {team.owner?.firstname && team.owner?.lastname ? (
                                                            <Link to={`/user/${team.owner._id || team.owner}`} className="hover:text-resdes-blue">
                                                                {team.owner.firstname} {team.owner.lastname}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-gray-500">Unknown</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {team.members?.length || 0} members
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${team.settings?.isPrivate ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                        {team.settings?.isPrivate ? 'Private' : 'Public'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(team.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <Link
                                                        to={`/teams/${team._id}/settings`}
                                                        className="text-resdes-teal hover:text-resdes-teal/75 mr-4"
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => setTeamToDelete(team)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Team Modal */}
            {showCreateModal && (
                <CreateTeamModal
                    onClose={() => setShowCreateModal(false)}
                    onTeamCreated={handleTeamCreated}
                />
            )}

            {/* Delete Confirmation Modal */}
            {teamToDelete && (
                <ConfirmationModal
                    title="Delete Team"
                    message={`Are you sure you want to delete the team "${teamToDelete.name}"? This action cannot be undone and all team data will be lost.`}
                    confirmText="Delete Team"
                    cancelText="Cancel"
                    confirmButtonClass="btn bg-red-600 text-white hover:bg-red-700"
                    onConfirm={handleDeleteTeam}
                    onCancel={() => setTeamToDelete(null)}
                />
            )}
        </div>
    );
};

export default AdminTeamsPage;