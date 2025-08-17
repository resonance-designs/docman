/*
 * @name ViewBooksPage
 * @file /docman/frontend/src/pages/ViewBooksPage.jsx
 * @page ViewBooksPage
 * @description Books listing page with filtering and management capabilities
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { BookOpen, Plus, Eye, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { useUserRole } from "../hooks";
import InlineLoader from "../components/InlineLoader";
import FilterBar from "../components/filters/FilterBar";

const ViewBooksPage = () => {
    const { userRole } = useUserRole();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchValue, setSearchValue] = useState("");
    const [teamFilter, setTeamFilter] = useState("");
    const [projectFilter, setProjectFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [teams, setTeams] = useState([]);
    const [projects, setProjects] = useState([]);
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        fetchBooks();
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        if (books.length > 0 || searchValue || teamFilter || projectFilter || categoryFilter) {
            fetchBooks();
        }
    }, [searchValue, teamFilter, projectFilter, categoryFilter]);

    const fetchBooks = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchValue) params.append('search', searchValue);
            if (teamFilter) params.append('team', teamFilter);
            if (projectFilter) params.append('project', projectFilter);
            if (categoryFilter) params.append('category', categoryFilter);
            
            const response = await api.get(`/books?${params.toString()}`);
            setBooks(response.data.books || []);
            setPagination(response.data.pagination || {});
        } catch (error) {
            console.error("Error fetching books:", error);
            toast.error("Failed to fetch books");
        } finally {
            setLoading(false);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const results = await Promise.allSettled([
                api.get("/teams"),
                api.get("/projects"),
                api.get("/categories")
            ]);

            // Handle teams
            if (results[0].status === 'fulfilled') {
                setTeams(results[0].value.data.teams || []);
            } else {
                console.error("Failed to fetch teams:", results[0].reason);
            }

            // Handle projects
            if (results[1].status === 'fulfilled') {
                setProjects(results[1].value.data.projects || []);
            } else {
                console.error("Failed to fetch projects:", results[1].reason);
            }

            // Handle categories
            if (results[2].status === 'fulfilled') {
                const categoriesData = results[2].value.data;
                setCategories(categoriesData.categories?.filter(cat => cat.type === 'Book') || []);
            } else {
                console.error("Failed to fetch categories:", results[2].reason);
            }
        } catch (error) {
            console.error("Error fetching filter options:", error);
        }
    };

    const handleDeleteBook = async (bookId) => {
        if (!window.confirm("Are you sure you want to delete this book?")) {
            return;
        }

        try {
            await api.delete(`/books/${bookId}`);
            toast.success("Book deleted successfully");
            fetchBooks();
        } catch (error) {
            console.error("Error deleting book:", error);
            toast.error("Failed to delete book");
        }
    };

    // Filter options
    const teamOptions = teams.map(team => ({ value: team._id, label: team.name }));
    const projectOptions = projects.map(project => ({ value: project._id, label: project.name }));
    const categoryOptions = categories.map(category => ({ value: category._id, label: category.name }));

    // Filter configuration
    const filters = [
        {
            key: "team",
            value: teamFilter,
            onChange: setTeamFilter,
            options: teamOptions,
            placeholder: "All Teams",
            label: "Team"
        },
        {
            key: "project",
            value: projectFilter,
            onChange: setProjectFilter,
            options: projectOptions,
            placeholder: "All Projects",
            label: "Project"
        },
        {
            key: "category",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: categoryOptions,
            placeholder: "All Categories",
            label: "Category"
        }
    ];

    // Handle clear all filters
    const handleClearAllFilters = () => {
        setSearchValue("");
        setTeamFilter("");
        setProjectFilter("");
        setCategoryFilter("");
    };

    // Client-side filtering for search (since backend might not support search yet)
    const displayBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchValue.toLowerCase()) ||
        book.description?.toLowerCase().includes(searchValue.toLowerCase())
    );

    const canCreateBooks = userRole === 'admin' || userRole === 'editor';
    const canEditBooks = userRole === 'admin' || userRole === 'editor';

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="max-w-screen-xl mx-auto">
                        <InlineLoader message="Loading books..." size="lg" color="teal" />
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
                        <h1 className="text-4xl font-bold flex items-center gap-2">
                            <BookOpen className="size-8 text-resdes-orange" />
                            Books
                        </h1>
                        {canCreateBooks && (
                            <Link to="/books/create" className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80">
                                <Plus className="size-5" />
                                Create Book
                            </Link>
                        )}
                    </div>

                    {/* Filter Bar */}
                    {!loading && books.length > 0 && (
                        <FilterBar
                            searchValue={searchValue}
                            onSearchChange={setSearchValue}
                            filters={filters}
                            onClearAll={handleClearAllFilters}
                        />
                    )}

                    {/* Books Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayBooks.map(book => (
                            <div key={book._id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                                <div className="card-body">
                                    <h2 className="card-title text-lg">
                                        <BookOpen className="size-5 text-resdes-orange" />
                                        {book.title}
                                    </h2>
                                    
                                    {book.description && (
                                        <p className="text-sm text-gray-600 mb-2">
                                            {book.description.length > 100 
                                                ? `${book.description.substring(0, 100)}...` 
                                                : book.description
                                            }
                                        </p>
                                    )}

                                    <div className="text-sm text-gray-500 space-y-1">
                                        <p><strong>Category:</strong> {book.category?.name}</p>
                                        <p><strong>Author:</strong> {book.author?.name}</p>
                                        <p><strong>Documents:</strong> {book.documentCount || 0}</p>
                                        {book.teams?.length > 0 && (
                                            <p><strong>Teams:</strong> {book.teams.map(t => t.name).join(', ')}</p>
                                        )}
                                        {book.projects?.length > 0 && (
                                            <p><strong>Projects:</strong> {book.projects.map(p => p.name).join(', ')}</p>
                                        )}
                                    </div>

                                    <div className="card-actions justify-end mt-4">
                                        <Link to={`/books/${book._id}`} className="btn btn-sm btn-ghost">
                                            <Eye className="size-4" />
                                            View
                                        </Link>
                                        {canEditBooks && (
                                            <>
                                                <Link to={`/books/${book._id}/edit`} className="btn btn-sm btn-ghost">
                                                    <Edit className="size-4" />
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteBook(book._id)}
                                                    className="btn btn-sm btn-ghost text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="size-4" />
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {!loading && books.length === 0 && (
                        <div className="text-center py-12">
                            <BookOpen className="size-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">No books found</h3>
                            <p className="text-gray-500 mb-4">Get started by creating your first book</p>
                            {canCreateBooks && (
                                <Link to="/books/create" className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80">
                                    <Plus className="size-5" />
                                    Create First Book
                                </Link>
                            )}
                        </div>
                    )}

                    {/* No Results State */}
                    {!loading && books.length > 0 && displayBooks.length === 0 && (
                        <div className="text-center py-12">
                            <BookOpen className="size-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">No books match your filters</h3>
                            <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria</p>
                            <button
                                onClick={handleClearAllFilters}
                                className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewBooksPage;