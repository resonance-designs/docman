/*
 * @name useFileUpload
 * @file /docman/frontend/src/hooks/useFileUpload.js
 * @hook useFileUpload
 * @description Custom hook for managing file upload state and progress
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useState, useCallback } from "react";

/**
 * Custom hook for managing file upload operations
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback when upload succeeds
 * @param {Function} options.onError - Callback when upload fails
 * @param {boolean} options.resetOnSuccess - Whether to reset state on success
 * @returns {Object} File upload state and functions
 */
export function useFileUpload({ onSuccess, onError, resetOnSuccess = true } = {}) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState(null);

    /**
     * Reset upload state
     */
    const resetUpload = useCallback(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadError(null);
    }, []);

    /**
     * Handle upload progress
     * @param {ProgressEvent} progressEvent - Upload progress event
     */
    const handleUploadProgress = useCallback((progressEvent) => {
        const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        setUploadProgress(percentCompleted);
    }, []);

    /**
     * Start upload operation
     * @param {Function} uploadFunction - Function that performs the upload
     * @param {any} uploadData - Data to upload
     * @returns {Promise} Upload promise
     */
    const startUpload = useCallback(async (uploadFunction, uploadData) => {
        try {
            setUploading(true);
            setUploadError(null);
            setUploadProgress(0);

            const result = await uploadFunction(uploadData, {
                onUploadProgress: handleUploadProgress
            });

            if (resetOnSuccess) {
                resetUpload();
            } else {
                setUploading(false);
                setUploadProgress(100);
            }

            if (onSuccess) {
                onSuccess(result);
            }

            return result;
        } catch (error) {
            setUploading(false);
            setUploadError(error);
            
            if (onError) {
                onError(error);
            }
            
            throw error;
        }
    }, [handleUploadProgress, resetOnSuccess, onSuccess, onError, resetUpload]);

    return {
        uploading,
        uploadProgress,
        uploadError,
        startUpload,
        resetUpload,
        handleUploadProgress
    };
}
