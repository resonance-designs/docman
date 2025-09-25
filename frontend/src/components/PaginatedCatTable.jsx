/*
 * @name Paginated Category Table Component
 * @file /docman/frontend/src/components/PaginatedCatTable.jsx
 * @component PaginatedCatTable
 * @description Component for displaying categories in a paginated table.
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */

import { useState, useMemo, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import CatTable from "./CatTable";
import PropTypes from "prop-types";

/**
 * Component for displaying categories in a paginated table
 * @param {Object} props - Component properties
 * @param {Array} props.categories - Array of category objects to display
 * @param {Function} props.setCategories - Function to update the categories list
 * @param {number} [props.itemsPerPage=10] - Number of items to display per page
 * @returns {JSX.Element} The paginated category table component
 */
const PaginatedCatTable = ({ categories, setCategories, itemsPerPage = 10, pagination, onPageChange, onPageSizeChange }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(itemsPerPage);

    // Use backend pagination if available, otherwise fallback to client-side
    const totalPages = pagination ? pagination.pages : Math.ceil(categories.length / pageSize);
    const displayCurrentPage = pagination ? pagination.page : currentPage;
    
    // Calculate display values
    const startIndex = (displayCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const displayStart = startIndex + 1;
    const displayEnd = pagination ? Math.min(endIndex, pagination.total) : Math.min(endIndex, categories.length);
    const displayTotal = pagination ? pagination.total : categories.length;
    
    // Calculate current categories for display
    const currentCategories = useMemo(() => {
        if (pagination) {
            // Backend pagination - use all categories (they're already paginated)
            return categories;
        } else {
            // Client-side pagination
            return categories.slice(startIndex, endIndex);
        }
    }, [categories, startIndex, endIndex, pagination]);

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
            const displayCurrentPage = pagination ? pagination.page : currentPage;
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
     * Reset to page 1 when categories change (client-side only)
     */
    useEffect(() => {
        if (!pagination && currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [categories.length, totalPages, currentPage, pagination]);

    if (categories.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No categories found.
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
                                <p className="block text-sm antialiased leading-none">
                                    Name
                                </p>
                            </th>
                            <th className="p-4">
                                <p className="block text-sm antialiased leading-none">
                                    Type
                                </p>
                            </th>
                            <th className="p-4">
                                <p className="block text-sm antialiased leading-none">
                                    Created
                                </p>
                            </th>
                            <th className="p-4">
                                <p className="block text-sm antialiased leading-none float-right">
                                    Actions
                                </p>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="border border-resdes-orange">
                        {currentCategories.map((category) => (
                            <CatTable key={category._id} category={category} setCategories={setCategories} />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {displayTotal > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-resdes-orange bg-resdes-orange text-slate-950 font-mono font-bold rounded-b-xl">
                    {/* Results info and page size selector */}
                    <div className="flex items-center gap-4">
                        <div className="text-sm">
                            Showing {displayStart} to {displayEnd} of {displayTotal} categories
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">Show:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                className="select select-sm select-bordered bg-white text-slate-950"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-sm">per page</span>
                        </div>
                    </div>

                    {/* Pagination buttons - only show if more than 1 page */}
                    {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        {/* Previous button */}
                        <button
                            onClick={goToPrevious}
                            disabled={displayCurrentPage === 1}
                            className="btn btn-sm bg-white text-slate-950 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Previous page"
                        >
                            <ChevronLeftIcon size={16} />
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                            {getPageNumbers().map((page, index) => {
                                const isCurrentPage = page === displayCurrentPage;
                                const isEllipsis = page === '...';

                                let buttonClass = 'bg-white text-slate-950 hover:bg-gray-100';
                                if (isCurrentPage) {
                                    buttonClass = 'bg-resdes-teal text-slate-950';
                                } else if (isEllipsis) {
                                    buttonClass = 'bg-white text-slate-950 cursor-default';
                                }

                                return (
                                    <button
                                        key={`page-${page}-${index}`}
                                        onClick={() => typeof page === 'number' && goToPage(page)}
                                        disabled={isEllipsis}
                                        className={`btn btn-sm ${buttonClass}`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Next button */}
                        <button
                            onClick={goToNext}
                            disabled={displayCurrentPage === totalPages}
                            className="btn btn-sm bg-white text-slate-950 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Next page"
                        >
                            <ChevronRightIcon size={16} />
                        </button>
                    </div>
                    )}
                </div>
            )}
        </div>
    );
};

PaginatedCatTable.propTypes = {
    categories: PropTypes.arrayOf(
        PropTypes.shape({
            _id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            description: PropTypes.string,
            type: PropTypes.string,
            createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        })
    ).isRequired,
    setCategories: PropTypes.func.isRequired,
    itemsPerPage: PropTypes.number,
    pagination: PropTypes.shape({
        total: PropTypes.number.isRequired,
        page: PropTypes.number.isRequired,
        limit: PropTypes.number.isRequired,
        pages: PropTypes.number.isRequired
    }),
    onPageChange: PropTypes.func,
    onPageSizeChange: PropTypes.func
};

export default PaginatedCatTable;
