/*
 * @name useApi
 * @file /docman/frontend/src/hooks/useApi.js
 * @hook useApi
 * @description Custom hook for managing API operations with loading states and error handling
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import { useState, useCallback } from "react";
import toast from "react-hot-toast";

/**
 * Custom hook for managing API operations
 * @param {Object} options - Configuration options
 * @param {boolean} options.showSuccessToast - Whether to show success toast
 * @param {boolean} options.showErrorToast - Whether to show error toast
 * @param {string} options.successMessage - Default success message
 * @param {string} options.errorMessage - Default error message
 * @returns {Object} API operation state and functions
 */
export function useApi({
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = "Operation completed successfully",
    errorMessage = "Operation failed"
} = {}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    /**
     * Execute an API operation
     * @param {Function} apiFunction - Function that returns a promise
     * @param {Object} options - Operation-specific options
     * @param {string} options.successMessage - Success message for this operation
     * @param {string} options.errorMessage - Error message for this operation
     * @param {boolean} options.showSuccessToast - Override global success toast setting
     * @param {boolean} options.showErrorToast - Override global error toast setting
     * @param {Function} options.onSuccess - Callback on success
     * @param {Function} options.onError - Callback on error
     * @returns {Promise} Operation result
     */
    const execute = useCallback(async (apiFunction, {
        successMessage: opSuccessMessage,
        errorMessage: opErrorMessage,
        showSuccessToast: opShowSuccessToast,
        showErrorToast: opShowErrorToast,
        onSuccess,
        onError
    } = {}) => {
        try {
            setLoading(true);
            setError(null);

            const result = await apiFunction();
            setData(result);

            // Show success toast if enabled
            const shouldShowSuccessToast = opShowSuccessToast !== undefined 
                ? opShowSuccessToast 
                : showSuccessToast;
            
            if (shouldShowSuccessToast) {
                toast.success(opSuccessMessage || successMessage);
            }

            // Call success callback
            if (onSuccess) {
                onSuccess(result);
            }

            return result;
        } catch (err) {
            setError(err);

            // Show error toast if enabled
            const shouldShowErrorToast = opShowErrorToast !== undefined 
                ? opShowErrorToast 
                : showErrorToast;
            
            if (shouldShowErrorToast) {
                const message = err.response?.data?.message || opErrorMessage || errorMessage;
                toast.error(message);
            }

            // Call error callback
            if (onError) {
                onError(err);
            }

            throw err;
        } finally {
            setLoading(false);
        }
    }, [showSuccessToast, showErrorToast, successMessage, errorMessage]);

    /**
     * Reset state
     */
    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setData(null);
    }, []);

    /**
     * Clear error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // State
        loading,
        error,
        data,
        
        // Actions
        execute,
        reset,
        clearError
    };
}
