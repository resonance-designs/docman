/*
 * @name Inline Loader Component
 * @file /docman/frontend/src/components/InlineLoader.jsx
 * @component InlineLoader
 * @description Component for loading indicators in the UI.
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import React from 'react';

/**
 * InlineLoader Component
 * A compact loading indicator for inline use (dropdowns, buttons, etc.)
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message to display
 * @param {string} props.size - Size of the loader ('xs', 'sm', 'md')
 * @param {string} props.color - Color theme ('teal', 'orange', 'blue', 'green', 'purple', 'red', 'yellow')
 * @param {string} props.className - Additional CSS classes
 */
const InlineLoader = ({ 
    message = "Loading...", 
    size = "sm", 
    color = "teal",
    className = ""
}) => {
    const sizeClasses = {
        xs: "w-4 h-4",
        sm: "w-5 h-5",
        md: "w-6 h-6"
    };

    const colorClasses = {
        teal: "text-resdes-teal",
        orange: "text-resdes-orange", 
        blue: "text-resdes-blue",
        green: "text-resdes-green",
        purple: "text-resdes-purple",
        red: "text-resdes-red",
        yellow: "text-resdes-yellow"
    };

    const textSizeClasses = {
        xs: "text-xs",
        sm: "text-sm",
        md: "text-base"
    };

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            {/* Simple spinning circle */}
            <div className={`${sizeClasses[size]} ${colorClasses[color]}`}>
                <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                    />
                    <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            </div>
            
            {/* Loading text */}
            <span className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}>
                {message}
            </span>
        </div>
    );
};

export default InlineLoader;