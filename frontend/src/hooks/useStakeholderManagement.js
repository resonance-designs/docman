/*
 * @name useStakeholderManagement
 * @file /docman/frontend/src/hooks/useStakeholderManagement.js
 * @hook useStakeholderManagement
 * @description Custom hook for managing stakeholders and owners in document forms
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import { useState, useCallback } from "react";

/**
 * Custom hook for managing stakeholders and owners
 * @param {Function} setValue - React Hook Form setValue function
 * @param {Array} initialStakeholders - Initial stakeholders array
 * @param {Array} initialOwners - Initial owners array
 * @returns {Object} Stakeholder and owner management functions and state
 */
export function useStakeholderManagement(setValue, initialStakeholders = [], initialOwners = []) {
    const [selectedStakeholders, setSelectedStakeholders] = useState(initialStakeholders);
    const [selectedOwners, setSelectedOwners] = useState(initialOwners);

    /**
     * Add a stakeholder to the selected list
     * @param {string} userId - User ID to add as stakeholder
     */
    const handleStakeholderAdd = useCallback((userId) => {
        if (!selectedStakeholders.includes(userId)) {
            const newStakeholders = [...selectedStakeholders, userId];
            setSelectedStakeholders(newStakeholders);
            setValue('stakeholders', newStakeholders);
        }
    }, [selectedStakeholders, setValue]);

    /**
     * Remove a stakeholder from the selected list
     * @param {string} userId - User ID to remove as stakeholder
     */
    const handleStakeholderRemove = useCallback((userId) => {
        const newStakeholders = selectedStakeholders.filter(id => id !== userId);
        setSelectedStakeholders(newStakeholders);
        setValue('stakeholders', newStakeholders);
    }, [selectedStakeholders, setValue]);

    /**
     * Add an owner to the selected list
     * @param {string} userId - User ID to add as owner
     */
    const handleOwnerAdd = useCallback((userId) => {
        if (!selectedOwners.includes(userId)) {
            const newOwners = [...selectedOwners, userId];
            setSelectedOwners(newOwners);
            setValue('owners', newOwners);
        }
    }, [selectedOwners, setValue]);

    /**
     * Remove an owner from the selected list
     * @param {string} userId - User ID to remove as owner
     */
    const handleOwnerRemove = useCallback((userId) => {
        const newOwners = selectedOwners.filter(id => id !== userId);
        setSelectedOwners(newOwners);
        setValue('owners', newOwners);
    }, [selectedOwners, setValue]);

    /**
     * Reset stakeholders and owners to initial values
     */
    const resetStakeholdersAndOwners = useCallback(() => {
        setSelectedStakeholders(initialStakeholders);
        setSelectedOwners(initialOwners);
        setValue('stakeholders', initialStakeholders);
        setValue('owners', initialOwners);
    }, [initialStakeholders, initialOwners, setValue]);

    /**
     * Update stakeholders and owners from external source (e.g., form reset)
     * @param {Array} stakeholders - New stakeholders array
     * @param {Array} owners - New owners array
     */
    const updateStakeholdersAndOwners = useCallback((stakeholders = [], owners = []) => {
        setSelectedStakeholders(stakeholders);
        setSelectedOwners(owners);
        setValue('stakeholders', stakeholders);
        setValue('owners', owners);
    }, [setValue]);

    /**
     * Update only owners from external source
     * @param {Array} owners - New owners array
     */
    const updateOwners = useCallback((owners = []) => {
        setSelectedOwners(owners);
        setValue('owners', owners);
    }, [setValue]);

    /**
     * Update only stakeholders from external source
     * @param {Array} stakeholders - New stakeholders array
     */
    const updateStakeholders = useCallback((stakeholders = []) => {
        setSelectedStakeholders(stakeholders);
        setValue('stakeholders', stakeholders);
    }, [setValue]);

    return {
        // State
        selectedStakeholders,
        selectedOwners,
        
        // Stakeholder management
        handleStakeholderAdd,
        handleStakeholderRemove,
        
        // Owner management
        handleOwnerAdd,
        handleOwnerRemove,
        
        // Utility functions
        resetStakeholdersAndOwners,
        updateStakeholdersAndOwners,
        updateOwners,
        updateStakeholders,
        
        // Setters for direct state updates
        setSelectedStakeholders,
        setSelectedOwners
    };
}
