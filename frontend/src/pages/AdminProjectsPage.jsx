/*
 * @name AdminProjectsPage
 * @file /docman/frontend/src/pages/AdminProjectsPage.jsx
 * @page AdminProjectsPage
 * @description Admin page for managing all projects in the system
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import { 
    ArrowLeft, 
    Search, 
    Folder as FolderIcon, 
    Edit, 
    Trash2, 
    Plus, 
    Shield, 
    Filter 
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmationModal from "../components/modals/ConfirmationModal";

const AdminProjectsPage = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [userRole, setUserRole] = useState(null);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: "",
        priority: "",
    });

    // Status options
    const statusOptions = ["", "active", "completed", "on-hold", "cancelled"];
    
    // Priority options
    const priorityOptions = ["", "low", "medium", "high", "critical"];

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
            
            // Redirect if not admin
            if (decoded?.role !== "admin") {
                toast.error("You don't have permission to access this page");
                navigate("/projects");
            }
        } else {
            navigate("/login");
        }
    }, [navigate]);

    // Fetch all projects
    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get("/projects", { headers });
                setProjects(res.data);
                setFilteredProjects(res.data);
            } catch (error) {
                console.error("Error fetching projects:", error);
                toast.error("Failed to load projects");
            } finally {
                setLoading(false);
            }
        };

        if (userRole === "admin") {
            fetchProjects();
        }
    }, [userRole]);

    // Handle search and filters
    useEffect(() => {
        let filtered = [...projects];
        
        // Apply search term
        if (searchTerm.trim() !== "") {
            filtered = filtered.filter(project => 
                project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (project.owner?.firstname && project.owner.firstname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (project.owner?.lastname && project.owner.lastname.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        // Apply status filter
        if (filters.status) {
            filtered = filtered.filter(project => project.status === filters.status);
        }
        
        // Apply priority filter
        if (filters.priority) {
            filtered = filtered.filter(project => project.priority === filters.priority);
        }
        
        setFilteredProjects(filtered);
    }, [searchTerm, filters, projects]);

    // Handle filter change
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            status: "",
            priority: "",
        });
        setSearchTerm("");
    };

    // Handle project deletion
    const handleDeleteProject = async () => {
        if (!projectToDelete) return;
        
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            await api.delete(`/projects/${projectToDelete._id}`, { headers });
            setProjects(prev => prev.filter(project => project._id !== projectToDelete._id));
            toast.success("Project deleted successfully");
        } catch (error) {
            console.error("Error deleting project:", error);
            toast.error("Failed to delete project");
        } finally {
            setProjectToDelete(null);
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'completed':
                return 'bg-blue-100 text-blue-800';
            case 'on-hold':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Get priority color
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'low':
                return 'bg-blue-100 text-blue-800';
            case 'medium':
                return 'bg-green-100 text-green-800';
            case 'high':
                return 'bg-yellow-100 text-yellow-800';
            case 'critical':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
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
                            to="/projects"
                            className="mr-4 p-2 rounded-full hover:bg-base-300 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-bold flex items-center">
                            <Shield className="mr-2 text-resdes-orange" size={28} />
                            Admin: Manage All Projects
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
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-teal"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="btn bg-resdes-blue text-white hover:bg-resdes-blue hover:opacity-80"
                            >
                                <Filter size={16} className="mr-2" />
                                {showFilters ? "Hide Filters" : "Show Filters"}
                            </button>
                            <Link
                                to="/projects/create"
                                className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                            >
                                <Plus size={16} className="mr-2" />
                                Create Project
                            </Link>
                        </div>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                        <div className="bg-base-200 p-4 rounded-lg mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="status" className="block text-sm font-medium mb-1">
                                        Status
                                    </label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={filters.status}
                                        onChange={handleFilterChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-teal"
                                    >
                                        {statusOptions.map(option => (
                                            <option key={option} value={option}>
                                                {option ? option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ') : 'All Statuses'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="priority" className="block text-sm font-medium mb-1">
                                        Priority
                                    </label>
                                    <select
                                        id="priority"
                                        name="priority"
                                        value={filters.priority}
                                        onChange={handleFilterChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-teal"
                                    >
                                        {priorityOptions.map(option => (
                                            <option key={option} value={option}>
                                                {option ? option.charAt(0).toUpperCase() + option.slice(1) : 'All Priorities'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={clearFilters}
                                        className="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center text-resdes-teal py-10">
                            <LoadingSpinner 
                                message="Loading projects..." 
                                size="lg" 
                                color="purple" 
                            />
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && filteredProjects.length === 0 && (
                        <div className="text-center py-8 bg-base-200 rounded-lg p-8">
                            <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                            <p className="text-gray-500 mb-4">
                                {searchTerm || filters.status || filters.priority ? 
                                    "No projects match your search criteria." : 
                                    "There are no projects in the system yet."}
                            </p>
                            {(searchTerm || filters.status || filters.priority) && (
                                <button
                                    onClick={clearFilters}
                                    className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80 mr-4"
                                >
                                    Clear Filters
                                </button>
                            )}
                            <Link
                                to="/projects/create"
                                className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                            >
                                <Plus size={16} className="mr-2" />
                                Create Project
                            </Link>
                        </div>
                    )}

                    {/* Projects Table */}
                    {!loading && filteredProjects.length > 0 && (
                        <div className="bg-base-200 rounded-lg overflow-hidden shadow-md">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Project Name
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Owner
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Priority
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
                                        {filteredProjects.map((project) => (
                                            <tr key={project._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-resdes-blue/20 rounded-full flex items-center justify-center">
                                                            <FolderIcon size={18} className="text-resdes-blue" />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                <Link to={`/projects/${project._id}`} className="hover:text-resdes-blue">
                                                                    {project.name}
                                                                </Link>
                                                            </div>
                                                            {project.description && (
                                                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                                                    {project.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {project.owner?.firstname && project.owner?.lastname ? (
                                                            <Link to={`/user/${project.owner._id || project.owner}`} className="hover:text-resdes-blue">
                                                                {project.owner.firstname} {project.owner.lastname}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-gray-500">Unknown</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(project.status)}`}>
                                                        {project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('-', ' ') : 'Not set'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(project.priority)}`}>
                                                        {project.priority ? project.priority.charAt(0).toUpperCase() + project.priority.slice(1) : 'Not set'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(project.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <Link
                                                        to={`/projects/${project._id}/settings`}
                                                        className="text-resdes-teal hover:text-resdes-teal/75 mr-4"
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => setProjectToDelete(project)}
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

            {/* Delete Confirmation Modal */}
            {projectToDelete && (
                <ConfirmationModal
                    title="Delete Project"
                    message={`Are you sure you want to delete the project "${projectToDelete.name}"? This action cannot be undone and all project data will be lost.`}
                    confirmText="Delete Project"
                    cancelText="Cancel"
                    confirmButtonClass="btn bg-red-600 text-white hover:bg-red-700"
                    onConfirm={handleDeleteProject}
                    onCancel={() => setProjectToDelete(null)}
                />
            )}
        </div>
    );
};

export default AdminProjectsPage;