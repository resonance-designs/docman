/*
 * @name Paginated Document Table Component
 * @file /docman/frontend/src/components/PaginatedDocTable.jsx
 * @component PaginatedDocTable
 * @description Paginated table component for displaying documents with sorting, filtering, and bulk actions
 * @author Richard Bakos
 * @version 2.1.3
 * @license UNLICENSED
 */

import { useState, useMemo, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import DocTable from "./DocTable";
import SortableHeader from "./filters/SortableHeader";
import PropTypes from "prop-types";

/**
 * Component for displaying documents in a paginated table with sorting capabilities
 * @param {Object} props - Component properties
 * @param {Array} props.docs - Array of document objects to display
 * @param {Function} props.setDocs - Function to update the documents list
 * @param {number} [props.itemsPerPage=10] - Number of items to display per page
 * @param {Object} [props.sortConfig] - Current sort configuration
 * @param {Function} [props.onSort] - Function to handle sorting
 * @param {Object} [props.pagination] - Backend pagination metadata
 * @param {Function} [props.onPageChange] - Function to handle page changes
 * @returns {JSX.Element} The paginated document table component
 */
const PaginatedDocTable = ({ docs, setDocs, itemsPerPage = 10, sortConfig, onSort, pagination, onPageChange, onPageSizeChange }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(itemsPerPage);

    // Ensure docs is always an array
    const safeDocsArray = useMemo(() => Array.isArray(docs) ? docs : [], [docs]);

    // Use backend pagination if available, otherwise fallback to client-side
    const totalPages = pagination ? pagination.pages : Math.ceil(safeDocsArray.length / pageSize);
    const displayCurrentPage = pagination ? pagination.page : currentPage;

    // Calculate display values
    const startIndex = (displayCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const displayStart = startIndex + 1;
    const displayEnd = pagination ? Math.min(endIndex, pagination.total) : Math.min(endIndex, safeDocsArray.length);
    const displayTotal = pagination ? pagination.total : safeDocsArray.length;

    // Calculate current docs for display
    const currentDocs = useMemo(() => {
        if (pagination) {
            // Backend pagination - use all docs (they're already paginated)
            return safeDocsArray;
        } else {
            // Client-side pagination
            return safeDocsArray.slice(startIndex, endIndex);
        }
    }, [safeDocsArray, startIndex, endIndex, pagination]);

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
     * Reset to page 1 when docs change (client-side only)
     */
    useEffect(() => {
        if (!pagination && displayCurrentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [safeDocsArray.length, totalPages, displayCurrentPage, pagination]);

    if (safeDocsArray.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No documents found.
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
                            {sortConfig && onSort ? (
                                <>
                                    <SortableHeader
                                        sortKey="title"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Title
                                    </SortableHeader>
                                    <SortableHeader
                                        sortKey="author"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Author
                                    </SortableHeader>
                                    <SortableHeader
                                        sortKey="createdAt"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Added On
                                    </SortableHeader>
                                    <SortableHeader
                                        sortKey="reviewDate"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Review Date
                                    </SortableHeader>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none float-right">
                                            Actions
                                        </p>
                                    </th>
                                </>
                            ) : (
                                <>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Title
                                        </p>
                                    </th>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Author
                                        </p>
                                    </th>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Added On
                                        </p>
                                    </th>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Review Date
                                        </p>
                                    </th>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none float-right">
                                            Actions
                                        </p>
                                    </th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="border border-resdes-orange">
                        {currentDocs.map((doc) => (
                            <DocTable key={doc._id} doc={doc} setDocs={setDocs} />
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
                            Showing {displayStart} to {displayEnd} of {displayTotal} documents
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

PaginatedDocTable.propTypes = {
    docs: PropTypes.arrayOf(
        PropTypes.shape({
            _id: PropTypes.string.isRequired,
            title: PropTypes.string.isRequired,
            author: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.shape({
                    _id: PropTypes.string,
                    firstname: PropTypes.string,
                    lastname: PropTypes.string,
                    email: PropTypes.string
                })
            ]).isRequired,
            description: PropTypes.string.isRequired,
            createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
            reviewDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        })
    ).isRequired,
    setDocs: PropTypes.func.isRequired,
    itemsPerPage: PropTypes.number,
    sortConfig: PropTypes.shape({
        key: PropTypes.string.isRequired,
        direction: PropTypes.oneOf(["asc", "desc"]).isRequired
    }),
    onSort: PropTypes.func,
    pagination: PropTypes.shape({
        total: PropTypes.number.isRequired,
        page: PropTypes.number.isRequired,
        limit: PropTypes.number.isRequired,
        pages: PropTypes.number.isRequired
    }),
    onPageChange: PropTypes.func,
    onPageSizeChange: PropTypes.func
};

export default PaginatedDocTable;
