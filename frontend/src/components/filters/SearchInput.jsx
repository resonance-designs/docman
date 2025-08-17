/*
 * @name SearchInput
 * @file /docman/frontend/src/components/filters/SearchInput.jsx
 * @component SearchInput
 * @description Reusable search input component with clear button and customizable placeholder for filtering data
 * @author Richard Bakos
 * @version 2.0.2
 * @license UNLICENSED
 */
import { SearchIcon, XIcon } from "lucide-react";
import PropTypes from "prop-types";

/**
 * Search input component with clear functionality
 * @param {Object} props - Component properties
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Function called when search value changes
 * @param {string} [props.placeholder="Search..."] - Placeholder text for the input
 * @param {string} [props.className=""] - Additional CSS classes to apply
 * @param {Function} [props.onClear] - Optional function called when clear button is clicked
 * @returns {JSX.Element} The search input component
 */
const SearchInput = ({
    value,
    onChange,
    placeholder = "Search...",
    className = "",
    onClear
}) => {
    /**
     * Handle clearing the search input
     */
    const handleClear = () => {
        onChange("");
        if (onClear) onClear();
    };

    return (
        <div className={`relative ${className}`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-resdes-blue focus:border-resdes-blue text-sm"
            />
            {value && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

SearchInput.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    className: PropTypes.string,
    onClear: PropTypes.func
};

export default SearchInput;
