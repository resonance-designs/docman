/*
 * @name Team Projects Table Component
 * @file /docman/frontend/src/components/teams/TeamProjectsTable.jsx
 * @component TeamProjectsTable
 * @description Specialized table component for managing projects in teams with checkbox selection and bulk actions
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */

import { useState, useMemo, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import SortableHeader from "../filters/SortableHeader";
import PropTypes from "prop-types";

/**
 * Component for displaying projects in a team management table with checkbox selection
 * @param {Object} props - Component properties
 * @param {Array} props.projects - Array of project objects to display
 * @param {Array} props.selectedProjects - Array of selected project IDs
 * @param {Function} props.onProjectSelect - Function to handle project selection
 * @param {Function} props.onSelectAll - Function to handle select all projects
 * @param {number} [props.itemsPerPage=10] - Number of items to display per page
 * @param {Object} [props.sortConfig] - Current sort configuration
 * @param {Function} [props.onSort] - Function to handle sorting
 * @param {Object} [props.pagination] - Backend pagination metadata
 * @param {Function} [props.onPageChange] - Function to handle page changes
 * @param {string} [props.actionType='group'] - Type of action: 'group' or 'ungroup'
 * @returns {JSX.Element} The team projects table component
 */
const TeamProjectsTable = ({
    projects,
    selectedProjects = [],
    onProjectSelect,
    onSelectAll,
    itemsPerPage = 10,
    sortConfig,
    onSort,
    pagination,
    onPageChange,
    onPageSizeChange,
    actionType = 'group'
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(itemsPerPage);

    // Ensure projects is always an array
    const safeProjectsArray = useMemo(() => Array.isArray(projects) ? projects : [], [projects]);

    // Use backend pagination if available, otherwise fallback to client-side
    const totalPages = pagination ? pagination.pages : Math.ceil(safeProjectsArray.length / pageSize);
    const displayCurrentPage = pagination ? pagination.page : currentPage;

    // Calculate display values
    const startIndex = (displayCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const displayStart = startIndex + 1;
    const displayEnd = pagination ? Math.min(endIndex, pagination.total) : Math.min(endIndex, safeProjectsArray.length);
    const displayTotal = pagination ? pagination.total : safeProjectsArray.length;

    // Calculate current projects for display
    const currentProjects = useMemo(() => {
        if (pagination) {
            // Backend pagination - use all projects (they're already paginated)
            return safeProjectsArray;
        } else {
            // Client-side pagination
            return safeProjectsArray.slice(startIndex, endIndex);
        }
    }, [safeProjectsArray, startIndex, endIndex, pagination]);

    // Check if all visible projects are selected
    const allVisibleSelected = currentProjects.length > 0 && currentProjects.every(project => selectedProjects.includes(project._id));
    const someVisibleSelected = currentProjects.some(project => selectedProjects.includes(project._id));

    /**
     * Handle page changes
     * @param {number} page - The page number to navigate to
     */
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            if (onPageChange) {
                onPageChange(page);
            } else {
                setCurrentPage(page);
            }
        }
    };

    /**
     * Navigate to the previous page
     */
    const goToPrevious = () => goToPage(displayCurrentPage - 1);

    /**
     * Navigate to the next page
     */
    const goToNext = () => goToPage(displayCurrentPage + 1);

    /**
     * Handle page size change
     * @param {number} newPageSize - The new page size to set
     */
    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        if (onPageSizeChange) {
            // Use dedicated page size change handler if provided
            onPageSizeChange(newPageSize);
        } else if (onPageChange) {
            // Fallback: trigger page change to reset to page 1
            onPageChange(1);
        } else {
            setCurrentPage(1); // Reset to first page when changing page size
        }
    };

    /**
     * Generate page numbers for pagination controls
     * @returns {Array} Array of page numbers and ellipsis for pagination display
     */
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show smart pagination with ellipsis
            const startPage = Math.max(1, displayCurrentPage - 2);
            const endPage = Math.min(totalPages, displayCurrentPage + 2);

            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push('...');
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    /**
     * Handle select all checkbox
     */
    const handleSelectAll = () => {
        if (onSelectAll) {
            onSelectAll(currentProjects.map(project => project._id), !allVisibleSelected);
        }
    };

    /**
     * Handle individual project selection
     * @param {string} projectId - ID of the project to select/deselect
     */
    const handleProjectSelect = (projectId) => {
        if (onProjectSelect) {
            onProjectSelect(projectId);
        }
    };

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    /**
     * Get status badge color
     * @param {string} status - Project status
     * @returns {string} CSS classes for status badge
     */
    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'completed':
                return 'bg-blue-100 text-blue-800';
            case 'on-hold':
                return 'bg-yellow-100 text-yellow-800';
            case 'archived':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Get priority badge color
     * @param {string} priority - Project priority
     * @returns {string} CSS classes for priority badge
     */
    const getPriorityBadgeColor = (priority) => {
        switch (priority) {
            case 'critical':
                return 'bg-red-100 text-red-800';
            case 'high':
                return 'bg-orange-100 text-orange-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            case 'low':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Reset to page 1 when projects change (client-side only)
     */
    useEffect(() => {
        if (!pagination && displayCurrentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [safeProjectsArray.length, totalPages, displayCurrentPage, pagination]);

    if (safeProjectsArray.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No projects found.
            </div>
        );
    }

    return (
        <div className="relative flex flex-col w-full text-gray-700 shadow-md rounded-xl bg-clip-border">
            {/* Table */}
            <div className="overflow-x-auto rounded-t-xl border-resdes-orange">
                <table className="w-full text-left table-auto min-w-max border-b border-resdes-orange">
                    <thead className="bg-resdes-orange text-slate-950 font-mono font-bold rounded-t-xl">
                        <tr>
                            <th className="p-4">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    ref={input => {
                                        if (input) input.indeterminate = someVisibleSelected && !allVisibleSelected;
                                    }}
                                    onChange={handleSelectAll}
                                    className="checkbox checkbox-sm bg-slate-200"
                                />
                            </th>
                            {sortConfig && onSort ? (
                                <>
                                    <SortableHeader
                                        sortKey="name"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Name
                                    </SortableHeader>
                                    <SortableHeader
                                        sortKey="status"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Status
                                    </SortableHeader>
                                    <SortableHeader
                                        sortKey="priority"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Priority
                                    </SortableHeader>
                                    <SortableHeader
                                        sortKey="owner"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Owner
                                    </SortableHeader>
                                    <SortableHeader
                                        sortKey="teams"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Teams
                                    </SortableHeader>
                                    <SortableHeader
                                        sortKey="createdAt"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Created On
                                    </SortableHeader>
                                </>
                            ) : (
                                <>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Name
                                        </p>
                                    </th>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Status
                                        </p>
                                    </th>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Priority
                                        </p>
                                    </th>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Owner
                                        </p>
                                    </th>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Teams
                                        </p>
                                    </th>
                                    <th className="p-4 float-right">
                                        <p className="block text-sm antialiased leading-none">
                                            Created On
                                        </p>
                                    </th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="border border-resdes-orange">
                        {currentProjects.map((project) => (
                            <tr key={project._id} className="border-b bg-base-300 border-resdes-orange hover:bg-base-100">
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedProjects.includes(project._id)}
                                        onChange={() => handleProjectSelect(project._id)}
                                        className="checkbox checkbox-sm bg-slate-200"
                                    />
                                </td>
                                <td className="p-4">
                                    <div>
                                        <p className="block text-sm antialiased font-semibold text-slate-200">
                                            {project.name}
                                        </p>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(project.status)}`}>
                                        {project.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeColor(project.priority)}`}>
                                        {project.priority}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <p className="block text-sm antialiased leading-normal text-slate-200">
                                        {project.owner ? `${project.owner.firstname} ${project.owner.lastname}` : 'Unknown'}
                                    </p>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        {project.teams && project.teams.length > 0 ? (
                                            project.teams.slice(0, 2).map((team, index) => (
                                                <p key={team._id || index} className="block text-sm antialiased leading-normal text-slate-200">
                                                    {team.name}
                                                </p>
                                            ))
                                        ) : (
                                            <p className="block text-sm antialiased leading-normal text-slate-200">
                                                No teams
                                            </p>
                                        )}
                                        {project.teams && project.teams.length > 2 && (
                                            <p className="block text-xs antialiased leading-normal text-slate-200">
                                                +{project.teams.length - 2} more
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 float-right">
                                    <p className="block text-sm antialiased leading-normal text-slate-400">
                                        {formatDate(project.createdAt)}
                                    </p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 rounded-b-xl">
                    <div className="flex items-center text-sm text-gray-700">
                        <span>
                            Showing {displayStart} to {displayEnd} of {displayTotal} results
                        </span>
                        <select
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                            className="ml-4 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                            <option value={5}>5 per page</option>
                            <option value={10}>10 per page</option>
                            <option value={25}>25 per page</option>
                            <option value={50}>50 per page</option>
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={goToPrevious}
                            disabled={displayCurrentPage === 1}
                            className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeftIcon className="w-4 h-4" />
                        </button>

                        {getPageNumbers().map((page, index) => (
                            <button
                                key={index}
                                onClick={() => typeof page === 'number' && goToPage(page)}
                                disabled={page === '...'}
                                className={`px-3 py-1 text-sm font-medium rounded-md ${
                                    page === displayCurrentPage
                                        ? 'text-white bg-resdes-blue border border-resdes-blue'
                                        : page === '...'
                                        ? 'text-gray-400 cursor-default'
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={goToNext}
                            disabled={displayCurrentPage === totalPages}
                            className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

TeamProjectsTable.propTypes = {
    projects: PropTypes.array.isRequired,
    selectedProjects: PropTypes.array,
    onProjectSelect: PropTypes.func.isRequired,
    onSelectAll: PropTypes.func.isRequired,
    itemsPerPage: PropTypes.number,
    sortConfig: PropTypes.object,
    onSort: PropTypes.func,
    pagination: PropTypes.object,
    onPageChange: PropTypes.func,
    onPageSizeChange: PropTypes.func,
    actionType: PropTypes.oneOf(['group', 'ungroup'])
};

export default TeamProjectsTable;