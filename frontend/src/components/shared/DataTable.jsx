/*
 * @name DataTable
 * @file /docman/frontend/src/components/shared/DataTable.jsx
 * @component DataTable
 * @description Reusable data table component with sorting, pagination, and action buttons
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import { useState } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { ensureArray } from "../../lib/safeUtils";
import PropTypes from "prop-types";

/**
 * Reusable data table component with sorting and actions
 * @param {Object} props - Component properties
 * @param {Array} props.data - Array of data objects to display
 * @param {Array} props.columns - Array of column configurations
 * @param {Function} [props.onRowClick] - Function called when row is clicked
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {boolean} [props.striped=true] - Whether to show striped rows
 * @param {boolean} [props.hover=true] - Whether to show hover effects
 * @param {string} [props.emptyMessage="No data available"] - Message when no data
 * @param {React.ReactNode} [props.emptyIcon] - Icon to show when no data
 * @returns {JSX.Element} The data table component
 */
const DataTable = ({
    data = [],
    columns = [],
    onRowClick,
    className = "",
    striped = true,
    hover = true,
    emptyMessage = "No data available",
    emptyIcon
}) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

    /**
     * Handle column sorting
     * @param {string} key - Column key to sort by
     */
    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    /**
     * Sort data based on current sort configuration
     * @param {Array} data - Data to sort
     * @returns {Array} Sorted data
     */
    const safeData = ensureArray(data);
    const sortedData = [...safeData].sort((a, b) => {
        if (!sortConfig.key) return 0;

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
            return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
    });

    /**
     * Render cell content based on column configuration
     * @param {Object} row - Row data
     * @param {Object} column - Column configuration
     * @returns {React.ReactNode} Rendered cell content
     */
    const renderCell = (row, column) => {
        if (column.render) {
            return column.render(row[column.key], row);
        }
        return row[column.key];
    };

    /**
     * Render sort icon for sortable columns
     * @param {string} columnKey - Column key
     * @returns {React.ReactNode} Sort icon
     */
    const renderSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <ChevronUpIcon className="w-4 h-4 opacity-30" />;
        }
        return sortConfig.direction === "asc" ? (
            <ChevronUpIcon className="w-4 h-4" />
        ) : (
            <ChevronDownIcon className="w-4 h-4" />
        );
    };

    // Empty state
    if (data.length === 0) {
        return (
            <div className="text-center py-12">
                {emptyIcon && (
                    <div className="flex justify-center mb-4 text-base-content/30">
                        {emptyIcon}
                    </div>
                )}
                <p className="text-base-content/70">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="table w-full">
                {/* Table Header */}
                <thead>
                    <tr className="border-b border-base-300">
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={`
                                    text-left font-semibold text-base-content
                                    ${column.sortable ? "cursor-pointer hover:bg-base-200" : ""}
                                    ${column.width ? `w-${column.width}` : ""}
                                    ${column.className || ""}
                                `}
                                onClick={column.sortable ? () => handleSort(column.key) : undefined}
                            >
                                <div className="flex items-center gap-2">
                                    <span>{column.label}</span>
                                    {column.sortable && renderSortIcon(column.key)}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                    {sortedData.map((row, index) => (
                        <tr
                            key={row.id || index}
                            className={`
                                border-b border-base-200
                                ${striped && index % 2 === 1 ? "bg-base-50" : ""}
                                ${hover ? "hover:bg-base-100" : ""}
                                ${onRowClick ? "cursor-pointer" : ""}
                            `}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                        >
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={`
                                        py-3 px-4 text-base-content
                                        ${column.cellClassName || ""}
                                    `}
                                >
                                    {renderCell(row, column)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

DataTable.propTypes = {
    data: PropTypes.array.isRequired,
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            sortable: PropTypes.bool,
            render: PropTypes.func,
            width: PropTypes.string,
            className: PropTypes.string,
            cellClassName: PropTypes.string
        })
    ).isRequired,
    onRowClick: PropTypes.func,
    className: PropTypes.string,
    striped: PropTypes.bool,
    hover: PropTypes.bool,
    emptyMessage: PropTypes.string,
    emptyIcon: PropTypes.node
};

export default DataTable;
