/*
 * @name useReviewAssignments
 * @file /docman/frontend/src/hooks/useReviewAssignments.js
 * @hook useReviewAssignments
 * @description Custom hook for managing document review assignments and completion status
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useState, useEffect, useCallback } from "react";
import api from "../lib/axios";
import toast from "react-hot-toast";

/**
 * Custom hook for managing review assignments
 * @param {string} documentId - Document ID to load assignments for
 * @param {string} userId - Current user ID
 * @param {Function} onStatusChange - Optional callback when assignment status changes
 * @returns {Object} Review assignments state and functions
 */
export function useReviewAssignments(documentId, userId, onStatusChange) {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Load review assignments for the document
     */
    const loadAssignments = useCallback(async () => {
        if (!documentId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await api.get(`/reviews/document/${documentId}`);
            const fetchedAssignments = response.data || [];
            
            // Filter out any assignments with null or invalid assignees
            const validAssignments = fetchedAssignments.filter(assignment => 
                assignment && 
                assignment.assignee && 
                assignment.assignee._id
            );
            
            setAssignments(validAssignments);
        } catch (err) {
            console.error("Could not load review assignments", err);
            setError(err);
            toast.error("Failed to load review assignments");
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    /**
     * Update review assignment status
     * @param {string} assignmentId - Assignment ID to update
     * @param {string} status - New status ('completed' or other)
     * @param {Object} additionalData - Additional data to update
     */
    const updateAssignmentStatus = useCallback(async (assignmentId, status, additionalData = {}) => {
        try {
            const response = await api.put(`/reviews/${assignmentId}`, {
                status,
                ...additionalData
            });

            // Update local state
            setAssignments(prev => prev.map(assignment => 
                assignment._id === assignmentId 
                    ? { ...assignment, ...response.data.assignment }
                    : assignment
            ));

            toast.success(`Review ${status === 'completed' ? 'completed' : 'updated'} successfully`);
            
            // Call the status change callback if provided
            if (onStatusChange) {
                onStatusChange(response.data.assignment);
            }
            
            return response.data.assignment;
        } catch (err) {
            console.error("Could not update review assignment", err);
            toast.error("Failed to update review assignment");
            throw err;
        }
    }, [onStatusChange]);

    /**
     * Get current user's assignment for this document
     */
    const getCurrentUserAssignment = useCallback(() => {
        if (!userId || !assignments.length) return null;
        
        return assignments.find(assignment => {
            const assigneeId = typeof assignment.assignee === 'object' 
                ? assignment.assignee._id 
                : assignment.assignee;
            return assigneeId === userId;
        });
    }, [assignments, userId]);

    /**
     * Check if all assignments are completed
     */
    const areAllAssignmentsCompleted = useCallback(() => {
        if (!assignments.length) return false;
        return assignments.every(assignment => assignment.status === 'completed');
    }, [assignments]);

    /**
     * Get completion status for display
     */
    const getCompletionStatus = useCallback(() => {
        if (!assignments.length) return { completed: 0, total: 0, percentage: 0 };
        
        const completed = assignments.filter(assignment => assignment.status === 'completed').length;
        const total = assignments.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return { completed, total, percentage };
    }, [assignments]);

    /**
     * Load assignments on mount and when documentId changes
     */
    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

    return {
        // Data
        assignments,
        
        // State
        loading,
        error,
        
        // Computed
        currentUserAssignment: getCurrentUserAssignment(),
        allCompleted: areAllAssignmentsCompleted(),
        completionStatus: getCompletionStatus(),
        
        // Actions
        loadAssignments,
        updateAssignmentStatus
    };
}