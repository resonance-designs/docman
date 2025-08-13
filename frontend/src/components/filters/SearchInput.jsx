import { SearchIcon, XIcon } from "lucide-react";
import PropTypes from "prop-types";

const SearchInput = ({
    value,
    onChange,
    placeholder = "Search...",
    className = "",
    onClear
}) => {
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
