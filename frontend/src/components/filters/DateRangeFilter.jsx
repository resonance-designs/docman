/*
 * @name Date Range Filter
 * @file /docman/frontend/src/components/filters/DateRangeFilter.jsx
 * @component DateRangeFilter
 * @description Date range filter component with calendar picker for filtering by date periods
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import { CalendarIcon, XIcon } from "lucide-react";
import { useState } from "react";
import PropTypes from "prop-types";

/**
 * Date range filter component with expandable date inputs
 * @param {Object} props - Component properties
 * @param {string} props.startDate - Start date value (ISO string)
 * @param {string} props.endDate - End date value (ISO string)
 * @param {Function} props.onStartDateChange - Function called when start date changes
 * @param {Function} props.onEndDateChange - Function called when end date changes
 * @param {string} [props.className=""] - Additional CSS classes to apply
 * @param {string} [props.label="Date Range"] - Label text for the filter
 * @param {Function} [props.onClear] - Optional function called when clear button is clicked
 * @returns {JSX.Element} The date range filter component
 */
const DateRangeFilter = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    className = "",
    label = "Date Range",
    onClear
}) => {
    const [showInputs, setShowInputs] = useState(false);

    /**
     * Handle clearing both date inputs
     */
    const handleClear = () => {
        onStartDateChange("");
        onEndDateChange("");
        if (onClear) onClear();
        setShowInputs(false);
    };

    /**
     * Format date string for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date string
     */
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const hasDateRange = startDate || endDate;

    return (
        <div className={`${className}`}>
            {label && (
                <label className="block text-sm font-medium color-base-300 mb-1">
                    {label}
                </label>
            )}

            {!showInputs && !hasDateRange && (
                <button
                    type="button"
                    onClick={() => setShowInputs(true)}
                    className="flex w-full items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-resdes-blue focus:border-resdes-blue"
                >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Select date range
                </button>
            )}

            {!showInputs && hasDateRange && (
                <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-full">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="flex-1 text-gray-900">
                        {startDate && formatDate(startDate)}
                        {startDate && endDate && " - "}
                        {endDate && formatDate(endDate)}
                        {!startDate && endDate && `Before ${formatDate(endDate)}`}
                        {startDate && !endDate && `After ${formatDate(startDate)}`}
                    </span>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none ml-2"
                    >
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>
            )}

            {showInputs && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">From</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => onStartDateChange(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-resdes-blue focus:border-resdes-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">To</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => onEndDateChange(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-resdes-blue focus:border-resdes-blue"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 focus:outline-none"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowInputs(false)}
                            className="px-3 py-1 text-xs bg-resdes-blue text-white rounded hover:bg-resdes-blue/80 focus:outline-none"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

DateRangeFilter.propTypes = {
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    onStartDateChange: PropTypes.func.isRequired,
    onEndDateChange: PropTypes.func.isRequired,
    className: PropTypes.string,
    label: PropTypes.string,
    onClear: PropTypes.func
};

export default DateRangeFilter;
