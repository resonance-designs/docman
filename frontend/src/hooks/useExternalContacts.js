/*
 * @name useExternalContacts
 * @file /docman/frontend/src/hooks/useExternalContacts.js
 * @hook useExternalContacts
 * @description Custom hook for managing external contacts in document forms
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import { useState, useCallback } from "react";

/**
 * Custom hook for managing external contacts
 * @param {Array} initialContacts - Initial external contacts array
 * @returns {Object} External contact management functions and state
 */
export function useExternalContacts(initialContacts = []) {
    const [selectedExternalContacts, setSelectedExternalContacts] = useState(initialContacts);
    const [newContactName, setNewContactName] = useState("");
    const [newContactEmail, setNewContactEmail] = useState("");
    const [newContactType, setNewContactType] = useState("");

    /**
     * Add a new external contact
     */
    const handleAddExternalContact = useCallback(() => {
        if (newContactName.trim() && newContactEmail.trim() && newContactType) {
            const newContact = {
                name: newContactName.trim(),
                email: newContactEmail.trim(),
                type: newContactType
            };
            
            const updatedContacts = [...selectedExternalContacts, newContact];
            setSelectedExternalContacts(updatedContacts);
            
            // Reset form fields
            setNewContactName("");
            setNewContactEmail("");
            setNewContactType("");
            
            return updatedContacts;
        }
        return selectedExternalContacts;
    }, [newContactName, newContactEmail, newContactType, selectedExternalContacts]);

    /**
     * Remove an external contact by index
     * @param {number} index - Index of contact to remove
     */
    const handleRemoveExternalContact = useCallback((index) => {
        const updatedContacts = selectedExternalContacts.filter((_, i) => i !== index);
        setSelectedExternalContacts(updatedContacts);
        return updatedContacts;
    }, [selectedExternalContacts]);

    /**
     * Update an external contact at a specific index
     * @param {number} index - Index of contact to update
     * @param {Object} updatedContact - Updated contact object
     */
    const handleUpdateExternalContact = useCallback((index, updatedContact) => {
        const updatedContacts = selectedExternalContacts.map((contact, i) => 
            i === index ? { ...contact, ...updatedContact } : contact
        );
        setSelectedExternalContacts(updatedContacts);
        return updatedContacts;
    }, [selectedExternalContacts]);

    /**
     * Reset external contacts to initial values
     */
    const resetExternalContacts = useCallback(() => {
        setSelectedExternalContacts(initialContacts);
        setNewContactName("");
        setNewContactEmail("");
        setNewContactType("");
    }, [initialContacts]);

    /**
     * Update external contacts from external source
     * @param {Array} contacts - New contacts array
     */
    const updateExternalContacts = useCallback((contacts = []) => {
        setSelectedExternalContacts(contacts);
    }, []);

    /**
     * Validate if current form fields are valid for adding a contact
     * @returns {boolean} True if form is valid
     */
    const isNewContactValid = useCallback(() => {
        return newContactName.trim().length > 0 && 
               newContactEmail.trim().length > 0 && 
               newContactType.length > 0 &&
               /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContactEmail.trim());
    }, [newContactName, newContactEmail, newContactType]);

    /**
     * Clear new contact form fields
     */
    const clearNewContactForm = useCallback(() => {
        setNewContactName("");
        setNewContactEmail("");
        setNewContactType("");
    }, []);

    return {
        // State
        selectedExternalContacts,
        newContactName,
        newContactEmail,
        newContactType,
        
        // Setters for form fields
        setNewContactName,
        setNewContactEmail,
        setNewContactType,
        
        // Contact management
        handleAddExternalContact,
        handleRemoveExternalContact,
        handleUpdateExternalContact,
        
        // Utility functions
        resetExternalContacts,
        updateExternalContacts,
        isNewContactValid,
        clearNewContactForm,
        
        // Direct setter
        setSelectedExternalContacts
    };
}
