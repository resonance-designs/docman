import { ChevronDownIcon, XIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

const DropdownFilter = ({
    value,
    onChange,
    options = [],
    placeholder = "Select...",
    className = "",
    label,
    allowClear = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange("");
    };

    const selectedOption = options.find(option => option.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium color-base-300 mb-1">
                    {label}
                </label>
            )}
            <div
                className="relative w-full cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-resdes-blue focus:border-resdes-blue">
                    <div className="flex items-center justify-between">
                        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
                            {displayText}
                        </span>
                        <div className="flex items-center space-x-1">
                            {value && allowClear && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    <XIcon className="h-4 w-4" />
                                </button>
                            )}
                            <ChevronDownIcon 
                                className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                            />
                        </div>
                    </div>
                </div>

                {isOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {options.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
                        ) : (
                            options.map((option) => (
                                <div
                                    key={option.value}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                                        option.value === value ? 'bg-resdes-blue text-white hover:bg-resdes-blue' : 'text-gray-900'
                                    }`}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    {option.label}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

DropdownFilter.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired
    })).isRequired,
    placeholder: PropTypes.string,
    className: PropTypes.string,
    label: PropTypes.string,
    allowClear: PropTypes.bool
};

export default DropdownFilter;
