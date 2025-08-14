/*
 * @name FilterBar
 * @file /docman/frontend/src/components/filters/FilterBar.jsx
 * @component FilterBar
 * @description Comprehensive filter bar with search, dropdown filters, date range, and clear all functionality
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import { FilterIcon, XIcon } from "lucide-react";
import { useState } from "react";
import PropTypes from "prop-types";
import SearchInput from "./SearchInput";
import DropdownFilter from "./DropdownFilter";
import DateRangeFilter from "./DateRangeFilter";

/**
 * Comprehensive filter bar component with search, dropdown filters, and date range
 * @param {Object} props - Component properties
 * @param {string} props.searchValue - Current search value
 * @param {Function} props.onSearchChange - Function called when search value changes
 * @param {Array} [props.filters=[]] - Array of filter configurations for dropdown filters
 * @param {Object} [props.dateRange] - Date range object with startDate and endDate
 * @param {Function} [props.onDateRangeChange] - Function called when date range changes
 * @param {Function} [props.onClearAll] - Optional function called when clear all is clicked
 * @param {string} [props.className=""] - Additional CSS classes to apply
 * @returns {JSX.Element} The filter bar component
 */
const FilterBar = ({
    searchValue,
    onSearchChange,
    filters = [],
    dateRange,
    onDateRangeChange,
    onClearAll,
    className = ""
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    /**
     * Check if any filters are currently active
     * @returns {boolean} True if any filters have values
     */
    const hasActiveFilters = () => {
        if (searchValue) return true;
        if (dateRange && (dateRange.startDate || dateRange.endDate)) return true;
        return filters.some(filter => filter.value);
    };

    /**
     * Clear all active filters
     */
    const handleClearAll = () => {
        onSearchChange("");
        if (onDateRangeChange) {
            onDateRangeChange({ startDate: "", endDate: "" });
        }
        filters.forEach(filter => {
            if (filter.onChange) {
                filter.onChange("");
            }
        });
        if (onClearAll) onClearAll();
    };

    return (
        <div className={`bg-base-100 rounded-lg p-4 mb-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <FilterIcon className="h-5 w-5 text-resdes-orange" />
                    <h3 className="text-lg color-base-300 font-semibold">Filters</h3>
                    {hasActiveFilters() && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-resdes-blue text-white">
                            Active
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    {hasActiveFilters() && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-resdes-blue"
                        >
                            <XIcon className="h-4 w-4 mr-1" />
                            Clear All
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm text-slate-950 bg-resdes-blue hover:bg-resdes-blue/80 focus:outline-none focus:ring-1 focus:ring-resdes-blue"
                    >
                        {isExpanded ? "Collapse" : "Expand"}
                    </button>
                </div>
            </div>

            {/* Search - Always visible */}
            <div className="mb-4">
                <SearchInput
                    value={searchValue}
                    onChange={onSearchChange}
                    placeholder="Search..."
                    className="w-full"
                />
            </div>

            {/* Expandable Filters */}
            {isExpanded && (
                <div className="space-y-4">
                    {/* Dropdown Filters */}
                    {filters.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filters.map((filter, index) => (
                                <DropdownFilter
                                    key={filter.key || index}
                                    value={filter.value}
                                    onChange={filter.onChange}
                                    options={filter.options}
                                    placeholder={filter.placeholder}
                                    label={filter.label}
                                    allowClear={filter.allowClear !== false}
                                />
                            ))}
                        </div>
                    )}

                    {/* Date Range Filter */}
                    {dateRange && onDateRangeChange && (
                        <div className="max-w-full">
                            <DateRangeFilter
                                startDate={dateRange.startDate}
                                endDate={dateRange.endDate}
                                onStartDateChange={(date) => onDateRangeChange({ ...dateRange, startDate: date })}
                                onEndDateChange={(date) => onDateRangeChange({ ...dateRange, endDate: date })}
                                label="Added Date Range"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

FilterBar.propTypes = {
    searchValue: PropTypes.string.isRequired,
    onSearchChange: PropTypes.func.isRequired,
    filters: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string,
        value: PropTypes.string.isRequired,
        onChange: PropTypes.func.isRequired,
        options: PropTypes.array.isRequired,
        placeholder: PropTypes.string,
        label: PropTypes.string,
        allowClear: PropTypes.bool
    })),
    dateRange: PropTypes.shape({
        startDate: PropTypes.string.isRequired,
        endDate: PropTypes.string.isRequired
    }),
    onDateRangeChange: PropTypes.func,
    onClearAll: PropTypes.func,
    className: PropTypes.string
};

export default FilterBar;
