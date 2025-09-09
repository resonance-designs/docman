/*
 * @name Project Books Table Component
 * @file /docman/frontend/src/components/projects/ProjectBooksTable.jsx
 * @component ProjectBooksTable
 * @description Specialized table component for managing books in projects with checkbox selection and bulk actions
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { ChevronLeftIcon, ChevronRightIcon, FolderIcon } from "lucide-react";
import SortableHeader from "../filters/SortableHeader";
import PropTypes from "prop-types";

/**
 * Component for displaying books in a project management table with checkbox selection
 * @param {Object} props - Component properties
 * @param {Array} props.projectBooks - Array of project book objects to display
 * @param {Array} props.availableBooks - Array of available book objects to display
 * @param {Array} props.selectedProjectBooks - Array of selected project book IDs
 * @param {Array} props.selectedAvailableBooks - Array of selected available book IDs
 * @param {Function} props.onProjectBookSelect - Function to handle project book selection
 * @param {Function} props.onAvailableBookSelect - Function to handle available book selection
 * @param {Function} props.onProjectBooksSelectAll - Function to handle select all project books
 * @param {Function} props.onAvailableBooksSelectAll - Function to handle select all available books
 * @param {Function} props.onRemoveBooksFromProject - Function to remove books from project
 * @param {Function} props.onAddBooksToProject - Function to add books to project
 * @param {boolean} props.loading - Loading state
 * @param {number} [props.itemsPerPage=10] - Number of items to display per page
 * @returns {JSX.Element} The project books table component
 */
