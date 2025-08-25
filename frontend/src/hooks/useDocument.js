/*
 * @name useDocument
 * @file /docman/frontend/src/hooks/useDocument.js
 * @hook useDocument
 * @description Custom hook for loading and managing document data
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useState, useEffect, useCallback } from "react";
import api from "../lib/axios";
import toast from "react-hot-toast";

/**
 * Custom hook for managing document data
 * @param {string} documentId - Document ID to load
 * @param {Object} options - Configuration options
 * @param {boolean} options.loadFiles - Whether to load document files
 * @param {boolean} options.loadVersionHistory - Whether to load version history
 * @param {boolean} options.showErrorToast - Whether to show error toast on failure
 * @returns {Object} Document state and functions
 */
export function useDocument(documentId, {
    loadFiles = true,
    loadVersionHistory = true,
    showErrorToast = true
} = {}) {
    const [document, setDocument] = useState(null);
    const [files, setFiles] = useState([]);
    const [versionHistory, setVersionHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Load document data
     */
    const loadDocument = useCallback(async () => {
        if (!documentId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const requests = [api.get(`/docs/${documentId}`)];
            
            if (loadFiles) {
                requests.push(api.get(`/docs/${documentId}/files`));
            }
            if (loadVersionHistory) {
                requests.push(api.get(`/docs/${documentId}/history`));
            }

            const responses = await Promise.all(requests);
            
            setDocument(responses[0]?.data || null);
            
            if (loadFiles) {
                setFiles(responses[1]?.data || []);
            }
            if (loadVersionHistory) {
                setVersionHistory(responses[2]?.data || []);
            }

        } catch (err) {
            console.error("Could not load document", err);
            setError(err);
            
            if (showErrorToast) {
                toast.error("Failed to load document");
            }
        } finally {
            setLoading(false);
        }
    }, [documentId, loadFiles, loadVersionHistory, showErrorToast]);

    /**
     * Update document data
     * @param {Object} updates - Document updates
     */
    const updateDocument = useCallback((updates) => {
        setDocument(prev => prev ? { ...prev, ...updates } : null);
    }, []);

    /**
     * Refresh document data from server
     */
    const refreshDocument = useCallback(async () => {
        if (!documentId) return;
        
        try {
            const response = await api.get(`/docs/${documentId}`);
            setDocument(response.data);
        } catch (error) {
            console.error("Error refreshing document:", error);
        }
    }, [documentId]);

    /**
     * Add file to document
     * @param {Object} file - File to add
     */
    const addFile = useCallback((file) => {
        setFiles(prev => [...prev, file]);
    }, []);

    /**
     * Remove file from document
     * @param {string} fileId - File ID to remove
     */
    const removeFile = useCallback((fileId) => {
        setFiles(prev => prev.filter(f => f._id !== fileId));
    }, []);

    /**
     * Add version to history
     * @param {Object} version - Version to add
     */
    const addVersion = useCallback((version) => {
        setVersionHistory(prev => [version, ...prev]);
    }, []);

    /**
     * Check if document needs review
     */
    const needsReview = document && new Date(document.reviewDate) <= new Date();

    /**
     * Check if user is document owner
     * @param {string} userId - User ID to check
     */
    const isOwner = useCallback((userId) => {
        if (!document || !userId) return false;
        
        const owners = document.owners || [];
        return owners.some(owner => {
            const ownerId = typeof owner === 'object' ? owner._id : owner;
            return ownerId === userId;
        });
    }, [document]);

    /**
     * Check if user is document author
     * @param {string} userId - User ID to check
     */
    const isAuthor = useCallback((userId) => {
        if (!document || !userId) return false;
        
        const authorId = typeof document.author === 'object' ? document.author._id : document.author;
        return authorId === userId;
    }, [document]);

    /**
     * Check if user is stakeholder
     * @param {string} userId - User ID to check
     */
    const isStakeholder = useCallback((userId) => {
        if (!document || !userId) return false;
        
        const stakeholders = document.stakeholders || [];
        return stakeholders.some(stakeholder => {
            const stakeholderId = typeof stakeholder === 'object' ? stakeholder._id : stakeholder;
            return stakeholderId === userId;
        });
    }, [document]);

    /**
     * Check if user is review assignee
     * @param {string} userId - User ID to check
     */
    const isReviewAssignee = useCallback((userId) => {
        if (!document || !userId) return false;
        
        const reviewAssignees = document.reviewAssignees || [];
        return reviewAssignees.some(assignee => {
            const assigneeId = typeof assignee === 'object' ? assignee._id : assignee;
            return assigneeId === userId;
        });
    }, [document]);

    /**
     * Get document status
     */
    const getStatus = useCallback(() => {
        if (!document) return 'unknown';
        
        if (needsReview) return 'needs-review';
        if (document.status) return document.status;
        return 'active';
    }, [document, needsReview]);

    /**
     * Load document on mount and when documentId changes
     */
    useEffect(() => {
        loadDocument();
    }, [loadDocument]);

    return {
        // Data
        document,
        files,
        versionHistory,
        
        // State
        loading,
        error,
        
        // Computed
        needsReview,
        status: getStatus(),
        
        // Actions
        loadDocument,
        updateDocument,
        refreshDocument,
        addFile,
        removeFile,
        addVersion,
        
        // Checks
        isOwner,
        isAuthor,
        isStakeholder,
        isReviewAssignee
    };
}
