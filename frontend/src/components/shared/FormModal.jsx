/*
 * @name FormModal
 * @file /docman/frontend/src/components/shared/FormModal.jsx
 * @component FormModal
 * @description Reusable form modal component with validation, loading states, and error handling
 * @author Richard Bakos
 * @version 2.1.3
 * @license UNLICENSED
 */
import PropTypes from "prop-types";
import BaseModal from "./BaseModal";

/**
 * Form modal component with validation and loading states
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function called when modal should be closed
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Form content
 * @param {Function} props.onSubmit - Function called when form is submitted
 * @param {boolean} [props.loading=false] - Whether the form is in loading state
 * @param {string} [props.submitText="Submit"] - Text for submit button
 * @param {string} [props.cancelText="Cancel"] - Text for cancel button
 * @param {boolean} [props.showCancelButton=true] - Whether to show cancel button
 * @param {string} [props.submitButtonClass=""] - Additional classes for submit button
 * @param {string} [props.size="md"] - Modal size
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element} The form modal component
 */
const FormModal = ({
    isOpen,
    onClose,
    title,
    children,
    onSubmit,
    loading = false,
    submitText = "Submit",
    cancelText = "Cancel",
    showCancelButton = true,
    submitButtonClass = "",
    size = "md",
    className = ""
}) => {
    /**
     * Handle form submission
     * @param {Event} e - Form submit event
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(e);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size={size}
            className={className}
            closeOnOverlayClick={!loading} // Prevent closing while loading
            closeOnEscape={!loading} // Prevent closing while loading
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Form Content */}
                <div className="space-y-4">
                    {children}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
                    {showCancelButton && (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="btn btn-ghost"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`btn btn-primary ${submitButtonClass}`}
                    >
                        {loading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Loading...
                            </>
                        ) : (
                            submitText
                        )}
                    </button>
                </div>
            </form>
        </BaseModal>
    );
};

FormModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    onSubmit: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    submitText: PropTypes.string,
    cancelText: PropTypes.string,
    showCancelButton: PropTypes.bool,
    submitButtonClass: PropTypes.string,
    size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
    className: PropTypes.string
};

export default FormModal;
