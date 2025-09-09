/*
 * @name ViewCatsPage
 * @file /docman/frontend/src/pages/ViewCatsPage.jsx
 * @page ViewCatsPage
 * @description Category management page for viewing, creating, and organizing document categories
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PlusIcon, FolderIcon, FolderPlus } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import PaginatedCatTable from "../components/PaginatedCatTable";

const ViewCatsPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [pageSize, setPageSize] = useState(10);

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
        }
    }, []);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const params = new URLSearchParams();
                params.append('page', 1);
                params.append('limit', pageSize);
                
                const res = await api.get(`/categories?${params.toString()}`, { headers });
                const data = res.data;
                const categoriesArray = Array.isArray(data) ? data : (data.categories || []);
                setCategories(categoriesArray);
                setPagination(data.pagination || null);
            } catch (error) {
                console.error("Error fetching categories:", error);
                toast.error("Failed to load categories");
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [pageSize]);

    // Handle page change
    const handlePageChange = async (page) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('limit', pageSize);
            
            const res = await api.get(`/categories?${params.toString()}`, { headers });
            const data = res.data;
            const categoriesArray = Array.isArray(data) ? data : (data.categories || []);
            setCategories(categoriesArray);
            setPagination(data.pagination || null);
        } catch (error) {
            console.error("Error fetching categories:", error);
            toast.error("Failed to load categories");
        } finally {
            setLoading(false);
        }
    };

    // Handle page size change
    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        // This will trigger the useEffect to refetch data with new page size
    };

    // Check if user can create categories (editor or admin)
    const canCreateCategory = userRole === "editor" || userRole === "admin" || userRole === "superadmin";

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
                            <FolderIcon className="size-8 text-resdes-orange" />
                            Categories
                        </h1>
                        {canCreateCategory && (
                            <Link
                                to="/create-category"
                                className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                            >
                                <FolderPlus size={16} />
                                Add Category
                            </Link>
                        )}
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center text-resdes-teal py-10">
                            <LoadingSpinner 
                                message="Loading categories..." 
                                size="lg" 
                                color="blue" 
                            />
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && categories.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-lg mb-4">No categories found.</p>
                            {canCreateCategory && (
                                <Link
                                    to="/create-category"
                                    className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                >
                                    <PlusIcon size={16} />
                                    Create First Category
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Categories Table */}
                    {!loading && categories.length > 0 && (
                        <PaginatedCatTable
                            categories={categories}
                            setCategories={setCategories}
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewCatsPage;
