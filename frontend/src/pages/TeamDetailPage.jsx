/*
 * @name TeamDetailPage
 * @file /docman/frontend/src/pages/TeamDetailPage.jsx
 * @page TeamDetailPage
 * @description Team detail page displaying team members, projects, and collaboration tools
 * @author Richard Bakos
 * @version 2.1.10
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
    TrashIcon,
    SearchIcon,
    BookOpenIcon,
    FileTextIcon,
    CalendarIcon,
    TrendingUpIcon
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import { useConfirmationContext } from "../context/ConfirmationContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ProjectCard from "../components/projects/ProjectCard";
import InviteMemberModal from "../components/teams/InviteMemberModal";
import AddMembersModal from "../components/teams/AddMembersModal";
import TeamBooksTable from "../components/teams/TeamBooksTable";
import TeamDocumentsTable from "../components/teams/TeamDocumentsTable";
import TeamProjectsTable from "../components/teams/TeamProjectsTable";
import MemberCard from "../components/teams/MemberCard";

const TeamDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [team, setTeam] = useState(null);
    const [projects, setProjects] = useState([]);
    const [teamBooks, setTeamBooks] = useState([]);
    const [availableBooks, setAvailableBooks] = useState([]);
    const [selectedTeamBooks, setSelectedTeamBooks] = useState([]);
    const [selectedAvailableBooks, setSelectedAvailableBooks] = useState([]);
    const [teamDocuments, setTeamDocuments] = useState([]);
    const [availableDocuments, setAvailableDocuments] = useState([]);
    const [selectedTeamDocuments, setSelectedTeamDocuments] = useState([]);
    const [selectedAvailableDocuments, setSelectedAvailableDocuments] = useState([]);
    const [teamProjects, setTeamProjects] = useState([]);
    const [availableProjects, setAvailableProjects] = useState([]);
    const [selectedTeamProjects, setSelectedTeamProjects] = useState([]);
    const [selectedAvailableProjects, setSelectedAvailableProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [booksLoading, setBooksLoading] = useState(true);
    const [documentsLoading, setDocumentsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [showMemberMenu, setShowMemberMenu] = useState({});
    const [activeTab, setActiveTab] = useState('Overview');
    const [memberSearchTerm, setMemberSearchTerm] = useState('');

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

    // Fetch team books when Books or Overview tab is active
    useEffect(() => {
        const fetchTeamBooks = async () => {
            if ((activeTab !== 'Books' && activeTab !== 'Overview') || !id) return;
            
            setBooksLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const [teamBooksRes, availableBooksRes] = await Promise.all([
                    api.get(`/teams/${id}/books`, { headers }),
                    api.get(`/teams/${id}/available-books`, { headers })
                ]);

                setTeamBooks(teamBooksRes.data);
                setAvailableBooks(availableBooksRes.data);
            } catch (error) {
                console.error("Error fetching books:", error);
                toast.error("Failed to load books");
            } finally {
                setBooksLoading(false);
            }
        };

        fetchTeamBooks();
    }, [id, activeTab]);

    // Fetch team documents when Documents or Overview tab is active
    useEffect(() => {
        const fetchTeamDocuments = async () => {
            if ((activeTab !== 'Documents' && activeTab !== 'Overview') || !id) return;
            
            setDocumentsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const [teamDocumentsRes, availableDocumentsRes] = await Promise.all([
                    api.get(`/teams/${id}/documents`, { headers }),
                    api.get(`/teams/${id}/available-documents`, { headers })
                ]);

                setTeamDocuments(teamDocumentsRes.data);
                setAvailableDocuments(availableDocumentsRes.data);
            } catch (error) {
                console.error("Error fetching documents:", error);
                toast.error("Failed to load documents");
            } finally {
                setDocumentsLoading(false);
            }
        };

        fetchTeamDocuments();
    }, [id, activeTab]);

    // Fetch team projects when Projects or Overview tab is active
    useEffect(() => {
        const fetchTeamProjects = async () => {
            if ((activeTab !== 'Projects' && activeTab !== 'Overview') || !id) return;

            setProjectsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const [teamProjectsRes, availableProjectsRes] = await Promise.all([
                    api.get(`/teams/${id}/projects`, { headers }),
                    api.get(`/teams/${id}/available-projects`, { headers })
                ]);

                setTeamProjects(teamProjectsRes.data);
                setAvailableProjects(availableProjectsRes.data);
            } catch (error) {
                console.error("Error fetching projects:", error);
                toast.error("Failed to load projects");
            } finally {
                setProjectsLoading(false);
            }
        };

        fetchTeamProjects();
    }, [id, activeTab]);

    const { confirm } = useConfirmationContext();
    
    const handleMemberInvited = () => {
        setShowInviteModal(false);
        toast.success("Invitation sent successfully!");
        // Refresh team data to get updated invitations
        window.location.reload();
    };

    const handleRemoveMember = async (memberId) => {
        const memberToRemove = team?.members?.find(member => member.user && member.user._id === memberId);
        const memberName = memberToRemove ? `${memberToRemove.user.firstname} ${memberToRemove.user.lastname}` : 'this member';
        
        confirm({
            title: "Remove Team Member",
            message: `Are you sure you want to remove ${memberName} from this team?`,
            actionName: "Remove",
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem("token");
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};

                    await api.delete(`/teams/${id}/members/${memberId}`, { headers });

            // Update team state
            setTeam(prev => ({
                ...prev,
                members: prev.members.filter(member => member.user && member.user._id !== memberId)
            }));

            toast.success("Member removed successfully");
                } catch (error) {
                    console.error("Error removing member:", error);
                    toast.error("Failed to remove member");
                }
            }
        });
    };

    const handleMemberAdded = async () => {
        // Refresh team data to get updated member list
        try {
            const token = localStorage.getItem("token");
            const response = await api.get(`/teams/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTeam(response.data);
        } catch (error) {
            console.error("Error refreshing team data:", error);
        }
    };

    // Book management handlers
    const handleTeamBookSelect = (bookId) => {
        setSelectedTeamBooks(prev => 
            prev.includes(bookId) 
                ? prev.filter(id => id !== bookId)
                : [...prev, bookId]
        );
    };

    const handleAvailableBookSelect = (bookId) => {
        setSelectedAvailableBooks(prev => 
            prev.includes(bookId) 
                ? prev.filter(id => id !== bookId)
                : [...prev, bookId]
        );
    };

    const handleTeamBooksSelectAll = (bookIds, selectAll) => {
        if (selectAll) {
            setSelectedTeamBooks(prev => [...new Set([...prev, ...bookIds])]);
        } else {
            setSelectedTeamBooks(prev => prev.filter(id => !bookIds.includes(id)));
        }
    };

    const handleAvailableBooksSelectAll = (bookIds, selectAll) => {
        if (selectAll) {
            setSelectedAvailableBooks(prev => [...new Set([...prev, ...bookIds])]);
        } else {
            setSelectedAvailableBooks(prev => prev.filter(id => !bookIds.includes(id)));
        }
    };

    const handleRemoveBooksFromTeam = async () => {
        if (selectedTeamBooks.length === 0) {
            toast.error("Please select books to remove");
            return;
        }

        confirm({
            title: "Remove Books from Team",
            message: `Are you sure you want to remove ${selectedTeamBooks.length} book(s) from this team?`,
            actionName: "Remove",
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem("token");
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};

                    await api.delete(`/teams/${id}/books`, {
                        headers,
                        data: { bookIds: selectedTeamBooks }
                    });

                    // Move selected books from team to available
                    const removedBooks = teamBooks.filter(book => selectedTeamBooks.includes(book._id));
                    setTeamBooks(prev => prev.filter(book => !selectedTeamBooks.includes(book._id)));
                    setAvailableBooks(prev => [...prev, ...removedBooks]);
                    setSelectedTeamBooks([]);

                    toast.success(`${selectedTeamBooks.length} book(s) removed from team successfully`);
                } catch (error) {
                    console.error("Error removing books from team:", error);
                    toast.error("Failed to remove books from team");
                }
            }
        });
    };

    const handleAddBooksToTeam = async () => {
        if (selectedAvailableBooks.length === 0) {
            toast.error("Please select books to add");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await api.post(`/teams/${id}/books`, {
                bookIds: selectedAvailableBooks
            }, { headers });

            // Move selected books from available to team
            const addedBooks = availableBooks.filter(book => selectedAvailableBooks.includes(book._id));
            setAvailableBooks(prev => prev.filter(book => !selectedAvailableBooks.includes(book._id)));
            setTeamBooks(prev => [...prev, ...addedBooks]);
            setSelectedAvailableBooks([]);

            toast.success(`${selectedAvailableBooks.length} book(s) added to team successfully`);
        } catch (error) {
            console.error("Error adding books to team:", error);
            toast.error("Failed to add books to team");
        }
    };

    // Document management handlers
    const handleTeamDocumentSelect = (documentId) => {
        setSelectedTeamDocuments(prev => 
            prev.includes(documentId) 
                ? prev.filter(id => id !== documentId)
                : [...prev, documentId]
        );
    };

    const handleAvailableDocumentSelect = (documentId) => {
        setSelectedAvailableDocuments(prev => 
            prev.includes(documentId) 
                ? prev.filter(id => id !== documentId)
                : [...prev, documentId]
        );
    };

    const handleTeamDocumentsSelectAll = (documentIds, selectAll) => {
        if (selectAll) {
            setSelectedTeamDocuments(prev => [...new Set([...prev, ...documentIds])]);
        } else {
            setSelectedTeamDocuments(prev => prev.filter(id => !documentIds.includes(id)));
        }
    };

    const handleAvailableDocumentsSelectAll = (documentIds, selectAll) => {
        if (selectAll) {
            setSelectedAvailableDocuments(prev => [...new Set([...prev, ...documentIds])]);
        } else {
            setSelectedAvailableDocuments(prev => prev.filter(id => !documentIds.includes(id)));
        }
    };

    const handleRemoveDocumentsFromTeam = async () => {
        if (selectedTeamDocuments.length === 0) {
            toast.error("Please select documents to remove");
            return;
        }

        confirm({
            title: "Remove Documents from Team",
            message: `Are you sure you want to remove ${selectedTeamDocuments.length} document(s) from this team?`,
            actionName: "Remove",
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem("token");
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};

                    await api.delete(`/teams/${id}/documents`, {
                        headers,
                        data: { documentIds: selectedTeamDocuments }
                    });

                    // Move selected documents from team to available
                    const removedDocuments = teamDocuments.filter(doc => selectedTeamDocuments.includes(doc._id));
                    setTeamDocuments(prev => prev.filter(doc => !selectedTeamDocuments.includes(doc._id)));
                    setAvailableDocuments(prev => [...prev, ...removedDocuments]);
                    setSelectedTeamDocuments([]);

                    toast.success(`${selectedTeamDocuments.length} document(s) removed from team successfully`);
                } catch (error) {
                    console.error("Error removing documents from team:", error);
                    toast.error("Failed to remove documents from team");
                }
            }
        });
    };

    const handleAddDocumentsToTeam = async () => {
        if (selectedAvailableDocuments.length === 0) {
            toast.error("Please select documents to add");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await api.post(`/teams/${id}/documents`, {
                documentIds: selectedAvailableDocuments
            }, { headers });

            // Move selected documents from available to team
            const addedDocuments = availableDocuments.filter(doc => selectedAvailableDocuments.includes(doc._id));
            setAvailableDocuments(prev => prev.filter(doc => !selectedAvailableDocuments.includes(doc._id)));
            setTeamDocuments(prev => [...prev, ...addedDocuments]);
            setSelectedAvailableDocuments([]);

            toast.success(`${selectedAvailableDocuments.length} document(s) added to team successfully`);
        } catch (error) {
            console.error("Error adding documents to team:", error);
            toast.error("Failed to add documents to team");
        }
    };

    // Project management handlers
    const handleTeamProjectSelect = (projectId) => {
        setSelectedTeamProjects(prev => 
            prev.includes(projectId) 
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        );
    };

    const handleAvailableProjectSelect = (projectId) => {
        setSelectedAvailableProjects(prev => 
            prev.includes(projectId) 
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        );
    };

    const handleTeamProjectsSelectAll = (projectIds, selectAll) => {
        if (selectAll) {
            setSelectedTeamProjects(prev => [...new Set([...prev, ...projectIds])]);
        } else {
            setSelectedTeamProjects(prev => prev.filter(id => !projectIds.includes(id)));
        }
    };

    const handleAvailableProjectsSelectAll = (projectIds, selectAll) => {
        if (selectAll) {
            setSelectedAvailableProjects(prev => [...new Set([...prev, ...projectIds])]);
        } else {
            setSelectedAvailableProjects(prev => prev.filter(id => !projectIds.includes(id)));
        }
    };

    const handleRemoveProjectsFromTeam = async () => {
        if (selectedTeamProjects.length === 0) {
            toast.error("Please select projects to remove");
            return;
        }

        confirm({
            title: "Remove Projects from Team",
            message: `Are you sure you want to remove ${selectedTeamProjects.length} project(s) from this team?`,
            actionName: "Remove",
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem("token");
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};

                    await api.delete(`/teams/${id}/projects`, {
                        headers,
                        data: { projectIds: selectedTeamProjects }
                    });

                    // Move selected projects from team to available
                    const removedProjects = teamProjects.filter(project => selectedTeamProjects.includes(project._id));
                    setTeamProjects(prev => prev.filter(project => !selectedTeamProjects.includes(project._id)));
                    setAvailableProjects(prev => [...prev, ...removedProjects]);
                    setSelectedTeamProjects([]);

                    toast.success(`${selectedTeamProjects.length} project(s) removed from team successfully`);
                } catch (error) {
                    console.error("Error removing projects from team:", error);
                    toast.error("Failed to remove projects from team");
                }
            }
        });
    };

    const handleAddProjectsToTeam = async () => {
        if (selectedAvailableProjects.length === 0) {
            toast.error("Please select projects to add");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await api.post(`/teams/${id}/projects`, {
                projectIds: selectedAvailableProjects
            }, { headers });

            // Move selected projects from available to team
            const addedProjects = availableProjects.filter(project => selectedAvailableProjects.includes(project._id));
            setAvailableProjects(prev => prev.filter(project => !selectedAvailableProjects.includes(project._id)));
            setTeamProjects(prev => [...prev, ...addedProjects]);
            setSelectedAvailableProjects([]);

            toast.success(`${selectedAvailableProjects.length} project(s) added to team successfully`);
        } catch (error) {
            console.error("Error adding projects to team:", error);
            toast.error("Failed to add projects to team");
        }
    };

    if (loading) {
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
        member.user && member.user._id === currentUser?.id && member.role === 'admin'
    );
    const canManageTeam = isOwner || isAdmin || currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
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
                    </div>

                    {/* Content Tabs */}
                    <div className="bg-base-100 rounded-lg shadow border border-resdes-orange">
                        <div className="border-b border-resdes-orange">
                            <nav className="-mb-px flex justify-between items-center px-6">
                                <div className="flex space-x-8">
                                    <button
                                        onClick={() => setActiveTab('Overview')}
                                        className={`${
                                            activeTab === 'Overview' ? 'border-b-4 border-resdes-orange text-resdes-orange font-semibold' : 'border-b-4 border-transparent text-base font-semibold hover:opacity-65'
                                        } py-4 px-1 text-sm font-medium`}
                                    >
                                        Overview
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('Members')}
                                        className={`${
                                            activeTab === 'Members'? 'border-b-4 border-resdes-orange text-resdes-orange font-semibold' : 'border-b-4 border-transparent text-base font-semibold hover:opacity-65'
                                        } py-4 px-1 text-sm font-medium`}
                                    >
                                        Members
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('Projects')}
                                        className={`${
                                            activeTab === 'Projects' ? 'border-b-4 border-resdes-orange text-resdes-orange font-semibold' : 'border-b-4 border-transparent text-base font-semibold hover:opacity-65'
                                        } py-4 px-1 text-sm font-medium`}
                                    >
                                        Projects
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('Documents')}
                                        className={`${
                                            activeTab === 'Documents'? 'border-b-4 border-resdes-orange text-resdes-orange font-semibold' : 'border-b-4 border-transparent text-base font-semibold hover:opacity-65'
                                        } py-4 px-1 text-sm font-medium`}
                                    >
                                        Documents
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('Books')}
                                        className={`${
                                            activeTab === 'Books'? 'border-b-4 border-resdes-orange text-resdes-orange font-semibold' : 'border-b-4 border-transparent text-base font-semibold hover:opacity-65'
                                        } py-4 px-1 text-sm font-medium`}
                                    >
                                        Books
                                    </button>
                                </div>
                                {/* Quick Actions */}
                                {canManageTeam && (
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setShowAddMembersModal(true)}
                                            className="flex text-sm items-center justify-center px-2 py-1 bg-resdes-blue text-slate-950 rounded-md hover:bg-resdes-blue hover:opacity-90 transition-colors"
                                        >
                                            <UsersIcon className="h-5 w-5 mr-2" />
                                            Add Members
                                        </button>
                                        {canInvite && (
                                            <button
                                                onClick={() => setShowInviteModal(true)}
                                                className="flex text-sm items-center justify-center px-2 py-1 bg-resdes-green text-slate-950 rounded-md hover:bg-resdes-green hover:opacity-80 transition-colors"
                                            >
                                                <UserPlusIcon className="h-5 w-5 mr-2" />
                                                Invite by Email
                                            </button>
                                        )}
                                        <Link
                                            to={`/projects/create?team=${id}`}
                                            className="flex text-sm items-center justify-center px-2 py-1 bg-resdes-teal text-slate-950 rounded-md hover:bg-resdes-teal hover:opacity-80 transition-colors"
                                        >
                                            <FolderIcon className="h-5 w-5 mr-2" />
                                            Create Project
                                        </Link>
                                        <Link
                                            to={`/teams/${id}/settings`}
                                            className="flex text-sm items-center justify-center px-2 py-1 bg-gray-100 text-slate-950 rounded-md hover:bg-gray-200 transition-colors"
                                        >
                                            <SettingsIcon className="h-5 w-5 mr-2" />
                                            Team Settings
                                        </Link>
                                    </div>
                                )}
                            </nav>
                        </div>

                        {/* Overview Tab Content */}
                        {activeTab === 'Overview' &&
                            <div className="p-6">
                                {loading ? (
                                    <div className="text-center text-resdes-teal py-10">
                                        <LoadingSpinner
                                            message="Loading team overview..."
                                            size="md"
                                            color="green"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Team Description */}
                                        {team.description && (
                                            <div className="bg-base-300 rounded-lg p-6">
                                                <h3 className="text-lg font-semibold mb-3">About This Team</h3>
                                                <p className="text-base-content leading-relaxed">{team.description}</p>
                                            </div>
                                        )}

                                        {/* Stats Grid */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Team Statistics</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                <div className="bg-base-300 rounded-lg shadow p-6 border-l-4 border-resdes-blue">
                                                    <div className="flex items-center">
                                                        <UsersIcon className="h-8 w-8 text-resdes-blue" />
                                                        <div className="ml-4">
                                                            <p className="text-sm font-medium text-gray-500">Members</p>
                                                            <p className="text-2xl font-bold">
                                                                {team.members?.length || 0}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-base-300 rounded-lg shadow p-6 border-l-4 border-resdes-green">
                                                    <div className="flex items-center">
                                                        <FolderIcon className="h-8 w-8 text-resdes-green" />
                                                        <div className="ml-4">
                                                            <p className="text-sm font-medium text-gray-500">Projects</p>
                                                            <p className="text-2xl font-bold">
                                                                {projects.length}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-base-300 rounded-lg shadow p-6 border-l-4 border-resdes-orange">
                                                    <div className="flex items-center">
                                                        <BookOpenIcon className="h-8 w-8 text-resdes-orange" />
                                                        <div className="ml-4">
                                                            <p className="text-sm font-medium text-gray-500">Books</p>
                                                            <p className="text-2xl font-bold">
                                                                {teamBooks.length}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-base-300 rounded-lg shadow p-6 border-l-4 border-purple-500">
                                                    <div className="flex items-center">
                                                        <FileTextIcon className="h-8 w-8 text-purple-500" />
                                                        <div className="ml-4">
                                                            <p className="text-sm font-medium text-gray-500">Documents</p>
                                                            <p className="text-2xl font-bold">
                                                                {teamDocuments.length}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Team Settings */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Team Settings</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <div className="flex items-center bg-base-300 p-6 rounded-lg">
                                                        <div className="h-12 w-12 bg-resdes-orange rounded-full flex items-center justify-center">
                                                        <span className="text-white font-bold text-lg">
                                                            {team.owner?.firstname?.[0]?.toUpperCase()}{team.owner?.lastname?.[0]?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="ml-4">
                                                        <h4 className="text-sm font-medium text-gray-500">Owner</h4>
                                                        <Link
                                                            to={`/user/${team.owner._id || team.owner}`}
                                                            className="text-lg font-semibold text-resdes-blue hover:text-resdes-blue/75 cursor-pointer"
                                                        >
                                                            {team.owner?.firstname} {team.owner?.lastname}
                                                        </Link>
                                                    </div>
                                                    </div>

                                                    <div className="flex items-center justify-between bg-base-300 p-6 rounded-lg">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-500">Privacy</h4>
                                                            <p className="text-sm font-semibold">
                                                                {team.settings?.isPrivate ? 'Private team' : 'Public team'}
                                                            </p>
                                                        </div>
                                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                            team.settings?.isPrivate
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {team.settings?.isPrivate ? 'Private' : 'Public'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-base-300 p-6 rounded-lg">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-500">Member Invites</h4>
                                                            <p className="text-sm font-semibold">
                                                                {team.settings?.allowMemberInvites ? 'Members can invite' : 'Only admins can invite'}
                                                            </p>
                                                        </div>
                                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                            team.settings?.allowMemberInvites
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {team.settings?.allowMemberInvites ? 'Open' : 'Restricted'}
                                                        </div>
                                                    </div>
                                                </div>

                                        </div>

                                        {/* Team Timeline */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Team Timeline</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                <div className="flex items-center space-x-4 p-8 bg-base-300 rounded-lg shadow">
                                                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-500">Created</p>
                                                        <p className="text-sm font-semibold">
                                                            {new Date(team.createdAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {team.updatedAt !== team.createdAt && (
                                                    <div className="flex items-center space-x-4 p-8 bg-base-300 rounded-lg shadow">
                                                        <TrendingUpIcon className="h-5 w-5 text-gray-400" />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-500">Last Updated</p>
                                                            <p className="text-sm font-semibold">
                                                                {new Date(team.updatedAt).toLocaleDateString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric'
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {team.lastUpdatedBy && (
                                                    <div className="flex items-center space-x-4 p-8 bg-base-300 rounded-lg shadow">
                                                        <UsersIcon className="h-5 w-5 text-gray-400" />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-500">Last Update By</p>
                                                            <Link
                                                                to={`/user/${team.lastUpdatedBy._id || team.lastUpdatedBy}`}
                                                                className="text-sm font-semibold text-resdes-blue hover:text-resdes-blue/75 cursor-pointer"
                                                            >
                                                                {team.owner?.firstname} {team.owner?.lastname}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        }

                        {/* Members Tab Content */}
                        {activeTab === 'Members' &&
                            <div className="p-6">
                                {loading ? (
                                    <div className="text-center text-resdes-teal py-10">
                                        <LoadingSpinner
                                            message="Loading members..."
                                            size="md"
                                            color="green"
                                        />
                                    </div>
                                ) : !team.members || team.members.length === 0 ? (
                                    <div className="text-center py-8">
                                        <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No members yet</h3>
                                        <p className="text-gray-500 mb-4">
                                            This is odd, a team shouldn't exist without one member, the owner who created it.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-xl font-semibold">
                                                Team Members ({team.members.length})
                                            </h3>
                                        </div>

                                        {/* Search Bar */}
                                        {team.members.length > 6 && (
                                            <div className="mb-6">
                                                <div className="relative">
                                                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search members..."
                                                        value={memberSearchTerm}
                                                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resdes-blue focus:border-transparent"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {team.members
                                                .filter(member => member.user) // Filter out members with null user
                                                .filter(member => {
                                                    if (!memberSearchTerm) return true;
                                                    const user = member.user;
                                                    const searchLower = memberSearchTerm.toLowerCase();
                                                    return (
                                                        user.firstname?.toLowerCase().includes(searchLower) ||
                                                        user.lastname?.toLowerCase().includes(searchLower) ||
                                                        user.email?.toLowerCase().includes(searchLower) ||
                                                        user.username?.toLowerCase().includes(searchLower)
                                                    );
                                                })
                                                .map((member) => (
                                                    <MemberCard
                                                        key={member.user._id}
                                                        member={member}
                                                        currentUser={currentUser}
                                                        canManageTeam={canManageTeam}
                                                        onRemoveMember={handleRemoveMember}
                                                        teamOwner={team.owner}
                                                    />
                                                ))
                                            }
                                        </div>

                                        {/* No results message */}
                                        {memberSearchTerm && team.members
                                            .filter(member => member.user) // Filter out members with null user
                                            .filter(member => {
                                                const user = member.user;
                                                const searchLower = memberSearchTerm.toLowerCase();
                                                return (
                                                    user.firstname?.toLowerCase().includes(searchLower) ||
                                                    user.lastname?.toLowerCase().includes(searchLower) ||
                                                    user.email?.toLowerCase().includes(searchLower) ||
                                                    user.username?.toLowerCase().includes(searchLower)
                                                );
                                            }).length === 0 && (
                                            <div className="text-center py-8">
                                                <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
                                                <p className="text-gray-500">
                                                    No members match your search criteria.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        }

                        {/* Documents Tab Content */}
                        {activeTab === 'Documents' &&
                            <div className="p-6">
                                {documentsLoading ? (
                                    <div className="text-center text-resdes-teal py-10">
                                        <LoadingSpinner
                                            message="Loading documents..."
                                            size="md"
                                            color="green"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Team Documents Section */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-semibold">Team Documents</h3>
                                                {selectedTeamDocuments.length > 0 && canManageTeam && (
                                                    <button
                                                        onClick={handleRemoveDocumentsFromTeam}
                                                        className="btn btn-sm bg-red-500 text-white hover:bg-red-600"
                                                    >
                                                        Remove Selected ({selectedTeamDocuments.length})
                                                    </button>
                                                )}
                                            </div>
                                            {teamDocuments.length === 0 ? (
                                                <div className="text-center py-8 bg-base-300 rounded-lg">
                                                    <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                    <h4 className="text-lg font-medium mb-2">No documents assigned</h4>
                                                    <p className="text-gray-500">
                                                        Either this team doesn't have any documents assigned yet, or no documents have been created yet.
                                                    </p>
                                                    <Link
                                                        to={`/doc/create?team=${id}`}
                                                        className="btn bg-resdes-teal text-slate-950 my-4 hover:bg-resdes-teal hover:opacity-80"
                                                    >
                                                        Create Document
                                                    </Link>
                                                </div>
                                            ) : (
                                                <TeamDocumentsTable
                                                    documents={teamDocuments}
                                                    selectedDocuments={selectedTeamDocuments}
                                                    onDocumentSelect={handleTeamDocumentSelect}
                                                    onSelectAll={handleTeamDocumentsSelectAll}
                                                    actionType="ungroup"
                                                />
                                            )}
                                        </div>

                                        {/* Add Documents Section */}
                                        {canManageTeam && (
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-xl font-semibold">Add Documents</h3>
                                                    {selectedAvailableDocuments.length > 0 && (
                                                        <button
                                                            onClick={handleAddDocumentsToTeam}
                                                            className="btn btn-sm bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                                        >
                                                            Add Selected ({selectedAvailableDocuments.length})
                                                        </button>
                                                    )}
                                                </div>
                                                {availableDocuments.length === 0 ? (
                                                    <div className="text-center py-8 bg-base-300 rounded-lg">
                                                        <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                        <h4 className="text-lg font-medium mb-2">No available documents</h4>
                                                        <p className="text-gray-500 mb-4">
                                                            All documents are already assigned to this team, or no documents exist yet.
                                                        </p>
                                                        <Link
                                                            to={`/doc/create`}
                                                            className="btn bg-resdes-teal text-slate-950 hover:bg-resdes-teal hover:opacity-80"
                                                        >
                                                            Create Document
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <TeamDocumentsTable
                                                        documents={availableDocuments}
                                                        selectedDocuments={selectedAvailableDocuments}
                                                        onDocumentSelect={handleAvailableDocumentSelect}
                                                        onSelectAll={handleAvailableDocumentsSelectAll}
                                                        actionType="group"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        }

                        {/* Books Tab Content */}
                        {activeTab === 'Books' &&
                            <div className="p-6">
                                {booksLoading ? (
                                    <div className="text-center text-resdes-teal py-10">
                                        <LoadingSpinner
                                            message="Loading books..."
                                            size="md"
                                            color="green"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Team Books Section */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-semibold">Team Books</h3>
                                                {selectedTeamBooks.length > 0 && canManageTeam && (
                                                    <button
                                                        onClick={handleRemoveBooksFromTeam}
                                                        className="btn btn-sm bg-red-500 text-white hover:bg-red-600"
                                                    >
                                                        Remove Selected ({selectedTeamBooks.length})
                                                    </button>
                                                )}
                                            </div>
                                            {teamBooks.length === 0 ? (
                                                <div className="text-center py-8 bg-base-300 rounded-lg">
                                                    <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                    <h4 className="text-lg font-medium">No books assigned</h4>
                                                    <p className="text-gray-500">
                                                        This team doesn't have any books assigned yet.
                                                    </p>
                                                </div>
                                            ) : (
                                                <TeamBooksTable
                                                    books={teamBooks}
                                                    selectedBooks={selectedTeamBooks}
                                                    onBookSelect={handleTeamBookSelect}
                                                    onSelectAll={handleTeamBooksSelectAll}
                                                    actionType="ungroup"
                                                />
                                            )}
                                        </div>

                                        {/* Add Books Section */}
                                        {canManageTeam && (
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-xl font-semibold">Add Books</h3>
                                                    {selectedAvailableBooks.length > 0 && (
                                                        <button
                                                            onClick={handleAddBooksToTeam}
                                                            className="btn btn-sm bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                                        >
                                                            Add Selected ({selectedAvailableBooks.length})
                                                        </button>
                                                    )}
                                                </div>
                                                {availableBooks.length === 0 ? (
                                                    <div className="text-center py-8 bg-base-300 rounded-lg">
                                                        <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                        <h4 className="text-lg font-medium mb-2">No available books</h4>
                                                        <p className="text-gray-500 mb-4">
                                                            All books are already assigned to this team, or no books exist yet.
                                                        </p>
                                                        <Link
                                                            to={`/book/create`}
                                                            className="btn bg-resdes-teal text-slate-950 hover:bg-resdes-teal hover:opacity-80"
                                                        >
                                                            Create Book
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <TeamBooksTable
                                                        books={availableBooks}
                                                        selectedBooks={selectedAvailableBooks}
                                                        onBookSelect={handleAvailableBookSelect}
                                                        onSelectAll={handleAvailableBooksSelectAll}
                                                        actionType="group"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        }

                        {/* Projects Tab Content */}
                        {activeTab === 'Projects' &&
                            <div className="p-6">
                                {projectsLoading ? (
                                    <div className="text-center text-resdes-teal py-10">
                                        <LoadingSpinner
                                            message="Loading projects..."
                                            size="md"
                                            color="green"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Team Projects Section */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-semibold">Team Projects</h3>
                                                {selectedTeamProjects.length > 0 && canManageTeam && (
                                                    <button
                                                        onClick={handleRemoveProjectsFromTeam}
                                                        className="btn btn-sm bg-red-500 text-white hover:bg-red-600"
                                                    >
                                                        Remove Selected ({selectedTeamProjects.length})
                                                    </button>
                                                )}
                                            </div>
                                            {teamProjects.length === 0 ? (
                                                <div className="text-center py-8 bg-base-300 rounded-lg">
                                                    <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                    <h4 className="text-lg font-medium mb-2">No projects assigned</h4>
                                                    <p className="text-gray-500">
                                                        Either this team doesn't have any projects assigned yet, or no projects exist yet.
                                                    </p>
                                                    <Link
                                                        to={`/project/create`}
                                                        className="btn bg-resdes-teal text-slate-950 mt-4 hover:bg-resdes-teal hover:opacity-80"
                                                    >
                                                        Create Project
                                                    </Link>
                                                </div>
                                            ) : (
                                                <TeamProjectsTable
                                                    projects={teamProjects}
                                                    selectedProjects={selectedTeamProjects}
                                                    onProjectSelect={handleTeamProjectSelect}
                                                    onSelectAll={handleTeamProjectsSelectAll}
                                                    actionType="ungroup"
                                                />
                                            )}
                                        </div>

                                        {/* Add Projects Section */}
                                        {canManageTeam && (
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-xl font-semibold">Add Projects</h3>
                                                    {selectedAvailableProjects.length > 0 && (
                                                        <button
                                                            onClick={handleAddProjectsToTeam}
                                                            className="btn btn-sm bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                                        >
                                                            Add Selected ({selectedAvailableProjects.length})
                                                        </button>
                                                    )}
                                                </div>
                                                {availableProjects.length === 0 ? (
                                                    <div className="text-center py-8 bg-base-300 rounded-lg">
                                                        <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                        <h4 className="text-lg font-medium mb-2">No available projects</h4>
                                                        <p className="text-gray-500 mb-4">
                                                            All projects are already assigned to this team, or no projects exist yet.
                                                        </p>
                                                        <Link
                                                            to={`/projects/create`}
                                                            className="btn bg-resdes-teal text-slate-950 hover:bg-resdes-teal hover:opacity-80"
                                                        >
                                                            Create Project
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <TeamProjectsTable
                                                        projects={availableProjects}
                                                        selectedProjects={selectedAvailableProjects}
                                                        onProjectSelect={handleAvailableProjectSelect}
                                                        onSelectAll={handleAvailableProjectsSelectAll}
                                                        actionType="group"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        }
                    </div>

                    {/* Invite Modal */}
                    {showInviteModal && (
                        <InviteMemberModal
                            teamId={id}
                            onClose={() => setShowInviteModal(false)}
                            onMemberInvited={handleMemberInvited}
                        />
                    )}

                    {/* Add Members Modal */}
                    {showAddMembersModal && (
                        <AddMembersModal
                            isOpen={showAddMembersModal}
                            onClose={() => setShowAddMembersModal(false)}
                            teamId={id}
                            onMemberAdded={handleMemberAdded}
                            currentMembers={team?.members || []}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamDetailPage;
