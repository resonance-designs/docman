/*
 * @name ViewUsersPage
 * @file /docman/frontend/src/pages/ViewUsersPage.jsx
 * @page ViewUsersPage
 * @description User management page with filtering, search, and user administration for system administrators
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { UserPlusIcon, UsersIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import PaginatedUserTable from "../components/PaginatedUserTable";
import FilterBar from "../components/filters/FilterBar";

const ViewUsersPage = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);

    // Filter states
    const [searchValue, setSearchValue] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "firstname", direction: "asc" });

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
        }
    }, []);

    // Fetch initial users
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get("/users", { headers });
                setUsers(res.data);
            } catch (error) {
                console.error("Error fetching users:", error);
                toast.error("Failed to load users");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Fetch filtered users when filters change
    useEffect(() => {
        const fetchFilteredUsers = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                // Build query parameters
                const params = new URLSearchParams();
                if (searchValue) params.append('search', searchValue);
                if (roleFilter) params.append('role', roleFilter);
                if (sortConfig.key) params.append('sortBy', sortConfig.key);
                if (sortConfig.direction) params.append('sortOrder', sortConfig.direction);

                const queryString = params.toString();
                const url = queryString ? `/users?${queryString}` : '/users';

                const res = await api.get(url, { headers });
                setFilteredUsers(res.data);
            } catch (error) {
                console.error("Error fetching filtered users:", error);
                toast.error("Failed to filter users");
            }
        };

        // Only fetch if we have initial data or active filters
        if (users.length > 0 || searchValue || roleFilter) {
            fetchFilteredUsers();
        }
    }, [searchValue, roleFilter, sortConfig, users.length]);

    // Check if user can create users (admin only)
    const canCreateUser = userRole === "admin";

    // Role filter options
    const roleOptions = [
        { value: "admin", label: "Admin" },
        { value: "editor", label: "Editor" },
        { value: "viewer", label: "Viewer" }
    ];

    // Filter configuration
    const filters = [
        {
            key: "role",
            value: roleFilter,
            onChange: setRoleFilter,
            options: roleOptions,
            placeholder: "All Roles",
            label: "Role"
        }
    ];

    // Clear all filters
    const handleClearAllFilters = () => {
        setSearchValue("");
        setRoleFilter("");
        setSortConfig({ key: "firstname", direction: "asc" });
    };

    // Determine which users to display
    const displayUsers = filteredUsers.length > 0 || searchValue || roleFilter
        ? filteredUsers
        : users;

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
                            <UsersIcon className="size-8 text-resdes-orange" />
                            Users
                        </h1>
                        {canCreateUser && (
                            <Link
                                to="/register"
                                className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                            >
                                <UserPlusIcon size={16} />
                                Add User
                            </Link>
                        )}
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center text-resdes-teal py-10">
                            Loading users...
                        </div>
                    )}

                    {/* Filter Bar */}
                    {!loading && users.length > 0 && (
                        <FilterBar
                            searchValue={searchValue}
                            onSearchChange={setSearchValue}
                            filters={filters}
                            onClearAll={handleClearAllFilters}
                        />
                    )}

                    {/* Empty State */}
                    {!loading && users.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-lg mb-4">No users found.</p>
                            {canCreateUser && (
                                <Link
                                    to="/register"
                                    className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                >
                                    <UserPlusIcon size={16} />
                                    Create First User
                                </Link>
                            )}
                        </div>
                    )}

                    {/* No Results State */}
                    {!loading && users.length > 0 && displayUsers.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-lg mb-4">No users match your filters.</p>
                            <button
                                onClick={handleClearAllFilters}
                                className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}

                    {/* Users Table */}
                    {!loading && displayUsers.length > 0 && (
                        <PaginatedUserTable
                            users={displayUsers}
                            setUsers={setFilteredUsers}
                            sortConfig={sortConfig}
                            onSort={setSortConfig}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewUsersPage;
