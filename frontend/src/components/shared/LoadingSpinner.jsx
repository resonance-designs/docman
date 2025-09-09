/*
 * @name LoadingSpinner
 * @file /docman/frontend/src/components/shared/LoadingSpinner.jsx
 * @component LoadingSpinner
 * @description Reusable loading spinner component with various sizes and styles
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import PropTypes from "prop-types";

/**
 * Reusable loading spinner component
 * @param {Object} props - Component properties
 * @param {string} [props.size="md"] - Spinner size (xs, sm, md, lg, xl)
 * @param {string} [props.color="primary"] - Spinner color theme
 * @param {string} [props.text=""] - Optional loading text
 * @param {boolean} [props.overlay=false] - Whether to show as overlay
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element} The loading spinner component
 */
const LoadingSpinner = ({
    size = "md",
    color = "primary",
    text = "",
    overlay = false,
    className = ""
}) => {
    // Size classes mapping
    const sizeClasses = {
        xs: "loading-xs",
        sm: "loading-sm",
        md: "loading-md",
        lg: "loading-lg",
        xl: "loading-xl"
    };

    // Color classes mapping
    const colorClasses = {
        primary: "text-primary",
        secondary: "text-secondary",
        accent: "text-accent",
        neutral: "text-neutral",
        info: "text-info",
        success: "text-success",
        warning: "text-warning",
        error: "text-error"
    };

    const spinnerClasses = `
        loading loading-spinner
        ${sizeClasses[size] || sizeClasses.md}
        ${colorClasses[color] || colorClasses.primary}
        ${className}
    `;

    const content = (
        <div className="flex flex-col items-center justify-center gap-3">
            <span className={spinnerClasses}></span>
            {text && (
                <p className="text-base-content/70 text-sm font-medium">
                    {text}
                </p>
            )}
        </div>
    );

    if (overlay) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-base-100 rounded-lg p-8 shadow-xl">
                    {content}
                </div>
            </div>
        );
    }

    return content;
};

LoadingSpinner.propTypes = {
    size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
    color: PropTypes.oneOf([
        "primary", "secondary", "accent", "neutral",
        "info", "success", "warning", "error"
    ]),
    text: PropTypes.string,
    overlay: PropTypes.bool,
    className: PropTypes.string
};

export default LoadingSpinner;
