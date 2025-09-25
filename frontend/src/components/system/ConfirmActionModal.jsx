/*
 * @name ConfirmActionModal
 * @file /docman/frontend/src/components/system/ConfirmActionModal.jsx
 * @component ConfirmActionModal
 * @description Confirmation modal for dangerous system actions
 * @version 2.2.0
 * @license UNLICENSED
 */
import PropTypes from "prop-types";
import { AlertTriangleIcon } from "lucide-react";
import BaseModal from "../shared/BaseModal";

/**
 * Confirmation modal for dangerous system actions
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function called when modal should be closed
 * @param {string} props.title - Modal title
 * @param {string} props.message - Confirmation message
 * @param {string} props.actionName - Name of the action (displayed on confirm button)
 * @param {Function} props.onConfirm - Function called when action is confirmed
 * @param {boolean} [props.isLoading=false] - Whether the action is in progress
 * @returns {JSX.Element} The confirmation modal component
 */
const ConfirmActionModal = ({
    isOpen,
    onClose,
    title,
    message,
    actionName,
    onConfirm,
    isLoading = false
}) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="md"
        >
            <div className="flex flex-col items-center gap-4">
                <div className="bg-warning/20 p-4 rounded-full">
                    <AlertTriangleIcon className="w-12 h-12 text-warning" />
                </div>
                
                <div className="text-center">
                    <p className="text-base-content mb-4">{message}</p>
                    <p className="text-error font-semibold mb-6">This action cannot be undone!</p>
                </div>
                
                <div className="flex gap-4 w-full justify-center">
                    <button
                        className="btn btn-outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-error"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Processing...
                            </>
                        ) : (
                            actionName
                        )}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

ConfirmActionModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    actionName: PropTypes.string.isRequired,
    onConfirm: PropTypes.func.isRequired,
    isLoading: PropTypes.bool
};

export default ConfirmActionModal;