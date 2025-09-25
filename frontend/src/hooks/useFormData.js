/*
 * @name useFormData
 * @file /docman/frontend/src/hooks/useFormData.js
 * @hook useFormData
 * @description Custom hook for loading common form data (users, categories, external contact types)
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { ensureArray } from "../lib/safeUtils";

/**
 * Custom hook for loading common form data
 * @param {Object} options - Configuration options
 * @param {boolean} options.loadUsers - Whether to load users data
 * @param {boolean} options.loadCategories - Whether to load categories data
 * @param {boolean} options.loadExternalContactTypes - Whether to load external contact types
 * @param {boolean} options.showErrorToast - Whether to show error toast on failure
 * @returns {Object} Form data state and loading status
 */
export function useFormData({
    loadUsers = true,
    loadCategories = true,
    loadExternalContactTypes = true,
    showErrorToast = true
} = {}) {
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [externalContactTypes, setExternalContactTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Load all required form data
     */
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                const requests = [];
                
                if (loadUsers) {
                    requests.push(api.get("/users"));
                }
                if (loadCategories) {
                    requests.push(api.get("/categories"));
                }
                if (loadExternalContactTypes) {
                    requests.push(api.get("/external-contacts/types"));
                }

                const responses = await Promise.all(requests);
                
                let responseIndex = 0;
                
                if (loadUsers) {
                    const responseData = responses[responseIndex]?.data || {};
                    // Handle paginated response structure: { users: [...], pagination: {...} }
                    const usersData = responseData.users || responseData || [];
                    console.log('Users data loaded:', usersData);
                    setUsers(Array.isArray(usersData) ? usersData : []);
                    responseIndex++;
                }
                if (loadCategories) {
                    const responseData = responses[responseIndex]?.data || {};
                    // Handle paginated response structure: { categories: [...], pagination: {...} }
                    const categoriesData = responseData.categories || responseData || [];
                    console.log('Categories data loaded:', categoriesData);
                    setCategories(Array.isArray(categoriesData) ? categoriesData : []);
                    responseIndex++;
                }
                if (loadExternalContactTypes) {
                    const responseData = responses[responseIndex]?.data || [];
                    // Handle direct array response
                    const contactTypesData = Array.isArray(responseData) ? responseData : [];
                    console.log('External contact types data loaded:', contactTypesData);
                    setExternalContactTypes(contactTypesData);
                }

            } catch (err) {
                console.error("Could not load form data", err);
                setError(err);
                
                if (showErrorToast) {
                    toast.error("Failed to load form data");
                }
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [loadUsers, loadCategories, loadExternalContactTypes, showErrorToast]);

    /**
     * Reload all data
     */
    const reload = () => {
        setLoading(true);
        setError(null);
        // Trigger useEffect by updating a dependency
    };

    /**
     * Get user full name helper
     * @param {Object|string} user - User object or ID
     * @returns {string} Full name
     */
    const getFullName = (user) => {
        if (!user) return "Unknown";
        if (typeof user === "string") {
            const foundUser = ensureArray(users).find(u => u._id === user);
            if (foundUser) {
                return `${foundUser.firstname || ""} ${foundUser.lastname || ""}`.trim() || "Unknown";
            }
            return user;
        }
        return `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Unknown";
    };

    /**
     * Get category name helper
     * @param {Object|string} category - Category object or ID
     * @returns {string} Category name
     */
    const getCategoryName = (category) => {
        if (!category) return "Unknown";
        if (typeof category === "string") {
            const foundCategory = ensureArray(categories).find(c => c._id === category);
            return foundCategory?.name || category;
        }
        return category.name || "Unknown";
    };

    /**
     * Get external contact type name helper
     * @param {Object|string} type - Type object or ID
     * @returns {string} Type name
     */
    const getContactTypeName = (type) => {
        if (!type) return "Unknown";
        if (typeof type === "string") {
            const foundType = externalContactTypes.find(t => t._id === type);
            return foundType?.name || type;
        }
        return type.name || "Unknown";
    };

    return {
        // Data
        users,
        categories,
        externalContactTypes,
        
        // State
        loading,
        error,
        
        // Actions
        reload,
        
        // Helpers
        getFullName,
        getCategoryName,
        getContactTypeName
    };
}
