/*
 * @name useReviewManagement
 * @file /docman/frontend/src/hooks/useReviewManagement.js
 * @hook useReviewManagement
 * @description Custom hook for managing document review assignments and scheduling
 * @author Richard Bakos
 * @version 2.0.2
 * @license UNLICENSED
 */
import { useState, useCallback } from "react";

/**
 * Custom hook for managing document review assignments
 * @param {Function} setValue - React Hook Form setValue function
 * @param {Array} initialAssignees - Initial review assignees
 * @param {Date} initialDueDate - Initial review due date
 * @param {string} initialNotes - Initial review notes
 * @returns {Object} Review management functions and state
 */
export function useReviewManagement(
    setValue, 
    initialAssignees = [], 
    initialDueDate = null, 
    initialNotes = ""
) {
    const [reviewAssignees, setReviewAssignees] = useState(initialAssignees);
    const [reviewDueDate, setReviewDueDate] = useState(initialDueDate);
    const [reviewNotes, setReviewNotes] = useState(initialNotes);

    /**
     * Add a review assignee
     * @param {string} userId - User ID to add as review assignee
     */
    const handleReviewAssigneeAdd = useCallback((userId) => {
        if (!userId) return;
        if (!reviewAssignees.includes(userId)) {
            const newAssignees = [...reviewAssignees, userId];
            setReviewAssignees(newAssignees);
            setValue('reviewAssignees', newAssignees);
        }
    }, [reviewAssignees, setValue]);

    /**
     * Remove a review assignee
     * @param {string} userId - User ID to remove as review assignee
     */
    const handleReviewAssigneeRemove = useCallback((userId) => {
        const newAssignees = reviewAssignees.filter(id => id !== userId);
        setReviewAssignees(newAssignees);
        setValue('reviewAssignees', newAssignees);
    }, [reviewAssignees, setValue]);

    /**
     * Handle review due date change
     * @param {Date} date - New due date
     */
    const handleReviewDueDateChange = useCallback((date) => {
        setReviewDueDate(date);
        setValue('reviewDueDate', date);
    }, [setValue]);

    /**
     * Handle review notes change
     * @param {string} notes - New review notes
     */
    const handleReviewNotesChange = useCallback((notes) => {
        setReviewNotes(notes);
        setValue('reviewNotes', notes);
    }, [setValue]);

    /**
     * Clear all review assignments
     */
    const clearReviewAssignments = useCallback(() => {
        setReviewAssignees([]);
        setReviewDueDate(null);
        setReviewNotes("");
        setValue('reviewAssignees', []);
        setValue('reviewDueDate', null);
        setValue('reviewNotes', "");
    }, [setValue]);

    /**
     * Reset review assignments to initial values
     */
    const resetReviewAssignments = useCallback(() => {
        setReviewAssignees(initialAssignees);
        setReviewDueDate(initialDueDate);
        setReviewNotes(initialNotes);
        setValue('reviewAssignees', initialAssignees);
        setValue('reviewDueDate', initialDueDate);
        setValue('reviewNotes', initialNotes);
    }, [initialAssignees, initialDueDate, initialNotes, setValue]);

    /**
     * Update review assignments from external source
     * @param {Array} assignees - New assignees array
     * @param {Date} dueDate - New due date
     * @param {string} notes - New notes
     */
    const updateReviewAssignments = useCallback((assignees = [], dueDate = null, notes = "") => {
        setReviewAssignees(assignees);
        setReviewDueDate(dueDate);
        setReviewNotes(notes);
        setValue('reviewAssignees', assignees);
        setValue('reviewDueDate', dueDate);
        setValue('reviewNotes', notes);
    }, [setValue]);

    /**
     * Check if review assignments are valid
     * @returns {boolean} True if valid
     */
    const isReviewAssignmentValid = useCallback(() => {
        // If there are assignees, there must be a due date
        if (reviewAssignees.length > 0 && !reviewDueDate) {
            return false;
        }
        return true;
    }, [reviewAssignees, reviewDueDate]);

    /**
     * Get validation error message
     * @returns {string|null} Error message or null if valid
     */
    const getReviewValidationError = useCallback(() => {
        if (reviewAssignees.length > 0 && !reviewDueDate) {
            return "Review due date is required when assignees are selected";
        }
        return null;
    }, [reviewAssignees, reviewDueDate]);

    return {
        // State
        reviewAssignees,
        reviewDueDate,
        reviewNotes,

        // Assignee management
        handleReviewAssigneeAdd,
        handleReviewAssigneeRemove,

        // Date and notes management
        handleReviewDueDateChange,
        handleReviewNotesChange,

        // Utility functions
        clearReviewAssignments,
        resetReviewAssignments,
        updateReviewAssignments,
        isReviewAssignmentValid,
        getReviewValidationError,

        // Direct setters
        setReviewAssignees,
        setReviewDueDate,
        setReviewNotes
    };
}
