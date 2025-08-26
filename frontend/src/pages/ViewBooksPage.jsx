/*
 * @name ViewBooksPage
 * @file /docman/frontend/src/pages/ViewBooksPage.jsx
 * @page ViewBooksPage
 * @description Books listing page with filtering and management capabilities
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import React, { useState, useEffect } from 'react';
import { Link } from "react-router";
import { BookOpen, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { useUserRole } from "../hooks";
import LoadingSpinner from "../components/LoadingSpinner";
import FilterBar from "../components/filters/FilterBar";
import PaginatedBookTable from "../components/PaginatedBookTable";
import { ensureArray, createSafeArray } from "../lib/safeUtils";

const ViewBooksPage = () => {
    const { userRole } = useUserRole();
    const [books, setBooks] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [pageSize, setPageSize] = useState(10);

    // Filter states
    const [searchValue, setSearchValue] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [ownerFilter, setOwnerFilter] = useState("");
    const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
    const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

    useEffect(() => {
        fetchInitialData();
    }, [pageSize]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', 1);
            params.append('limit', pageSize);

            const [booksRes, categoriesRes, usersRes] = await Promise.all([
                api.get(`/books?${params.toString()}`),
                api.get("/categories?type=Book"),
                api.get("/users")
            ]);

            setBooks(ensureArray(booksRes.data.books));
            setCategories(ensureArray(categoriesRes.data.categories || categoriesRes.data));
            setUsers(ensureArray(usersRes.data.users || usersRes.data));
            setFilteredBooks(ensureArray(booksRes.data.books));
            setPagination(booksRes.data.pagination || null);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchFilteredBooks = async () => {
            try {
                const params = new URLSearchParams();
                if (searchValue) params.append('search', searchValue);
                if (categoryFilter) params.append('category', categoryFilter);
                if (ownerFilter) params.append('owner', ownerFilter);
                if (dateRange.startDate) params.append('startDate', dateRange.startDate);
                if (dateRange.endDate) params.append('endDate', dateRange.endDate);
                if (sortConfig.key) params.append('sortBy', sortConfig.key);
                if (sortConfig.direction) params.append('sortOrder', sortConfig.direction);
                params.append('page', 1);
                params.append('limit', pageSize);

                const res = await api.get(`/books?${params.toString()}`);
                setFilteredBooks(ensureArray(res.data.books));
                setPagination(res.data.pagination || null);
            } catch (error) {
                console.error("Error fetching filtered books:", error);
                toast.error("Failed to filter books");
            }
        };

        fetchFilteredBooks();
    }, [searchValue, categoryFilter, ownerFilter, dateRange, sortConfig, pageSize]);

    const handleClearAllFilters = () => {
        setSearchValue("");
        setCategoryFilter("");
        setOwnerFilter("");
        setDateRange({ startDate: "", endDate: "" });
        setSortConfig({ key: "createdAt", direction: "desc" });
    };

    const handlePageChange = async (newPage) => {
        try {
            const params = new URLSearchParams();
            if (searchValue) params.append('search', searchValue);
            if (categoryFilter) params.append('category', categoryFilter);
            if (ownerFilter) params.append('owner', ownerFilter);
            if (dateRange.startDate) params.append('startDate', dateRange.startDate);
            if (dateRange.endDate) params.append('endDate', dateRange.endDate);
            if (sortConfig.key) params.append('sortBy', sortConfig.key);
            if (sortConfig.direction) params.append('sortOrder', sortConfig.direction);
            params.append('page', newPage);
            params.append('limit', pageSize);

            const res = await api.get(`/books?${params.toString()}`);
            setFilteredBooks(ensureArray(res.data.books));
            setPagination(res.data.pagination || null);
        } catch (error) {
            console.error("Error changing page:", error);
            toast.error("Failed to load page");
        }
    };

    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
    };

    const safeCategoriesArray = createSafeArray(categories);
    const safeUsersArray = createSafeArray(users);

    const filters = [
        {
            key: "category",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: safeCategoriesArray.map(cat => ({
                value: cat._id,
                label: cat.name
            })),
            placeholder: "All Categories",
            label: "Category"
        },
        {
            key: "owner",
            value: ownerFilter,
            onChange: setOwnerFilter,
            options: safeUsersArray.map(user => ({
                value: user._id,
                label: `${user.firstname} ${user.lastname}`
            })),
            placeholder: "All Owners",
            label: "Owner"
        }
    ];

    const canCreateBooks = userRole === "editor" || userRole === "admin" || userRole === "superadmin";

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
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

                    

                    {/* Loading State */}
                    {loading && <LoadingSpinner message="Loading books..." size="lg" color="teal" />}

                    {/* Filter Bar */}
                    {!loading && (books.length > 0 || userRole === 'admin' || userRole === 'superadmin') && (
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
                    {!loading && books.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-lg mb-4">No books found.</p>
                            {canCreateBooks && (
                                <Link
                                    to="/books/create"
                                    className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                >
                                    <Plus size={16} />
                                    Create First Book
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Books Table */}
                    {!loading && filteredBooks.length > 0 && (
                        <PaginatedBookTable
                            books={filteredBooks}
                            setBooks={setFilteredBooks}
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

export default ViewBooksPage;