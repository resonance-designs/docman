/*
 * @name useDocumentManagement
 * @file /docman/frontend/src/hooks/useDocumentManagement.js
 * @hook useDocumentManagement
 * @description Custom hook for managing document selection in book forms
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import { useState, useCallback } from "react";

/**
 * Custom hook for managing document selection
 * @param {Function} setValue - React Hook Form setValue function
 * @param {Array} initialDocuments - Initial documents array
 * @returns {Object} Document management functions and state
 */
export function useDocumentManagement(setValue, initialDocuments = []) {
    const [selectedDocuments, setSelectedDocuments] = useState(initialDocuments);

    /**
     * Add a document to the selected list
     * @param {string} documentId - Document ID to add
     */
    const handleDocumentAdd = useCallback((documentId) => {
        if (!selectedDocuments.includes(documentId)) {
            const newDocuments = [...selectedDocuments, documentId];
            setSelectedDocuments(newDocuments);
            setValue('documents', newDocuments);
        }
    }, [selectedDocuments, setValue]);

    /**
     * Remove a document from the selected list
     * @param {string} documentId - Document ID to remove
     */
    const handleDocumentRemove = useCallback((documentId) => {
        const newDocuments = selectedDocuments.filter(id => id !== documentId);
        setSelectedDocuments(newDocuments);
        setValue('documents', newDocuments);
    }, [selectedDocuments, setValue]);

    /**
     * Reset documents to initial values
     */
    const resetDocuments = useCallback(() => {
        setSelectedDocuments(initialDocuments);
        setValue('documents', initialDocuments);
    }, [initialDocuments, setValue]);

    /**
     * Update documents from external source (e.g., form reset)
     * @param {Array} documents - New documents array
     */
    const updateDocuments = useCallback((documents = []) => {
        setSelectedDocuments(documents);
        setValue('documents', documents);
    }, [setValue]);

    return {
        // State
        selectedDocuments,
        
        // Document management
        handleDocumentAdd,
        handleDocumentRemove,
        
        // Utility functions
        resetDocuments,
        updateDocuments,
        
        // Setter for direct state updates
        setSelectedDocuments
    };
}