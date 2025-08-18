/*
 * @name ProjectsPage
 * @file /docman/frontend/src/pages/ProjectsPage.jsx
 * @page ProjectsPage
 * @description Project management page with filtering, search, and project creation for organizing documents by project
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FolderIcon, PlusIcon, Settings } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import ProjectCard from "../components/projects/ProjectCard";
import FilterBar from "../components/filters/FilterBar";

const ProjectsPage = () => {
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    
    // Filter states
    const [searchValue, setSearchValue] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
        }
    }, []);

    // Fetch user's projects
    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get("/projects/my-projects", { headers });
                setProjects(res.data);
            } catch (error) {
                console.error("Error fetching projects:", error);
                toast.error("Failed to load projects");
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    // Fetch filtered projects when filters change
    useEffect(() => {
        const fetchFilteredProjects = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                // Build query parameters
                const params = new URLSearchParams();
                if (searchValue) params.append('search', searchValue);
                if (statusFilter) params.append('status', statusFilter);
                if (priorityFilter) params.append('priority', priorityFilter);
                if (sortConfig.key) params.append('sortBy', sortConfig.key);
                if (sortConfig.direction) params.append('sortOrder', sortConfig.direction);

                const queryString = params.toString();
                const url = queryString ? `/projects/my-projects?${queryString}` : '/projects/my-projects';
                
                const res = await api.get(url, { headers });
                setFilteredProjects(res.data);
            } catch (error) {
                console.error("Error fetching filtered projects:", error);
                toast.error("Failed to filter projects");
            }
        };

        // Only fetch if we have initial data or active filters
        if (projects.length > 0 || searchValue || statusFilter || priorityFilter) {
            fetchFilteredProjects();
        }
    }, [searchValue, statusFilter, priorityFilter, sortConfig, projects.length]);

    // Check if user can create projects (editor or admin)
    const canCreateProject = userRole === "editor" || userRole === "admin";

    // Filter options
    const statusOptions = [
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
        { value: "on-hold", label: "On Hold" },
        { value: "archived", label: "Archived" }
    ];

    const priorityOptions = [
        { value: "critical", label: "Critical" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" }
    ];

    // Filter configuration
    const filters = [
        {
            key: "status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: statusOptions,
            placeholder: "All Statuses",
            label: "Status"
        },
        {
            key: "priority",
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: priorityOptions,
            placeholder: "All Priorities",
            label: "Priority"
        }
    ];

    // Clear all filters
    const handleClearAllFilters = () => {
        setSearchValue("");
        setStatusFilter("");
        setPriorityFilter("");
        setSortConfig({ key: "createdAt", direction: "desc" });
    };

    // Determine which projects to display
    const displayProjects = filteredProjects.length > 0 || searchValue || statusFilter || priorityFilter 
        ? filteredProjects 
        : projects;

    const handleProjectDeleted = (projectId) => {
        setProjects(prev => prev.filter(project => project._id !== projectId));
        setFilteredProjects(prev => prev.filter(project => project._id !== projectId));
        toast.success("Project deleted successfully!");
    };

    if (!canCreateProject) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="max-w-screen-xl mx-auto">
                        <div className="text-center py-8">
                            <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Projects Access Restricted</h3>
                            <p className="text-gray-500">
                                You need editor or admin privileges to access projects functionality.
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
                            <FolderIcon className="size-8 text-resdes-orange" />
                            My Projects
                        </h1>
                        <Link
                            to="/projects/create"
                            className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                        >
                            <PlusIcon size={16} />
                            Create Project
                        </Link>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center text-resdes-teal py-10">
                            <LoadingSpinner 
                                message="Loading projects..." 
                                size="lg" 
                                color="green" 
                            />
                        </div>
                    )}

                    {/* Filter Bar */}
                    {!loading && projects.length > 0 && (
                        <FilterBar
                            searchValue={searchValue}
                            onSearchChange={setSearchValue}
                            filters={filters}
                            onClearAll={handleClearAllFilters}
                        />
                    )}

                    {/* Empty State */}
                    {!loading && projects.length === 0 && (
                        <div className="text-center py-8">
                            <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                            <p className="text-gray-500 mb-4">
                                Create your first project to start organizing documents and collaborating with your team.
                            </p>
                            <Link
                                to="/projects/create"
                                className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                            >
                                <PlusIcon size={16} />
                                Create First Project
                            </Link>
                        </div>
                    )}

                    {/* No Results State */}
                    {!loading && projects.length > 0 && displayProjects.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-lg mb-4">No projects match your filters.</p>
                            <button
                                onClick={handleClearAllFilters}
                                className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}

                    {/* Projects Grid */}
                    {!loading && displayProjects.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayProjects.map((project) => (
                                <ProjectCard 
                                    key={project._id} 
                                    project={project} 
                                    onProjectDeleted={handleProjectDeleted}
                                />
                            ))}
                        </div>
                    )}

                    {/* Admin Link */}
                    {userRole === "admin" && (
                        <div className="mt-8 text-center">
                            <Link
                                to="/admin/projects"
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Settings size={16} className="mr-2" />
                                Manage All Projects
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectsPage;
