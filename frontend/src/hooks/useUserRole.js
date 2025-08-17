/*
 * @name useUserRole
 * @file /docman/frontend/src/hooks/useUserRole.js
 * @hook useUserRole
 * @description Custom hook for managing user authentication and role state
 * @author Richard Bakos
 * @version 2.0.2
 * @license UNLICENSED
 */
import { useState, useEffect, useCallback } from "react";
import { decodeJWT, getUserRole } from "../lib/utils";

/**
 * Custom hook for managing user role and authentication state
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoUpdate - Whether to automatically update on storage changes
 * @returns {Object} User role state and functions
 */
export function useUserRole({ autoUpdate = true } = {}) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    /**
     * Update authentication state from localStorage
     */
    const updateAuthState = useCallback(() => {
        try {
            const token = localStorage.getItem("token");
            const authenticated = !!token;

            setIsAuthenticated(authenticated);

            if (token) {
                const decoded = decodeJWT(token);

                // Check if token is expired
                if (decoded && decoded.exp) {
                    const now = Math.floor(Date.now() / 1000);
                    const timeUntilExpiry = decoded.exp - now;

                    if (timeUntilExpiry <= 0) {
                        console.log("🔒 Token expired, clearing localStorage");
                        localStorage.removeItem("token");
                        setIsAuthenticated(false);
                        setUserRole(null);
                        setUserId(null);
                        setUserInfo(null);
                        return;
                    }

                    console.log("🔒 Token valid for", Math.floor(timeUntilExpiry / 60), "more minutes");
                }

                const role = getUserRole();
                setUserRole(role);
                setUserId(decoded?.userId || decoded?.id || null);
                setUserInfo(decoded || null);
            } else {
                setUserRole(null);
                setUserId(null);
                setUserInfo(null);
            }
        } catch (error) {
            console.error("🔄 useUserRole: Error updating auth state:", error);
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setUserInfo(null);
        } finally {
            setLoading(false);
        }
    }, [setIsAuthenticated, setUserRole, setUserId, setUserInfo, setLoading]); // Include state setters as dependencies

    /**
     * Check if user has specific role
     * @param {string|Array} roles - Role or array of roles to check
     * @returns {boolean} Whether user has the role(s)
     */
    const hasRole = useCallback((roles) => {
        if (!userRole) return false;
        
        if (Array.isArray(roles)) {
            return roles.includes(userRole);
        }
        
        return userRole === roles;
    }, [userRole]);

    /**
     * Check if user has permission level (hierarchical)
     * @param {string} minRole - Minimum required role
     * @returns {boolean} Whether user has sufficient permissions
     */
    const hasPermission = useCallback((minRole) => {
        if (!userRole) return false;

        const roleHierarchy = {
            viewer: 1,
            editor: 2,
            admin: 3
        };

        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[minRole] || 0;

        return userLevel >= requiredLevel;
    }, [userRole]);

    /**
     * Check if user can edit (editor or admin)
     */
    const canEdit = hasPermission("editor");

    /**
     * Check if user is admin
     */
    const isAdmin = hasRole("admin");

    /**
     * Check if user is viewer only
     */
    const isViewer = hasRole("viewer");

    /**
     * Logout user
     */
    const logout = useCallback(() => {
        localStorage.removeItem("token");
        // Update state immediately
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setUserInfo(null);
        setLoading(false);

        // Dispatch event to notify other components
        window.dispatchEvent(new Event('authStateChanged'));
    }, []);

    /**
     * Initial auth state check
     */
    useEffect(() => {
        updateAuthState();
    }, []); // Empty dependency array for initial load only

    /**
     * Listen for storage changes (for multi-tab support) and auth state changes
     */
    useEffect(() => {
        if (!autoUpdate) return;

        const handleStorageChange = (e) => {
            if (e.key === "token") {
                updateAuthState();
            }
        };

        const handleAuthStateChange = () => {
            updateAuthState();
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("authStateChanged", handleAuthStateChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("authStateChanged", handleAuthStateChange);
        };
    }, [autoUpdate, updateAuthState]); // Include updateAuthState to ensure fresh closure

    return {
        // State
        isAuthenticated,
        userRole,
        userId,
        userInfo,
        loading,

        // Permission checks
        hasRole,
        hasPermission,
        canEdit,
        isAdmin,
        isViewer,

        // Actions
        updateAuthState,
        logout
    };
}
