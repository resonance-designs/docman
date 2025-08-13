import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { 
    FolderIcon, 
    FileTextIcon, 
    UsersIcon, 
    ArrowLeftIcon,
    CalendarIcon,
    AlertCircleIcon,
    TagIcon
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import DocCard from "../components/DocCard";

const ProjectDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [docsLoading, setDocsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

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
                setProject(res.data);
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
                setDocuments(res.data);
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

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="text-center text-resdes-teal py-10">
                        Loading project...
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
                        
                        <div className="flex items-center space-x-2">
                            {canManageProject && (
                                <Link
                                    to={`/projects/${id}/edit`}
                                    className="btn bg-resdes-blue text-white hover:bg-resdes-blue hover:opacity-80"
                                >
                                    Edit Project
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <FileTextIcon className="h-8 w-8 text-resdes-blue" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Documents</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {documents.length}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <UsersIcon className="h-8 w-8 text-resdes-green" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Collaborators</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {project.collaboratorCount || project.collaborators?.length || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <AlertCircleIcon className="h-8 w-8 text-resdes-orange" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Priority</p>
                                    <p className={`text-lg font-semibold ${getPriorityColor(project.priority)}`}>
                                        {project.priority}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <CalendarIcon className="h-8 w-8 text-resdes-teal" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Status</p>
                                    <p className="text-lg font-semibold">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                            {project.status}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dates and Team */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Dates */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Dates</h3>
                            <div className="space-y-3">
                                {project.startDate && (
                                    <div className="flex items-center text-sm">
                                        <CalendarIcon size={16} className="mr-2 text-gray-500" />
                                        <span className="text-gray-600">Start Date:</span>
                                        <span className="ml-2 font-medium">{new Date(project.startDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {project.endDate && (
                                    <div className={`flex items-center text-sm ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                                        <CalendarIcon size={16} className="mr-2" />
                                        <span className="text-gray-600">End Date:</span>
                                        <span className="ml-2 font-medium">
                                            {new Date(project.endDate).toLocaleDateString()}
                                            {isOverdue && <span className="ml-2 font-medium">(Overdue)</span>}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Team */}
                        {project.team && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Team</h3>
                                <div className="flex items-center">
                                    <div className="h-10 w-10 bg-resdes-orange rounded flex items-center justify-center">
                                        <span className="text-white font-bold">
                                            {project.team.name?.[0] || 'T'}
                                        </span>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-900">
                                            {project.team.name}
                                        </p>
                                        <Link 
                                            to={`/teams/${project.team._id || project.team}`}
                                            className="text-xs text-resdes-blue hover:text-resdes-blue hover:opacity-80"
                                        >
                                            View Team
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6 mb-8">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {project.tags.map((tag, index) => (
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

                    {/* Documents */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8 px-6">
                                <button className="border-b-2 border-resdes-blue text-resdes-blue py-4 px-1 text-sm font-medium">
                                    Documents
                                </button>
                            </nav>
                        </div>

                        {/* Documents Content */}
                        <div className="p-6">
                            {docsLoading ? (
                                <div className="text-center text-resdes-teal py-10">
                                    Loading documents...
                                </div>
                            ) : documents.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                                    <p className="text-gray-500 mb-4">
                                        This project doesn't have any documents yet.
                                    </p>
                                    <Link
                                        to={`/create?project=${id}`}
                                        className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                    >
                                        Create Document
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {documents.map((doc) => (
                                        <DocCard key={doc._id} doc={doc} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailPage;