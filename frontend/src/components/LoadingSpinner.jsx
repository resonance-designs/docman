/*
 * @name Loading Spinner Component
 * @file /docman/frontend/src/components/LoadingSpinner.jsx
 * @component LoadingSpinner
 * @description Component for displaying a loading spinner with an optional message. The component can be customized in terms of size, color and whether it should cover the entire screen or not.
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import React from 'react';

/**
 * LoadingSpinner Component
 * A reusable loading spinner that fits the application's design theme
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message to display
 * @param {string} props.size - Size of the spinner ('sm', 'md', 'lg', 'xl')
 * @param {string} props.color - Color theme ('teal', 'orange', 'blue', 'green', 'purple', 'red', 'yellow')
 * @param {boolean} props.fullScreen - Whether to display as full screen loader
 * @param {string} props.className - Additional CSS classes
 */
const LoadingSpinner = ({
    message = "Loading...",
    size = "md",
    color = "teal",
    fullScreen = false,
    className = ""
}) => {
    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-8 h-8",
        lg: "w-12 h-12",
        xl: "w-16 h-16"
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
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
        xl: "text-xl"
    };

    const containerClasses = fullScreen
        ? "min-h-screen flex items-center justify-center"
        : "flex items-center justify-center py-8";

    return (
        <div className={`${containerClasses} ${className}`}>
            <div className="flex flex-col items-center space-y-4">
                {/* Animated Spinner */}
                <div className="relative">
                    {/* Outer ring */}
                    <div className={`${sizeClasses[size]} ${colorClasses[color]} opacity-25`}>
                        <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                        </svg>
                    </div>

                    {/* Inner spinning arc */}
                    <div className={`absolute inset-0 ${sizeClasses[size]} ${colorClasses[color]}`}>
                        <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Loading Message */}
                <div className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium animate-pulse`}>
                    {message}
                </div>

                {/* Animated dots */}
                <div className="flex space-x-1">
                    <div className={`w-2 h-2 ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                    <div className={`w-2 h-2 ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                    <div className={`w-2 h-2 ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
};

export default LoadingSpinner;