const ProjectBooksTable = ({
    projectBooks = [],
    availableBooks = [],
    selectedProjectBooks = [],
    selectedAvailableBooks = [],
    onProjectBookSelect,
    onAvailableBookSelect,
    onProjectBooksSelectAll,
    onAvailableBooksSelectAll,
    onRemoveBooksFromProject,
    onAddBooksToProject,
    loading = false,
    itemsPerPage = 10
}) => {
    const [currentProjectPage, setCurrentProjectPage] = useState(1);
    const [currentAvailablePage, setCurrentAvailablePage] = useState(1);
    const [projectPageSize, setProjectPageSize] = useState(itemsPerPage);
    const [availablePageSize, setAvailablePageSize] = useState(itemsPerPage);
    const [searchTerm, setSearchTerm] = useState('');

    // Ensure arrays are always arrays
    const safeProjectBooks = useMemo(() => Array.isArray(projectBooks) ? projectBooks : [], [projectBooks]);
    const safeAvailableBooks = useMemo(() => Array.isArray(availableBooks) ? availableBooks : [], [availableBooks]);

    // Filter books based on search term
    const filteredProjectBooks = useMemo(() => {
        return safeProjectBooks.filter(book =>
            book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.owners?.some(owner => 
                (owner.firstname + ' ' + owner.lastname)?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [safeProjectBooks, searchTerm]);

    const filteredAvailableBooks = useMemo(() => {
        return safeAvailableBooks.filter(book =>
            book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.owners?.some(owner =>
                (owner.firstname + ' ' + owner.lastname)?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [safeAvailableBooks, searchTerm]);

    // Calculate pagination for project books
    const projectTotalPages = Math.ceil(filteredProjectBooks.length / projectPageSize);
    const projectStartIndex = (currentProjectPage - 1) * projectPageSize;
    const projectEndIndex = projectStartIndex + projectPageSize;
    const currentProjectBooks = filteredProjectBooks.slice(projectStartIndex, projectEndIndex);

    // Calculate pagination for available books
    const availableTotalPages = Math.ceil(filteredAvailableBooks.length / availablePageSize);
    const availableStartIndex = (currentAvailablePage - 1) * availablePageSize;
    const availableEndIndex = availableStartIndex + availablePageSize;
    const currentAvailableBooks = filteredAvailableBooks.slice(availableStartIndex, availableEndIndex);

    // Check selection states
    const allProjectSelected = currentProjectBooks.length > 0 && currentProjectBooks.every(book => selectedProjectBooks.includes(book._id));
    const someProjectSelected = currentProjectBooks.some(book => selectedProjectBooks.includes(book._id));
    const allAvailableSelected = currentAvailableBooks.length > 0 && currentAvailableBooks.every(book => selectedAvailableBooks.includes(book._id));
    const someAvailableSelected = currentAvailableBooks.some(book => selectedAvailableBooks.includes(book._id));

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    /**
     * Handle project books select all
     */
    const handleProjectSelectAll = () => {
        if (onProjectBooksSelectAll) {
            onProjectBooksSelectAll(currentProjectBooks.map(book => book._id), !allProjectSelected);
        }
    };

    /**
     * Handle available books select all
     */
    const handleAvailableSelectAll = () => {
        if (onAvailableBooksSelectAll) {
            onAvailableBooksSelectAll(currentAvailableBooks.map(book => book._id), !allAvailableSelected);
        }
    };

    /**
     * Generate page numbers for pagination controls
     */
    const getPageNumbers = (currentPage, totalPages) => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
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

    if (loading) {
        return (
            <div className="text-center py-8 text-gray-500">
                Loading books...
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Search */}
            <div className="flex items-center space-x-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search books..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-resdes-blue"
                    />
                </div>
            </div>

            {/* Project Books Table */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Project Books</h3>
                    {selectedProjectBooks.length > 0 && (
                        <button
                            onClick={onRemoveBooksFromProject}
                            className="btn bg-red-500 text-white hover:bg-red-600"
                        >
                            Remove Selected ({selectedProjectBooks.length})
                        </button>
                    )}
                </div>

                {filteredProjectBooks.length === 0 ? (
                    <div className="text-center py-8 bg-base-300 rounded-lg">
                        <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h4 className="text-lg font-medium mb-2">No books assigned</h4>
                        <p className="text-gray-500 mb-4">
                            Either no books have been assigned to this project, or no books exist yet.
                        </p>
                        <Link
                            to={`/book/create`}
                            className="btn bg-resdes-teal text-slate-950 hover:bg-resdes-teal hover:opacity-80"
                        >
                            Create Book
                        </Link>
                    </div>
                ) : (
                    <div className="relative flex flex-col w-full text-gray-700 shadow-md rounded-xl bg-clip-border">
                        {/* Table */}
                        <div className="overflow-x-auto rounded-t-xl border-resdes-orange">
                            <table className="w-full text-left table-auto min-w-max border-b border-resdes-orange">
                                <thead className="bg-resdes-orange text-slate-950 font-mono font-bold rounded-t-xl">
                                    <tr>
                                        <th className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={allProjectSelected}
                                                ref={input => {
                                                    if (input) input.indeterminate = someProjectSelected && !allProjectSelected;
                                                }}
                                                onChange={handleProjectSelectAll}
                                                className="checkbox checkbox-sm bg-slate-200"
                                            />
                                        </th>
                                        <th className="p-4">
                                            <p className="block text-sm antialiased leading-none">Title</p>
                                        </th>
                                        <th className="p-4">
                                            <p className="block text-sm antialiased leading-none">Category</p>
                                        </th>
                                        <th className="p-4">
                                            <p className="block text-sm antialiased leading-none">Documents</p>
                                        </th>
                                        <th className="p-4">
                                            <p className="block text-sm antialiased leading-none">Owners</p>
                                        </th>
                                        <th className="p-4">
                                            <p className="block text-sm antialiased leading-none float-right">Created On</p>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="border border-resdes-orange">
                                    {currentProjectBooks.map((book) => (
                                        <tr key={book._id} className="border-b bg-base-300 border-resdes-orange hover:bg-base-100 hover:cursor-pointer">
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProjectBooks.includes(book._id)}
                                                    onChange={() => onProjectBookSelect(book._id)}
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
                                                    {typeof book.category === 'object' ? book.category?.name : book.category || 'Uncategorized'}
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
                                                                {typeof owner === 'object' ? `${owner.firstname} ${owner.lastname}` : owner}
                                                            </p>
                                                        ))
                                                    ) : (
                                                        <p className="block text-sm antialiased leading-normal text-slate-500">No owners</p>
                                                    )}
                                                    {book.owners && book.owners.length > 2 && (
                                                        <p className="block text-xs antialiased leading-normal text-slate-400">
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
                        {filteredProjectBooks.length > 0 && (
                            <div className="flex items-center justify-between p-4 border-t border-resdes-orange bg-resdes-orange text-slate-950 font-mono font-bold rounded-b-xl">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm">
                                        Showing {projectStartIndex + 1} to {Math.min(projectEndIndex, filteredProjectBooks.length)} of {filteredProjectBooks.length} books
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">Show:</span>
                                        <select
                                            value={projectPageSize}
                                            onChange={(e) => {
                                                setProjectPageSize(Number(e.target.value));
                                                setCurrentProjectPage(1);
                                            }}
                                            className="px-2 py-1 text-sm border rounded bg-white text-gray-700"
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                        </select>
                                    </div>
                                </div>

                                {projectTotalPages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentProjectPage(Math.max(1, currentProjectPage - 1))}
                                            disabled={currentProjectPage === 1}
                                            className="p-1 rounded hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeftIcon size={16} />
                                        </button>

                                        {getPageNumbers(currentProjectPage, projectTotalPages).map((page, index) => (
                                            <button
                                                key={index}
                                                onClick={() => typeof page === 'number' && setCurrentProjectPage(page)}
                                                disabled={page === '...'}
                                                className={`px-3 py-1 text-sm rounded ${
                                                    page === currentProjectPage
                                                        ? 'bg-white text-resdes-orange font-bold'
                                                        : page === '...'
                                                        ? 'cursor-default'
                                                        : 'hover:bg-white hover:bg-opacity-20'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => setCurrentProjectPage(Math.min(projectTotalPages, currentProjectPage + 1))}
                                            disabled={currentProjectPage === projectTotalPages}
                                            className="p-1 rounded hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRightIcon size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Available Books Table */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Add Books</h3>
                    {selectedAvailableBooks.length > 0 && (
                        <button
                            onClick={onAddBooksToProject}
                            className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                        >
                            Add Selected ({selectedAvailableBooks.length})
                        </button>
                    )}
                </div>

                {filteredAvailableBooks.length === 0 ? (
                    <div className="text-center py-8 bg-base-300 rounded-lg">
                        <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h4 className="text-lg font-medium mb-2">No books assigned</h4>
                        <p className="text-gray-500 mb-4">
                            Either all books have already been assigned to this project, or no books exist yet.
                        </p>
                        <Link
                            to={`/book/create`}
                            className="btn bg-resdes-teal text-slate-950 hover:bg-resdes-teal hover:opacity-80"
                        >
                            Create Book
                        </Link>
                    </div>
                ) : (
                    <div className="relative flex flex-col w-full text-gray-700 shadow-md rounded-xl bg-clip-border">
                        {/* Table */}
                        <div className="overflow-x-auto rounded-t-xl border-resdes-orange">
                            <table className="w-full text-left table-auto min-w-max border-b border-resdes-orange">
                                <thead className="bg-resdes-orange text-slate-950 font-mono font-bold rounded-t-xl">
                                    <tr>
                                        <th className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={allAvailableSelected}
                                                ref={input => {
                                                    if (input) input.indeterminate = someAvailableSelected && !allAvailableSelected;
                                                }}
                                                onChange={handleAvailableSelectAll}
                                                className="checkbox checkbox-sm bg-slate-200"
                                            />
                                        </th>
                                        <th className="p-4">
                                            <p className="block text-sm antialiased leading-none">Title</p>
                                        </th>
                                        <th className="p-4">
                                            <p className="block text-sm antialiased leading-none">Category</p>
                                        </th>
                                        <th className="p-4">
                                            <p className="block text-sm antialiased leading-none">Documents</p>
                                        </th>
                                        <th className="p-4">
                                            <p className="block text-sm antialiased leading-none">Owners</p>
                                        </th>
                                        <th className="p-4">
                                            <p className="block text-sm antialiased leading-none float-right">Created On</p>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="border border-resdes-orange">
                                    {currentAvailableBooks.map((book) => (
                                        <tr key={book._id} className="border-b bg-base-300 border-resdes-orange hover:bg-base-100 hover:cursor-pointer">
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAvailableBooks.includes(book._id)}
                                                    onChange={() => onAvailableBookSelect(book._id)}
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
                                                    {typeof book.category === 'object' ? book.category?.name : book.category || 'Uncategorized'}
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
                                                                {typeof owner === 'object' ? `${owner.firstname} ${owner.lastname}` : owner}
                                                            </p>
                                                        ))
                                                    ) : (
                                                        <p className="block text-sm antialiased leading-normal text-slate-500">No owners</p>
                                                    )}
                                                    {book.owners && book.owners.length > 2 && (
                                                        <p className="block text-xs antialiased leading-normal text-slate-400">
                                                            +{book.owners.length - 2} more
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="block text-sm antialiased leading-normal text-slate-400 float-right">
                                                    {formatDate(book.createdAt)}
                                                </p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {filteredAvailableBooks.length > 0 && (
                            <div className="flex items-center justify-between p-4 border-t border-resdes-orange bg-resdes-orange text-slate-950 font-mono font-bold rounded-b-xl">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm">
                                        Showing {availableStartIndex + 1} to {Math.min(availableEndIndex, filteredAvailableBooks.length)} of {filteredAvailableBooks.length} books
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">Show:</span>
                                        <select
                                            value={availablePageSize}
                                            onChange={(e) => {
                                                setAvailablePageSize(Number(e.target.value));
                                                setCurrentAvailablePage(1);
                                            }}
                                            className="px-2 py-1 text-sm border rounded bg-white text-gray-700"
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                        </select>
                                    </div>
                                </div>

                                {availableTotalPages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentAvailablePage(Math.max(1, currentAvailablePage - 1))}
                                            disabled={currentAvailablePage === 1}
                                            className="p-1 rounded hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeftIcon size={16} />
                                        </button>

                                        {getPageNumbers(currentAvailablePage, availableTotalPages).map((page, index) => (
                                            <button
                                                key={index}
                                                onClick={() => typeof page === 'number' && setCurrentAvailablePage(page)}
                                                disabled={page === '...'}
                                                className={`px-3 py-1 text-sm rounded ${
                                                    page === currentAvailablePage
                                                        ? 'bg-white text-resdes-orange font-bold'
                                                        : page === '...'
                                                        ? 'cursor-default'
                                                        : 'hover:bg-white hover:bg-opacity-20'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => setCurrentAvailablePage(Math.min(availableTotalPages, currentAvailablePage + 1))}
                                            disabled={currentAvailablePage === availableTotalPages}
                                            className="p-1 rounded hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRightIcon size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

ProjectBooksTable.propTypes = {
    projectBooks: PropTypes.array,
    availableBooks: PropTypes.array,
    selectedProjectBooks: PropTypes.array,
    selectedAvailableBooks: PropTypes.array,
    onProjectBookSelect: PropTypes.func,
    onAvailableBookSelect: PropTypes.func,
    onProjectBooksSelectAll: PropTypes.func,
    onAvailableBooksSelectAll: PropTypes.func,
    onRemoveBooksFromProject: PropTypes.func,
    onAddBooksToProject: PropTypes.func,
    loading: PropTypes.bool,
    itemsPerPage: PropTypes.number
};

export default ProjectBooksTable;