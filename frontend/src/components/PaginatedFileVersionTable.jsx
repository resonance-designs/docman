/*
 * @name Paginated File Version Table Component
 * @file /docman/frontend/src/components/PaginatedFileVersionTable.jsx
 * @component PaginatedFileVersionTable
 * @description Paginated and sortable table for document file version history (sortable by Version and Uploaded)
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */

import { useMemo, useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "lucide-react";
import SortableHeader from "./filters/SortableHeader";
import PropTypes from "prop-types";
import { formatDate } from "../lib/utils";

/**
 * Paginated file version table with sorting
 * @param {Object} props
 * @param {Array} props.versions - Version history array
 * @param {Array} props.files - Files array for mapping version -> filename
 * @param {Function} [props.onCompare] - Compare callback (v1, v2)
 * @param {Function} [props.getFullName] - Function to render user names
 * @param {number} [props.itemsPerPage=10] - Items per page
 */
const PaginatedFileVersionTable = ({ versions, files, onCompare, getFullName, itemsPerPage = 10 }) => {
    const [sortConfig, setSortConfig] = useState({ key: "uploadedAt", direction: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(itemsPerPage);

    const safeVersionsArray = useMemo(() => Array.isArray(versions) ? versions : [], [versions]);
    const safeFilesArray = useMemo(() => Array.isArray(files) ? files : [], [files]);

    // Use the project utility formatDate
    const fd = formatDate;

    // Sort versions
    const sortedVersions = useMemo(() => {
        const arr = [...safeVersionsArray];
        arr.sort((a, b) => {
            if (sortConfig.key === "version") {
                const va = Number(a.version) || 0;
                const vb = Number(b.version) || 0;
                return sortConfig.direction === "asc" ? va - vb : vb - va;
            }
            if (sortConfig.key === "uploadedAt") {
                const da = new Date(a.uploadedAt).getTime() || 0;
                const db = new Date(b.uploadedAt).getTime() || 0;
                return sortConfig.direction === "asc" ? da - db : db - da;
            }
            return 0;
        });
        return arr;
    }, [safeVersionsArray, sortConfig]);

    // Pagination calculations
    const totalPages = Math.ceil(sortedVersions.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const displayStart = sortedVersions.length ? startIndex + 1 : 0;
    const displayEnd = Math.min(endIndex, sortedVersions.length);
    const displayTotal = sortedVersions.length;

    const currentVersions = useMemo(() => sortedVersions.slice(startIndex, endIndex), [sortedVersions, startIndex, endIndex]);

    const handleSort = (nextSort) => setSortConfig(nextSort);

    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        setCurrentPage(1);
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const goToPrevious = () => goToPage(currentPage - 1);
    const goToNext = () => goToPage(currentPage + 1);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);
            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push("...");
            }
            for (let i = startPage; i <= endPage; i++) pages.push(i);
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pages.push("...");
                pages.push(totalPages);
            }
        }
        return pages;
    };

    // Reset to page 1 if items shrink and current page goes out of bounds
    useEffect(() => {
        const newTotalPages = Math.ceil(sortedVersions.length / pageSize) || 1;
        if (currentPage > newTotalPages) setCurrentPage(1);
    }, [sortedVersions.length, pageSize, currentPage]);

    if (safeVersionsArray.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No versions found.
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
                            <SortableHeader sortKey="version" currentSort={sortConfig} onSort={handleSort}>
                                Version
                            </SortableHeader>
                            <th className="p-4">
                                <p className="block text-sm antialiased leading-none">Label</p>
                            </th>
                            <SortableHeader sortKey="uploadedAt" currentSort={sortConfig} onSort={handleSort}>
                                Uploaded
                            </SortableHeader>
                            <th className="p-4">
                                <p className="block text-sm antialiased leading-none">By</p>
                            </th>
                            <th className="p-4">
                                <p className="block text-sm antialiased leading-none">Changes</p>
                            </th>
                            <th className="p-4">
                                <p className="block text-sm antialiased leading-none float-right">Actions</p>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="border border-resdes-orange">
                        {currentVersions.map((version) => {
                            const matchingFile = safeFilesArray.find((f) => f.version === version.version);
                            const uploaderName = version.uploadedBy ? (getFullName ? getFullName(version.uploadedBy) : (version.uploadedBy.username || version.uploadedBy.email || "Unknown")) : "Unknown";
                            return (
                                <tr key={version.version} className="bg-base-100 p-4 border-b border-resdes-orange text-base-content text-sm antialiased font-normal leading-normal">
                                    <td className="p-4">{version.version}</td>
                                    <td className="p-4">{version.label}</td>
                                    <td className="p-4">{fd(new Date(version.uploadedAt))}</td>
                                    <td className="p-4">{uploaderName}</td>
                                    <td className="p-4">{version.changelog || "No changes documented"}</td>
                                    <td className="p-4 float-right">
                                        <div className="flex gap-2">
                                            <a
                                                href={matchingFile ? `/uploads/${matchingFile.filename}` : undefined}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-xs bg-resdes-teal text-slate-950 hover:bg-resdes-teal hover:opacity-80"
                                                aria-disabled={!matchingFile}
                                                onClick={(e) => { if (!matchingFile) e.preventDefault(); }}
                                            >
                                                <DownloadIcon size={12} />
                                                Download
                                            </a>
                                            {typeof version.version === "number" && version.version > 1 && onCompare && (
                                                <button
                                                    className="btn btn-xs btn-outline"
                                                    onClick={() => onCompare(version.version - 1, version.version)}
                                                >
                                                    Compare
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {displayTotal > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-resdes-orange bg-resdes-orange text-slate-950 font-mono font-bold rounded-b-xl">
                    {/* Results info and page size selector */}
                    <div className="flex items-center gap-4">
                        <div className="text-sm">
                            Showing {displayStart} to {displayEnd} of {displayTotal} versions
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
                        <button
                            onClick={goToPrevious}
                            disabled={currentPage === 1}
                            className="btn btn-sm bg-white text-slate-950 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Previous page"
                        >
                            <ChevronLeftIcon size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                            {getPageNumbers().map((page, index) => {
                                const isCurrentPage = page === currentPage;
                                const isEllipsis = page === "...";
                                let buttonClass = "bg-white text-slate-950 hover:bg-gray-100";
                                if (isCurrentPage) {
                                    buttonClass = "bg-resdes-teal text-slate-950";
                                } else if (isEllipsis) {
                                    buttonClass = "bg-white text-slate-950 cursor-default";
                                }
                                return (
                                    <button
                                        key={`page-${page}-${index}`}
                                        onClick={() => typeof page === "number" && goToPage(page)}
                                        disabled={isEllipsis}
                                        className={`btn btn-sm ${buttonClass}`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={goToNext}
                            disabled={currentPage === totalPages}
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

PaginatedFileVersionTable.propTypes = {
    versions: PropTypes.array.isRequired,
    files: PropTypes.array,
    onCompare: PropTypes.func,
    getFullName: PropTypes.func,
    itemsPerPage: PropTypes.number,
};

export default PaginatedFileVersionTable;