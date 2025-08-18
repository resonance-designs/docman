/*
 * @name Paginated Book Table Component
 * @file /docman/frontend/src/components/PaginatedBookTable.jsx
 * @component PaginatedBookTable
 * @description Paginated table component for displaying books with sorting, filtering, and bulk actions
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */

import { useState, useMemo, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import BookTable from "./BookTable";
import SortableHeader from "./filters/SortableHeader";
import PropTypes from "prop-types";

/**
 * Component for displaying books in a paginated table with sorting capabilities
 * @param {Object} props - Component properties
 * @param {Array} props.books - Array of book objects to display
 * @param {Function} props.setBooks - Function to update the books list
 * @param {number} [props.itemsPerPage=10] - Number of items to display per page
 * @param {Object} [props.sortConfig] - Current sort configuration
 * @param {Function} [props.onSort] - Function to handle sorting
 * @param {Object} [props.pagination] - Backend pagination metadata
 * @param {Function} [props.onPageChange] - Function to handle page changes
 * @returns {JSX.Element} The paginated book table component
 */
const PaginatedBookTable = ({ books, setBooks, itemsPerPage = 10, sortConfig, onSort, pagination, onPageChange, onPageSizeChange }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(itemsPerPage);

    // Ensure books is always an array
    const safeBooksArray = useMemo(() => Array.isArray(books) ? books : [], [books]);

    // Use backend pagination if available, otherwise fallback to client-side
    const totalPages = pagination ? pagination.pages : Math.ceil(safeBooksArray.length / pageSize);
    const displayCurrentPage = pagination ? pagination.page : currentPage;

    // Calculate display values
    const startIndex = (displayCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const displayStart = startIndex + 1;
    const displayEnd = pagination ? Math.min(endIndex, pagination.total) : Math.min(endIndex, safeBooksArray.length);
    const displayTotal = pagination ? pagination.total : safeBooksArray.length;

    // Calculate current books for display
    const currentBooks = useMemo(() => {
        if (pagination) {
            // Backend pagination - use all books (they're already paginated)
            return safeBooksArray;
        } else {
            // Client-side pagination
            return safeBooksArray.slice(startIndex, endIndex);
        }
    }, [safeBooksArray, startIndex, endIndex, pagination]);

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
     * Reset to page 1 when books change (client-side only)
     */
    useEffect(() => {
        if (!pagination && displayCurrentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [safeBooksArray.length, totalPages, displayCurrentPage, pagination]);

    if (safeBooksArray.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No books found.
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
                                        sortKey="category"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Category
                                    </SortableHeader>
                                    <SortableHeader
                                        sortKey="documentCount"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Documents
                                    </SortableHeader>
                                    <SortableHeader
                                        sortKey="createdAt"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Created On
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
                                            Category
                                        </p>
                                    </th>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Documents
                                        </p>
                                    </th>
                                    <th className="p-4">
                                        <p className="block text-sm antialiased leading-none">
                                            Created On
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
                        {currentBooks.map((book) => (
                            <BookTable key={book._id} book={book} setBooks={setBooks} />
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
                            Showing {displayStart} to {displayEnd} of {displayTotal} books
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

PaginatedBookTable.propTypes = {
    books: PropTypes.array.isRequired,
    setBooks: PropTypes.func.isRequired,
    itemsPerPage: PropTypes.number,
    sortConfig: PropTypes.object,
    onSort: PropTypes.func,
    pagination: PropTypes.object,
    onPageChange: PropTypes.func,
    onPageSizeChange: PropTypes.func,
};

export default PaginatedBookTable;