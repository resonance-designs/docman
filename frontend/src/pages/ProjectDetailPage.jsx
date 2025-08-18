/*
 * @name ProjectDetailPage
 * @file /docman/frontend/src/pages/ProjectDetailsPage.jsx
 * @page ProjectDetailPage
 * @description Project detail page showing project information, documents, and team collaboration
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
    FolderIcon,
    FileTextIcon,
    UsersIcon,
    ArrowLeftIcon,
    CalendarIcon,
    AlertCircleIcon,
    TagIcon,
    BookOpenIcon,
    SettingsIcon,
    SearchIcon,
    UserPlusIcon,
    MoreVerticalIcon,
    EditIcon,
    TrashIcon,
    TrendingUpIcon
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import DocCard from "../components/DocCard";
import { ensureArray, ensureObject } from "../lib/safeUtils";
import ProjectBooksTable from "../components/projects/ProjectBooksTable";
import ProjectDocumentsTable from "../components/projects/ProjectDocumentsTable";
import CollaboratorCard from "../components/projects/CollaboratorCard";
import AddCollaboratorModal from "../components/projects/AddCollaboratorModal";

const ProjectDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [projectBooks, setProjectBooks] = useState([]);
    const [availableBooks, setAvailableBooks] = useState([]);
    const [selectedProjectBooks, setSelectedProjectBooks] = useState([]);
    const [selectedAvailableBooks, setSelectedAvailableBooks] = useState([]);
    const [projectDocuments, setProjectDocuments] = useState([]);
    const [availableDocuments, setAvailableDocuments] = useState([]);
    const [selectedProjectDocuments, setSelectedProjectDocuments] = useState([]);
    const [selectedAvailableDocuments, setSelectedAvailableDocuments] = useState([]);
    const [collaborators, setCollaborators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [docsLoading, setDocsLoading] = useState(true);
    const [booksLoading, setBooksLoading] = useState(true);
    const [documentsLoading, setDocumentsLoading] = useState(true);
    const [collaboratorsLoading, setCollaboratorsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('Overview');
    const [collaboratorSearchTerm, setCollaboratorSearchTerm] = useState('');
    const [showAddCollaboratorModal, setShowAddCollaboratorModal] = useState(false);

    // Get current user from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setCurrentUser(decoded);
        }
    }, []);

    // Fetch project details
    useEffect(() => {
        const fetchProject = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get(`/projects/${id}`, { headers });
                setProject(ensureObject(res.data));
            } catch (error) {
                console.error("Error fetching project:", error);
                if (error.response?.status === 404) {
                    toast.error("Project not found");
                    navigate("/projects");
                } else if (error.response?.status === 403) {
                    toast.error("Access denied");
                    navigate("/projects");
                } else {
                    toast.error("Failed to load project");
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProject();
        }
    }, [id, navigate]);

    // Fetch project documents
    useEffect(() => {
        const fetchDocuments = async () => {
            setDocsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get(`/docs?project=${id}`, { headers });
                setDocuments(ensureArray(res.data));
            } catch (error) {
                console.error("Error fetching documents:", error);
                toast.error("Failed to load documents");
            } finally {
                setDocsLoading(false);
            }
        };

        if (id) {
            fetchDocuments();
        }
    }, [id]);

    // Fetch project books when Books or Overview tab is active
    useEffect(() => {
        const fetchProjectBooks = async () => {
            if ((activeTab !== 'Books' && activeTab !== 'Overview') || !id) return;

            setBooksLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const [projectBooksRes, availableBooksRes] = await Promise.all([
                    api.get(`/projects/${id}/books`, { headers }),
                    api.get(`/projects/${id}/available-books`, { headers })
                ]);

                setProjectBooks(projectBooksRes.data);
                setAvailableBooks(availableBooksRes.data);
            } catch (error) {
                console.error("Error fetching books:", error);
                toast.error("Failed to load books");
            } finally {
                setBooksLoading(false);
            }
        };

        fetchProjectBooks();
    }, [id, activeTab]);

    // Fetch project documents when Documents or Overview tab is active
    useEffect(() => {
        const fetchProjectDocuments = async () => {
            if ((activeTab !== 'Documents' && activeTab !== 'Overview') || !id) return;

            setDocumentsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const [projectDocumentsRes, availableDocumentsRes] = await Promise.all([
                    api.get(`/projects/${id}/documents`, { headers }),
                    api.get(`/projects/${id}/available-documents`, { headers })
                ]);

                setProjectDocuments(projectDocumentsRes.data);
                setAvailableDocuments(availableDocumentsRes.data);
            } catch (error) {
                console.error("Error fetching documents:", error);
                toast.error("Failed to load documents");
            } finally {
                setDocumentsLoading(false);
            }
        };

        fetchProjectDocuments();
    }, [id, activeTab]);

    // Fetch project collaborators when Collaborators or Overview tab is active
    useEffect(() => {
        const fetchCollaborators = async () => {
            if ((activeTab !== 'Collaborators' && activeTab !== 'Overview') || !id) return;

            setCollaboratorsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get(`/projects/${id}/collaborators`, { headers });
                setCollaborators(ensureArray(res.data));
            } catch (error) {
                console.error("Error fetching collaborators:", error);
                toast.error("Failed to load collaborators");
            } finally {
                setCollaboratorsLoading(false);
            }
        };

        fetchCollaborators();
    }, [id, activeTab]);

    // Book management handlers
    const handleProjectBookSelect = (bookId) => {
        setSelectedProjectBooks(prev =>
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

    const handleProjectBooksSelectAll = (bookIds, selectAll) => {
        if (selectAll) {
            setSelectedProjectBooks(prev => [...new Set([...prev, ...bookIds])]);
        } else {
            setSelectedProjectBooks(prev => prev.filter(id => !bookIds.includes(id)));
        }
    };

    const handleAvailableBooksSelectAll = (bookIds, selectAll) => {
        if (selectAll) {
            setSelectedAvailableBooks(prev => [...new Set([...prev, ...bookIds])]);
        } else {
            setSelectedAvailableBooks(prev => prev.filter(id => !bookIds.includes(id)));
        }
    };

    const handleRemoveBooksFromProject = async () => {
        if (selectedProjectBooks.length === 0) {
            toast.error("Please select books to remove");
            return;
        }

        if (!window.confirm(`Are you sure you want to remove ${selectedProjectBooks.length} book(s) from this project?`)) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await api.delete(`/projects/${id}/books`, {
                headers,
                data: { bookIds: selectedProjectBooks }
            });

            // Move selected books from project to available
            const removedBooks = projectBooks.filter(book => selectedProjectBooks.includes(book._id));
            setProjectBooks(prev => prev.filter(book => !selectedProjectBooks.includes(book._id)));
            setAvailableBooks(prev => [...prev, ...removedBooks]);
            setSelectedProjectBooks([]);

            toast.success(`${selectedProjectBooks.length} book(s) removed from project successfully`);
        } catch (error) {
            console.error("Error removing books from project:", error);
            toast.error("Failed to remove books from project");
        }
    };

    const handleAddBooksToProject = async () => {
        if (selectedAvailableBooks.length === 0) {
            toast.error("Please select books to add");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await api.post(`/projects/${id}/books`, {
                bookIds: selectedAvailableBooks
            }, { headers });

            // Move selected books from available to project
            const addedBooks = availableBooks.filter(book => selectedAvailableBooks.includes(book._id));
            setAvailableBooks(prev => prev.filter(book => !selectedAvailableBooks.includes(book._id)));
            setProjectBooks(prev => [...prev, ...addedBooks]);
            setSelectedAvailableBooks([]);

            toast.success(`${selectedAvailableBooks.length} book(s) added to project successfully`);
        } catch (error) {
            console.error("Error adding books to project:", error);
            toast.error("Failed to add books to project");
        }
    };

    // Document management handlers
    const handleProjectDocumentSelect = (documentId) => {
        setSelectedProjectDocuments(prev =>
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

    const handleProjectDocumentsSelectAll = (documentIds, selectAll) => {
        if (selectAll) {
            setSelectedProjectDocuments(prev => [...new Set([...prev, ...documentIds])]);
        } else {
            setSelectedProjectDocuments(prev => prev.filter(id => !documentIds.includes(id)));
        }
    };

    const handleAvailableDocumentsSelectAll = (documentIds, selectAll) => {
        if (selectAll) {
            setSelectedAvailableDocuments(prev => [...new Set([...prev, ...documentIds])]);
        } else {
            setSelectedAvailableDocuments(prev => prev.filter(id => !documentIds.includes(id)));
        }
    };

    const handleRemoveDocumentsFromProject = async () => {
        if (selectedProjectDocuments.length === 0) {
            toast.error("Please select documents to remove");
            return;
        }

        if (!window.confirm(`Are you sure you want to remove ${selectedProjectDocuments.length} document(s) from this project?`)) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await api.delete(`/projects/${id}/documents`, {
                headers,
                data: { documentIds: selectedProjectDocuments }
            });

            // Move selected documents from project to available
            const removedDocuments = projectDocuments.filter(doc => selectedProjectDocuments.includes(doc._id));
            setProjectDocuments(prev => prev.filter(doc => !selectedProjectDocuments.includes(doc._id)));
            setAvailableDocuments(prev => [...prev, ...removedDocuments]);
            setSelectedProjectDocuments([]);

            toast.success(`${selectedProjectDocuments.length} document(s) removed from project successfully`);
        } catch (error) {
            console.error("Error removing documents from project:", error);
            toast.error("Failed to remove documents from project");
        }
    };

    const handleAddDocumentsToProject = async () => {
        if (selectedAvailableDocuments.length === 0) {
            toast.error("Please select documents to add");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await api.post(`/projects/${id}/documents`, {
                documentIds: selectedAvailableDocuments
            }, { headers });

            // Move selected documents from available to project
            const addedDocuments = availableDocuments.filter(doc => selectedAvailableDocuments.includes(doc._id));
            setAvailableDocuments(prev => prev.filter(doc => !selectedAvailableDocuments.includes(doc._id)));
            setProjectDocuments(prev => [...prev, ...addedDocuments]);
            setSelectedAvailableDocuments([]);

            toast.success(`${selectedAvailableDocuments.length} document(s) added to project successfully`);
        } catch (error) {
            console.error("Error adding documents to project:", error);
            toast.error("Failed to add documents to project");
        }
    };

    // Collaborator management handlers
    const handleRemoveCollaborator = async (collaboratorId) => {
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await api.delete(`/projects/${id}/collaborators/${collaboratorId}`, { headers });

            // Update collaborators state
            setCollaborators(prev => prev.filter(collaborator => collaborator._id !== collaboratorId));

            toast.success("Collaborator removed successfully");
        } catch (error) {
            console.error("Error removing collaborator:", error);
            toast.error("Failed to remove collaborator");
        }
    };

    const handleCollaboratorAdded = async () => {
        // Refresh collaborators list
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await api.get(`/projects/${id}/collaborators`, { headers });
            setCollaborators(ensureArray(res.data));
        } catch (error) {
            console.error("Error refreshing collaborators:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="text-center text-resdes-teal py-10">
                        <LoadingSpinner
                            message="Loading project..."
                            size="lg"
                            color="green"
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="text-center py-8">
                        <p className="text-gray-500 text-lg">Project not found.</p>
                        <Link to="/projects" className="btn bg-resdes-blue text-white mt-4">
                            Back to Projects
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const isOwner = project.owner && currentUser && project.owner._id === currentUser.id;
    const isAdmin = project.members?.some(member =>
        member.user._id === currentUser?.id && member.role === 'admin'
    );
    const canManageProject = isOwner || isAdmin || currentUser?.role === 'admin';

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            case 'on-hold': return 'bg-yellow-100 text-yellow-800';
            case 'archived': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return 'text-red-600';
            case 'high': return 'text-orange-600';
            case 'medium': return 'text-yellow-600';
            case 'low': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    const isOverdue = project.endDate && new Date(project.endDate) < new Date();

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/projects"
                                className="p-2 rounded-full hover:bg-gray-100"
                            >
                                <ArrowLeftIcon size={20} className="text-gray-600" />
                            </Link>
                            <div>
                                <h1 className="text-4xl font-bold flex items-center gap-2">
                                    <FolderIcon className="size-8 text-resdes-orange" />
                                    {project.name}
                                </h1>
                                {project.description && (
                                    <p className="text-gray-600 mt-1">{project.description}</p>
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
                                        onClick={() => setActiveTab('Collaborators')}
                                        className={`${
                                            activeTab === 'Collaborators'? 'border-b-4 border-resdes-orange text-resdes-orange font-semibold' : 'border-b-4 border-transparent text-base font-semibold hover:opacity-65'
                                        } py-4 px-1 text-sm font-medium`}
                                    >
                                        Collaborators
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
                                {canManageProject && (
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setShowAddCollaboratorModal(true)}
                                            className="flex text-sm items-center justify-center px-2 py-1 bg-resdes-blue text-slate-950 rounded-md hover:bg-resdes-blue hover:opacity-90 transition-colors"
                                        >
                                            <UserPlusIcon className="h-5 w-5 mr-2" />
                                            Add Collaborators
                                        </button>
                                        <Link
                                            to={`/projects/${id}/edit`}
                                            className="flex text-sm items-center justify-center px-2 py-1 bg-resdes-green text-slate-950 rounded-md hover:bg-resdes-green hover:opacity-80 transition-colors"
                                        >
                                            <EditIcon className="h-5 w-5 mr-2" />
                                            Edit Project
                                        </Link>
                                        <Link
                                            to={`/projects/${id}/settings`}
                                            className="flex text-sm items-center justify-center px-2 py-1 bg-gray-100 text-slate-950 rounded-md hover:bg-gray-200 transition-colors"
                                        >
                                            <SettingsIcon className="h-5 w-5 mr-2" />
                                            Project Settings
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
                                            message="Loading project overview..."
                                            size="md"
                                            color="green"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Project Description */}
                                        {project.description && (
                                            <div className="bg-base-300 rounded-lg p-6">
                                                <h3 className="text-lg font-semibold mb-3">About This Project</h3>
                                                <p className="text-base-content leading-relaxed">{project.description}</p>
                                                {/* Tags */}
                                                {ensureArray(project.tags).length > 0 && (
                                                    <div className="mt-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                {ensureArray(project.tags).map((tag, index) => (
                                                                    <span
                                                                        key={index}
                                                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                                                                    >
                                                                        <TagIcon size={14} className="mr-1" />
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Stats Grid */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Project Statistics</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                <div className="bg-base-300 rounded-lg shadow p-6 border-l-4 border-resdes-blue">
                                                    <div className="flex items-center">
                                                        <UsersIcon className="h-8 w-8 text-resdes-blue" />
                                                        <div className="ml-4">
                                                            <p className="text-sm font-medium text-gray-500">Collaborators</p>
                                                            <p className="text-2xl font-bold">
                                                                {collaborators.length}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-base-300 rounded-lg shadow p-6 border-l-4 border-resdes-green">
                                                    <div className="flex items-center">
                                                        <FileTextIcon className="h-8 w-8 text-resdes-green" />
                                                        <div className="ml-4">
                                                            <p className="text-sm font-medium text-gray-500">Documents</p>
                                                            <p className="text-2xl font-bold">
                                                                {projectDocuments.length}
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
                                                                {projectBooks.length}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-base-300 rounded-lg shadow p-6 border-l-4 border-purple-500">
                                                    <div className="flex items-center">
                                                        <TrendingUpIcon className="h-8 w-8 text-purple-500" />
                                                        <div className="ml-4">
                                                            <p className="text-sm font-medium text-gray-500">Priority</p>
                                                            <p className={`text-lg font-semibold ${getPriorityColor(project.priority)}`}>
                                                                {project.priority || 'Not set'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Project Owner Section */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Project Settings</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                <div className="flex items-center bg-base-300 p-6 rounded-lg">
                                                    <div className="h-12 w-12 bg-resdes-orange rounded-full flex items-center justify-center">
                                                        <span className="text-white font-bold text-lg">
                                                            {project.owner?.firstname?.[0]?.toUpperCase()}{project.owner?.lastname?.[0]?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="ml-4">
                                                        <h4 className="text-sm font-medium text-gray-500">Owner</h4>
                                                        <Link
                                                            to={`/user/${project.owner._id || project.owner}`}
                                                            className="text-lg font-semibold text-resdes-blue hover:text-resdes-blue/75 cursor-pointer"
                                                        >
                                                            {project.owner?.firstname} {project.owner?.lastname}
                                                        </Link>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between bg-base-300 p-6 rounded-lg">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-500">Status</h4>
                                                        <p className="text-sm font-semibold capitalize">
                                                            {project.status || 'Not set'}
                                                        </p>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(project.status)}`}>
                                                        {project.status || 'Not set'}
                                                    </div>
                                                </div>

                                                {project.endDate && (
                                                    <div className="flex items-center justify-between bg-base-300 p-6 rounded-lg">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-500">Due Date</h4>
                                                            <p className="text-sm font-semibold">
                                                                {new Date(project.endDate).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                            isOverdue
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {isOverdue ? 'Overdue' : 'On Track'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Teams */}
                                        {project.teams && project.teams.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4">Associated Teams</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {project.teams.map((team) => (
                                                        <div key={team._id || team} className="bg-base-300 rounded-lg shadow p-6">
                                                            <div className="flex items-center">
                                                                <div className="h-12 w-12 bg-resdes-blue rounded-full flex items-center justify-center">
                                                                    <span className="text-white font-bold text-lg">
                                                                        {team.name?.[0] || 'T'}
                                                                    </span>
                                                                </div>
                                                                <div className="ml-4 flex-1">
                                                                    <h4 className="text-lg font-semibold">
                                                                        {team.name}
                                                                    </h4>
                                                                    <Link
                                                                        to={`/teams/${team._id || team}`}
                                                                        className="text-sm text-resdes-blue hover:text-resdes-blue hover:opacity-80"
                                                                    >
                                                                        View Team Details
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        }

                        {/* Collaborators Tab Content */}
                        {activeTab === 'Collaborators' && (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold">Project Collaborators</h2>
                                    <div className="flex items-center space-x-4">
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search collaborators..."
                                                value={collaboratorSearchTerm}
                                                onChange={(e) => setCollaboratorSearchTerm(e.target.value)}
                                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-orange"
                                            />
                                        </div>
                                        {canManageProject && (
                                            <button
                                                onClick={() => setShowAddCollaboratorModal(true)}
                                                className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                            >
                                                <UserPlusIcon size={16} />
                                                Add Collaborators
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {collaboratorsLoading ? (
                                    <div className="text-center text-resdes-teal py-10">
                                        <LoadingSpinner
                                            message="Loading collaborators..."
                                            size="md"
                                            color="green"
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {collaborators
                                            .filter(collaborator =>
                                                !collaboratorSearchTerm ||
                                                `${collaborator.firstname} ${collaborator.lastname}`.toLowerCase().includes(collaboratorSearchTerm.toLowerCase()) ||
                                                collaborator.email.toLowerCase().includes(collaboratorSearchTerm.toLowerCase())
                                            )
                                            .map((collaborator) => (
                                                <CollaboratorCard
                                                    key={collaborator._id}
                                                    collaborator={collaborator}
                                                    canManage={canManageProject}
                                                    onRemove={handleRemoveCollaborator}
                                                />
                                            ))
                                        }
                                        {collaborators.length === 0 && (
                                            <div className="col-span-full text-center py-8">
                                                <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                <h3 className="text-lg font-medium mb-2">No collaborators yet</h3>
                                                <p className="text-gray-500 mb-4">
                                                    This project doesn't have any collaborators yet.
                                                </p>
                                                {canManageProject && (
                                                    <button
                                                        onClick={() => setShowAddCollaboratorModal(true)}
                                                        className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                                    >
                                                        Add Collaborators
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Documents Tab Content */}
                        {activeTab === 'Documents' && (
                            <div className="p-6">
                                <ProjectDocumentsTable
                                    projectDocuments={projectDocuments}
                                    availableDocuments={availableDocuments}
                                    selectedProjectDocuments={selectedProjectDocuments}
                                    selectedAvailableDocuments={selectedAvailableDocuments}
                                    onProjectDocumentSelect={handleProjectDocumentSelect}
                                    onAvailableDocumentSelect={handleAvailableDocumentSelect}
                                    onProjectDocumentsSelectAll={handleProjectDocumentsSelectAll}
                                    onAvailableDocumentsSelectAll={handleAvailableDocumentsSelectAll}
                                    onRemoveDocumentsFromProject={handleRemoveDocumentsFromProject}
                                    onAddDocumentsToProject={handleAddDocumentsToProject}
                                    loading={documentsLoading}
                                />
                            </div>
                        )}

                        {/* Books Tab Content */}
                        {activeTab === 'Books' && (
                            <div className="p-6">
                                <ProjectBooksTable
                                    projectBooks={projectBooks}
                                    availableBooks={availableBooks}
                                    selectedProjectBooks={selectedProjectBooks}
                                    selectedAvailableBooks={selectedAvailableBooks}
                                    onProjectBookSelect={handleProjectBookSelect}
                                    onAvailableBookSelect={handleAvailableBookSelect}
                                    onProjectBooksSelectAll={handleProjectBooksSelectAll}
                                    onAvailableBooksSelectAll={handleAvailableBooksSelectAll}
                                    onRemoveBooksFromProject={handleRemoveBooksFromProject}
                                    onAddBooksToProject={handleAddBooksToProject}
                                    loading={booksLoading}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Collaborator Modal */}
            <AddCollaboratorModal
                isOpen={showAddCollaboratorModal}
                onClose={() => setShowAddCollaboratorModal(false)}
                projectId={id}
                onCollaboratorAdded={handleCollaboratorAdded}
            />
        </div>
    );
};

export default ProjectDetailPage;