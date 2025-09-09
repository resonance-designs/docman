/*
 * @name Team Books Table Component
 * @file /docman/frontend/src/components/teams/TeamBooksTable.jsx
 * @component TeamBooksTable
 * @description Specialized table component for managing books in teams with checkbox selection and bulk actions
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */

import { useState, useMemo, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import SortableHeader from "../filters/SortableHeader";
import PropTypes from "prop-types";

/**
 * Component for displaying books in a team management table with checkbox selection
 * @param {Object} props - Component properties
 * @param {Array} props.books - Array of book objects to display
 * @param {Array} props.selectedBooks - Array of selected book IDs
 * @param {Function} props.onBookSelect - Function to handle book selection
 * @param {Function} props.onSelectAll - Function to handle select all books
 * @param {number} [props.itemsPerPage=10] - Number of items to display per page
 * @param {Object} [props.sortConfig] - Current sort configuration
 * @param {Function} [props.onSort] - Function to handle sorting
 * @param {Object} [props.pagination] - Backend pagination metadata
 * @param {Function} [props.onPageChange] - Function to handle page changes
 * @param {string} [props.actionType='group'] - Type of action: 'group' or 'ungroup'
 * @returns {JSX.Element} The team books table component
 */
const TeamBooksTable = ({
    books,
    selectedBooks = [],
    onBookSelect,
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

    // Check if all visible books are selected
    const allVisibleSelected = currentBooks.length > 0 && currentBooks.every(book => selectedBooks.includes(book._id));
    const someVisibleSelected = currentBooks.some(book => selectedBooks.includes(book._id));

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
            onSelectAll(currentBooks.map(book => book._id), !allVisibleSelected);
        }
    };

    /**
     * Handle individual book selection
     * @param {string} bookId - ID of the book to select/deselect
     */
    const handleBookSelect = (bookId) => {
        if (onBookSelect) {
            onBookSelect(bookId);
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
                                        sortKey="title"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Title
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
                                        sortKey="owners"
                                        currentSort={sortConfig}
                                        onSort={onSort}
                                    >
                                        Owners
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
                                            Title
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
                                            Owners
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
                        {currentBooks.map((book) => (
                            <tr key={book._id} className="border-b bg-base-300 border-resdes-orange hover:bg-base-100 hover:cursor-pointer">
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedBooks.includes(book._id)}
                                        onChange={() => handleBookSelect(book._id)}
                                        className="checkbox checkbox-sm bg-slate-200"
                                    />
                                </td>
                                <td className="p-4">
                                    <p className="block text-sm antialiased font-semibold leading-normal text-slate-200">
                                        {book.title}
                                    </p>
                                </td>
                                <td className="p-4">
                                    <p className="block text-sm antialiased leading-normal text-slate-200">
                                        {book.category?.name || 'Uncategorized'}
                                    </p>
                                </td>
                                <td className="p-4">
                                    <p className="block text-sm antialiased leading-normal text-slate-200">
                                        {book.documentCount || book.documents?.length || 0}
                                    </p>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        {book.owners && book.owners.length > 0 ? (
                                            book.owners.slice(0, 2).map((owner, index) => (
                                                <p key={owner._id || index} className="block text-sm antialiased leading-normal text-slate-200">
                                                    {owner.firstname} {owner.lastname}
                                                </p>
                                            ))
                                        ) : (
                                            <p className="block text-sm antialiased leading-normal text-slate-200 opacity-70">
                                                No owners
                                            </p>
                                        )}
                                        {book.owners && book.owners.length > 2 && (
                                            <p className="block text-sm antialiased leading-normal text-slate-200 opacity-70">
                                                +{book.owners.length - 2} more
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 float-right">
                                    <p className="block text-sm antialiased leading-normal text-slate-400">
                                        {formatDate(book.createdAt)}
                                    </p>
                                </td>
                            </tr>
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

TeamBooksTable.propTypes = {
    books: PropTypes.array.isRequired,
    selectedBooks: PropTypes.array,
    onBookSelect: PropTypes.func.isRequired,
    onSelectAll: PropTypes.func.isRequired,
    itemsPerPage: PropTypes.number,
    sortConfig: PropTypes.object,
    onSort: PropTypes.func,
    pagination: PropTypes.object,
    onPageChange: PropTypes.func,
    onPageSizeChange: PropTypes.func,
    actionType: PropTypes.oneOf(['group', 'ungroup'])
};

export default TeamBooksTable;