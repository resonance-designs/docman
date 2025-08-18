/*
 * @name Team Documents Table Component
 * @file /docman/frontend/src/components/teams/TeamDocumentsTable.jsx
 * @component TeamDocumentsTable
 * @description Specialized table component for managing documents in teams with checkbox selection and bulk actions
 * @author Richard Bakos
 * @version 2.1.3
 * @license UNLICENSED
 */

import { useState, useMemo, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import SortableHeader from "../filters/SortableHeader";
import PropTypes from "prop-types";

/**
 * Component for displaying documents in a team management table with checkbox selection
 * @param {Object} props - Component properties
 * @param {Array} props.documents - Array of document objects to display
 * @param {Array} props.selectedDocuments - Array of selected document IDs
 * @param {Function} props.onDocumentSelect - Function to handle document selection
 * @param {Function} props.onSelectAll - Function to handle select all documents
 * @param {number} [props.itemsPerPage=10] - Number of items to display per page
 * @param {Object} [props.sortConfig] - Current sort configuration
 * @param {Function} [props.onSort] - Function to handle sorting
 * @param {Object} [props.pagination] - Backend pagination metadata
 * @param {Function} [props.onPageChange] - Function to handle page changes
 * @param {string} [props.actionType='group'] - Type of action: 'group' or 'ungroup'
 * @returns {JSX.Element} The team documents table component
 */
const TeamDocumentsTable = ({ 
    documents, 
    selectedDocuments = [], 
    onDocumentSelect, 
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

    // Ensure documents is always an array
    const safeDocumentsArray = useMemo(() => Array.isArray(documents) ? documents : [], [documents]);

    // Use backend pagination if available, otherwise fallback to client-side
    const totalPages = pagination ? pagination.pages : Math.ceil(safeDocumentsArray.length / pageSize);
    const displayCurrentPage = pagination ? pagination.page : currentPage;

    // Calculate display values
    const startIndex = (displayCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const displayStart = startIndex + 1;
    const displayEnd = pagination ? Math.min(endIndex, pagination.total) : Math.min(endIndex, safeDocumentsArray.length);
    const displayTotal = pagination ? pagination.total : safeDocumentsArray.length;

    // Calculate current documents for display
    const currentDocuments = useMemo(() => {
        if (pagination) {
            // Backend pagination - use all documents (they're already paginated)
            return safeDocumentsArray;
        } else {
            // Client-side pagination
            return safeDocumentsArray.slice(startIndex, endIndex);
        }
    }, [safeDocumentsArray, startIndex, endIndex, pagination]);

    // Check if all visible documents are selected
    const allVisibleSelected = currentDocuments.length > 0 && currentDocuments.every(doc => selectedDocuments.includes(doc._id));
    const someVisibleSelected = currentDocuments.some(doc => selectedDocuments.includes(doc._id));

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
            onSelectAll(currentDocuments.map(doc => doc._id), !allVisibleSelected);
        }
    };

    /**
     * Handle individual document selection
     * @param {string} docId - ID of the document to select/deselect
     */
    const handleDocumentSelect = (docId) => {
        if (onDocumentSelect) {
            onDocumentSelect(docId);
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
     * Reset to page 1 when documents change (client-side only)
     */
    useEffect(() => {
        if (!pagination && displayCurrentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [safeDocumentsArray.length, totalPages, displayCurrentPage, pagination]);

    if (safeDocumentsArray.length === 0) {
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
                            <th className="p-4">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    ref={input => {
                                        if (input) input.indeterminate = someVisibleSelected && !allVisibleSelected;
                                    }}
                                    onChange={handleSelectAll}
                                    className="checkbox checkbox-sm"
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
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="border border-resdes-orange">
                        {currentDocuments.map((doc) => (
                            <tr key={doc._id} className="border-b border-resdes-orange hover:bg-gray-50">
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedDocuments.includes(doc._id)}
                                        onChange={() => handleDocumentSelect(doc._id)}
                                        className="checkbox checkbox-sm"
                                    />
                                </td>
                                <td className="p-4">
                                    <p className="block text-sm antialiased font-semibold leading-normal text-blue-gray-900">
                                        {doc.title}
                                    </p>
                                </td>
                                <td className="p-4">
                                    <p className="block text-sm antialiased leading-normal text-blue-gray-900">
                                        {doc.author?.firstname} {doc.author?.lastname}
                                    </p>
                                </td>
                                <td className="p-4">
                                    <p className="block text-sm antialiased leading-normal text-blue-gray-900">
                                        {formatDate(doc.createdAt)}
                                    </p>
                                </td>
                                <td className="p-4">
                                    <p className="block text-sm antialiased leading-normal text-blue-gray-900">
                                        {doc.reviewDate ? formatDate(doc.reviewDate) : 'Not set'}
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

TeamDocumentsTable.propTypes = {
    documents: PropTypes.array.isRequired,
    selectedDocuments: PropTypes.array,
    onDocumentSelect: PropTypes.func.isRequired,
    onSelectAll: PropTypes.func.isRequired,
    itemsPerPage: PropTypes.number,
    sortConfig: PropTypes.object,
    onSort: PropTypes.func,
    pagination: PropTypes.object,
    onPageChange: PropTypes.func,
    onPageSizeChange: PropTypes.func,
    actionType: PropTypes.oneOf(['group', 'ungroup'])
};

export default TeamDocumentsTable;