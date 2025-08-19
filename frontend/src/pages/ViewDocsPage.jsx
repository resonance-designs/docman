/*
 * @name ViewDocsPage
 * @file /docman/frontend/src/pages/ViewDocsPage.jsx
 * @page ViewDocsPage
 * @description Document listing page with search, filtering, sorting, and bulk operations for managing documents
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FileTextIcon, PlusIcon, FilePlus2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import PaginatedDocTable from "../components/PaginatedDocTable";
import FilterBar from "../components/filters/FilterBar";
import LoadingSpinner from "../components/LoadingSpinner";
import { ensureArray, createSafeArray } from "../lib/safeUtils";

/**
 * Page component for viewing and filtering documents
 * @returns {JSX.Element} The view documents page component
 */
const ViewDocsPage = () => {
    const [docs, setDocs] = useState([]);
    const [filteredDocs, setFilteredDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [pageSize, setPageSize] = useState(10);

    // Filter states
    const [searchValue, setSearchValue] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [authorFilter, setAuthorFilter] = useState("");
    const [overdueFilter, setOverdueFilter] = useState("");
    const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
    const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

    /**
     * Get user role from token when component mounts
     */
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
        }
    }, []);

    /**
     * Fetch initial data when component mounts
     * Gets documents, categories, and users in parallel requests
     */
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch all data in parallel
                const params = new URLSearchParams();
                params.append('page', 1);
                params.append('limit', pageSize);
                
                const [docsRes, categoriesRes, usersRes] = await Promise.all([
                    api.get(`/docs?${params.toString()}`),
                    api.get("/categories?type=Document"),
                    api.get("/users")
                ]);

                // Handle different response structures for docs
                let docsArray = [];
                if (Array.isArray(docsRes.data)) {
                    docsArray = docsRes.data;
                } else if (docsRes.data && Array.isArray(docsRes.data.documents)) {
                    docsArray = docsRes.data.documents;
                } else if (docsRes.data && Array.isArray(docsRes.data.docs)) {
                    docsArray = docsRes.data.docs;
                } else {
                    console.warn("📄 ViewDocsPage: Unexpected docs response structure:", docsRes.data);
                }
                
                setDocs(ensureArray(docsArray));
                setCategories(ensureArray(categoriesRes.data.categories || categoriesRes.data));
                setUsers(ensureArray(usersRes.data.users || usersRes.data));
                setFilteredDocs(ensureArray(docsArray));
                setPagination(docsRes.data.pagination || null);
            } catch (error) {
                console.error("Error fetching data:", error);
                console.error("Error details:", error.response?.data || error.message);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [pageSize]);

    /**
     * Fetch filtered documents when filter parameters change
     * Builds query parameters and makes API request with filters
     */
    useEffect(() => {
        const fetchFilteredDocs = async () => {
            try {
                // Build query parameters
                const params = new URLSearchParams();
                if (searchValue) params.append('search', searchValue);
                if (categoryFilter) params.append('category', categoryFilter);
                if (authorFilter) params.append('author', authorFilter);
                if (overdueFilter) params.append('overdue', overdueFilter);
                if (dateRange.startDate) params.append('startDate', dateRange.startDate);
                if (dateRange.endDate) params.append('endDate', dateRange.endDate);
                if (sortConfig.key) params.append('sortBy', sortConfig.key);
                if (sortConfig.direction) params.append('sortOrder', sortConfig.direction);
                params.append('page', 1);
                params.append('limit', pageSize);

                const queryString = params.toString();
                const url = queryString ? `/docs?${queryString}` : '/docs';

                const res = await api.get(url);
                // Handle different response structures for docs
                let docsArray = [];
                if (Array.isArray(res.data)) {
                    docsArray = res.data;
                } else if (res.data && Array.isArray(res.data.documents)) {
                    docsArray = res.data.documents;
                } else if (res.data && Array.isArray(res.data.docs)) {
                    docsArray = res.data.docs;
                } else {
                    console.warn("📄 ViewDocsPage: Unexpected filtered docs response structure:", res.data);
                }
                
                setFilteredDocs(ensureArray(docsArray));
                setPagination(res.data.pagination || null);
            } catch (error) {
                console.error("Error fetching filtered documents:", error);
                toast.error("Failed to filter documents");
            }
        };

        // Fetch filtered docs when filters change, or when initial data is loaded
        // Always fetch on initial load to ensure data consistency
        fetchFilteredDocs();
    }, [searchValue, categoryFilter, authorFilter, overdueFilter, dateRange, sortConfig, pageSize]);

    // Check if user can create documents (editor or admin)
    const canCreateDocument = userRole === "editor" || userRole === "admin";

    // Filter options with safe array handling
    const safeCategoriesArray = createSafeArray(categories);
    const safeUsersArray = createSafeArray(users);

    const categoryOptions = safeCategoriesArray.map(cat => ({
        value: cat._id,
        label: cat.name
    }));

    const authorOptions = safeUsersArray.map(user => ({
        value: user._id,
        label: `${user.firstname} ${user.lastname}`
    }));

    const overdueOptions = [
        { value: "true", label: "Overdue Only" },
        { value: "false", label: "Not Overdue" }
    ];

    // Filter configuration
    const filters = [
        {
            key: "category",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: categoryOptions,
            placeholder: "All Categories",
            label: "Category"
        },
        {
            key: "author",
            value: authorFilter,
            onChange: setAuthorFilter,
            options: authorOptions,
            placeholder: "All Authors",
            label: "Author"
        },
        {
            key: "overdue",
            value: overdueFilter,
            onChange: setOverdueFilter,
            options: overdueOptions,
            placeholder: "All Documents",
            label: "Review Status"
        }
    ];

    /**
     * Clear all filter parameters and reset to default values
     */
    const handleClearAllFilters = () => {
        setSearchValue("");
        setCategoryFilter("");
        setAuthorFilter("");
        setOverdueFilter("");
        setDateRange({ startDate: "", endDate: "" });
        setSortConfig({ key: "createdAt", direction: "desc" });
    };

    // Handle page change
    const handlePageChange = async (page) => {
        setLoading(true);
        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (searchValue) params.append('search', searchValue);
            if (categoryFilter) params.append('category', categoryFilter);
            if (authorFilter) params.append('author', authorFilter);
            if (overdueFilter) params.append('overdue', overdueFilter);
            if (dateRange.startDate) params.append('startDate', dateRange.startDate);
            if (dateRange.endDate) params.append('endDate', dateRange.endDate);
            if (sortConfig.key) params.append('sortBy', sortConfig.key);
            if (sortConfig.direction) params.append('sortOrder', sortConfig.direction);
            params.append('page', page);
            params.append('limit', pageSize);

            const queryString = params.toString();
            const url = queryString ? `/docs?${queryString}` : '/docs';

            const res = await api.get(url);
            // Handle different response structures for docs
            let docsArray = [];
            if (Array.isArray(res.data)) {
                docsArray = res.data;
            } else if (res.data && Array.isArray(res.data.documents)) {
                docsArray = res.data.documents;
            } else if (res.data && Array.isArray(res.data.docs)) {
                docsArray = res.data.docs;
            } else {
                console.warn("📄 ViewDocsPage: Unexpected filtered docs response structure:", res.data);
            }
            
            setFilteredDocs(ensureArray(docsArray));
            setPagination(res.data.pagination || null);
        } catch (error) {
            console.error("Error fetching filtered documents:", error);
            toast.error("Failed to filter documents");
        } finally {
            setLoading(false);
        }
    };

    // Handle page size change
    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        // This will trigger the useEffect to refetch data with new page size
    };

    // Determine which docs to display
    const displayDocs = filteredDocs.length > 0 || searchValue || categoryFilter || authorFilter || overdueFilter || dateRange.startDate || dateRange.endDate
        ? filteredDocs
        : docs;

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
                            <FileTextIcon className="size-8 text-resdes-orange" />
                            Documents
                        </h1>
                        {canCreateDocument && (
                            <Link
                                to="/create"
                                className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                            >
                                <FilePlus2 size={16} />
                                Add Document
                            </Link>
                        )}
                    </div>
                    
                    {/* Loading State */}
                    {loading && (
                        <LoadingSpinner 
                            message="Loading documents..." 
                            size="lg" 
                            color="teal" 
                        />
                    )}

                    {/* Filter Bar - Show when not loading and we have docs or are admin */}
                    {!loading && (docs.length > 0 || userRole === 'admin') && (
                        <FilterBar
                            searchValue={searchValue}
                            onSearchChange={setSearchValue}
                            filters={filters}
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                            onClearAll={handleClearAllFilters}
                        />
                    )}

                    {/* Empty State */}
                    {!loading && docs.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-lg mb-4">No documents found.</p>
                            {canCreateDocument && (
                                <Link
                                    to="/create"
                                    className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                >
                                    <PlusIcon size={16} />
                                    Create First Document
                                </Link>
                            )}
                        </div>
                    )}

                    {/* No Results State */}
                    {!loading && docs.length > 0 && displayDocs.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-lg mb-4">No documents match your filters.</p>
                            <button
                                onClick={handleClearAllFilters}
                                className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}

                    {/* Documents Table */}
                    {!loading && displayDocs.length > 0 && (
                        <PaginatedDocTable
                            docs={displayDocs}
                            setDocs={setFilteredDocs}
                            sortConfig={sortConfig}
                            onSort={setSortConfig}
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

export default ViewDocsPage;
