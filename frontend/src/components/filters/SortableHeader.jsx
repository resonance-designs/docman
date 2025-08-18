/*
 * @name Sortable Header
 * @file /docman/frontend/src/components/filters/SortableHeader.jsx
 * @component SortableHeader
 * @description Sortable table header component with visual indicators for column sorting
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import { ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from "lucide-react";
import PropTypes from "prop-types";

/**
 * Sortable table header component with visual sort indicators
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Header content to display
 * @param {string} props.sortKey - Unique key for this sortable column
 * @param {Object} props.currentSort - Current sort state with key and direction
 * @param {Function} props.onSort - Function called when sort changes
 * @param {string} [props.className=""] - Additional CSS classes to apply
 * @returns {JSX.Element} The sortable header component
 */
const SortableHeader = ({
    children,
    sortKey,
    currentSort,
    onSort,
    className = ""
}) => {
    /**
     * Handle sort click - toggle direction if same key, otherwise start with ascending
     */
    const handleSort = () => {
        if (currentSort.key === sortKey) {
            // If already sorting by this key, toggle direction
            const newDirection = currentSort.direction === "asc" ? "desc" : "asc";
            onSort({ key: sortKey, direction: newDirection });
        } else {
            // If not sorting by this key, start with ascending
            onSort({ key: sortKey, direction: "asc" });
        }
    };

    /**
     * Get the appropriate sort icon based on current sort state
     * @returns {JSX.Element} The sort icon component
     */
    const getSortIcon = () => {
        if (currentSort.key !== sortKey) {
            return <ChevronsUpDownIcon className="h-4 w-4 text-resdes-teal" />;
        }

        if (currentSort.direction === "asc") {
            return <ChevronUpIcon className="h-4 w-4 text-slate-950" />;
        } else {
            return <ChevronDownIcon className="h-4 w-4 text-slate-950" />;
        }
    };

    const isActive = currentSort.key === sortKey;

    return (
        <th 
            className={`p-4 cursor-pointer hover:bg-black/5 transition-colors ${className}`}
            onClick={handleSort}
        >
            <div className="flex items-center justify-between">
                <p className={`block text-sm antialiased leading-none ${isActive ? 'font-bold' : ''}`}>
                    {children}
                </p>
                {getSortIcon()}
            </div>
        </th>
    );
};

SortableHeader.propTypes = {
    children: PropTypes.node.isRequired,
    sortKey: PropTypes.string.isRequired,
    currentSort: PropTypes.shape({
        key: PropTypes.string.isRequired,
        direction: PropTypes.oneOf(["asc", "desc"]).isRequired
    }).isRequired,
    onSort: PropTypes.func.isRequired,
    className: PropTypes.string
};

export default SortableHeader;
