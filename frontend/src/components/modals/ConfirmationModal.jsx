/*
 * @name ConfirmationModal
 * @file /docman/frontend/src/components/modals/ConfirmationModal.jsx
 * @component ConfirmationModal
 * @description A reusable confirmation modal component for confirming user actions
 * @version 2.1.10
 * @license UNLICENSED
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * A reusable confirmation modal component for confirming user actions
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Modal title
 * @param {string} props.message - Modal message/description
 * @param {string} props.confirmText - Text for the confirm button
 * @param {string} props.cancelText - Text for the cancel button
 * @param {string} props.confirmButtonClass - CSS class for the confirm button
 * @param {Function} props.onConfirm - Function to call when confirm is clicked
 * @param {Function} props.onCancel - Function to call when cancel is clicked
 * @returns {JSX.Element} The confirmation modal component
 */
const ConfirmationModal = ({
    title = "Confirm Action",
    message = "Are you sure you want to proceed with this action?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmButtonClass = "btn bg-red-600 text-white hover:bg-red-700",
    onConfirm,
    onCancel
}) => {
    // Prevent clicks inside the modal from closing it
    const handleModalClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onCancel}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
                onClick={handleModalClick}
            >
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        <AlertTriangle className="text-red-500 mr-3 h-6 w-6" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        {message}
                    </p>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={confirmButtonClass}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;