/*
 * @name Paginated Category Table Component
 * @file /docman/frontend/src/components/PaginatedCatTable.jsx
 * @component PaginatedCatTable
 * @description Component for displaying categories in a paginated table.
 * @author Richard Bakos
 * @version 2.0.0
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
 * @param {number} [props.itemsPerPage=25] - Number of items to display per page
 * @returns {JSX.Element} The paginated category table component
 */
const PaginatedCatTable = ({ categories, setCategories, itemsPerPage = 25 }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(itemsPerPage);

    // Calculate pagination values
    const totalPages = Math.ceil(categories.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentCategories = useMemo(() => categories.slice(startIndex, endIndex), [categories, startIndex, endIndex]);

    /**
     * Handle page changes
     * @param {number} page - The page number to navigate to
     */
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    /**
     * Navigate to the previous page
     */
    const goToPrevious = () => goToPage(currentPage - 1);

    /**
     * Navigate to the next page
     */
    const goToNext = () => goToPage(currentPage + 1);

    /**
     * Handle page size change
     * @param {number} newPageSize - The new page size to set
     */
    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        setCurrentPage(1); // Reset to first page when changing page size
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
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);

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
     * Reset to page 1 when categories change
     */
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [categories.length, totalPages, currentPage]);

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
                                    Description
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
            {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-resdes-orange bg-resdes-orange text-slate-950 font-mono font-bold rounded-b-xl">
                    {/* Results info and page size selector */}
                    <div className="flex items-center gap-4">
                        <div className="text-sm">
                            Showing {startIndex + 1} to {Math.min(endIndex, categories.length)} of {categories.length} categories
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">Show:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                className="select select-sm select-bordered bg-white text-black"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-sm">per page</span>
                        </div>
                    </div>

                    {/* Pagination buttons */}
                    <div className="flex items-center gap-2">
                        {/* Previous button */}
                        <button
                            onClick={goToPrevious}
                            disabled={currentPage === 1}
                            className="btn btn-sm bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Previous page"
                        >
                            <ChevronLeftIcon size={16} />
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                            {getPageNumbers().map((page, index) => {
                                const isCurrentPage = page === currentPage;
                                const isEllipsis = page === '...';

                                let buttonClass = 'bg-white text-black hover:bg-gray-100';
                                if (isCurrentPage) {
                                    buttonClass = 'bg-resdes-teal text-white';
                                } else if (isEllipsis) {
                                    buttonClass = 'bg-white text-black cursor-default';
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
                            disabled={currentPage === totalPages}
                            className="btn btn-sm bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Next page"
                        >
                            <ChevronRightIcon size={16} />
                        </button>
                    </div>
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
            createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        })
    ).isRequired,
    setCategories: PropTypes.func.isRequired,
    itemsPerPage: PropTypes.number,
};

export default PaginatedCatTable;
