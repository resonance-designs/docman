/*
 * @name BaseModal
 * @file /docman/frontend/src/components/shared/BaseModal.jsx
 * @component BaseModal
 * @description Reusable base modal component with consistent styling and behavior
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import { useEffect } from "react";
import { XIcon } from "lucide-react";
import PropTypes from "prop-types";

/**
 * Base modal component with consistent styling and behavior
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function called when modal should be closed
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.size="md"] - Modal size (sm, md, lg, xl)
 * @param {boolean} [props.showCloseButton=true] - Whether to show the close button
 * @param {boolean} [props.closeOnOverlayClick=true] - Whether to close on overlay click
 * @param {boolean} [props.closeOnEscape=true] - Whether to close on escape key
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element|null} The modal component or null if not open
 */
const BaseModal = ({
    isOpen,
    onClose,
    title,
    children,
    size = "md",
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className = ""
}) => {
    // Handle escape key press
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleEscape = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Size classes mapping
    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl"
    };

    /**
     * Handle overlay click
     * @param {Event} e - Click event
     */
    const handleOverlayClick = (e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={handleOverlayClick}
        >
            <div 
                className={`
                    bg-base-100 rounded-lg shadow-xl w-full ${sizeClasses[size]} 
                    max-h-[90vh] overflow-hidden flex flex-col
                    ${className}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-base-300">
                    <h2 className="text-xl font-semibold text-base-content">
                        {title}
                    </h2>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="btn btn-ghost btn-sm btn-circle"
                            aria-label="Close modal"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

BaseModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
    showCloseButton: PropTypes.bool,
    closeOnOverlayClick: PropTypes.bool,
    closeOnEscape: PropTypes.bool,
    className: PropTypes.string
};

export default BaseModal;
