/*
 * @name utils
 * @file /docman/frontend/src/lib/utils.js
 * @module utils
 * @description Backend utility functions for object validation and common server-side operations
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
/**
 * Format a date to a human-readable string
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string in "MMM DD, YYYY" format
 */
export function formatDate(date) {
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/**
 * Manual JWT token decoder
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded JWT payload or null if invalid
 */
export function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        // atob -> percent-encoding -> decodeURIComponent to support unicode payloads
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (_) {
        return null;
    }
};

/**
 * Helper function to generate navigation link classes based on current path
 * @param {string} currentPath - Current page path
 * @param {string} targetPath - Target link path
 * @param {string} [base="btn px-3 py-3 font-semibold text-sm"] - Base CSS classes
 * @returns {string} CSS classes for the navigation link
 */
export const getLinkClass = (currentPath, targetPath, base = "btn px-3 py-3 font-semibold text-sm") =>
    currentPath === targetPath
        ? `${base} bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300`
        : `${base} btn-ghost`;

/**
 * Truncate text to a specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} [maxLength=100] - Maximum length before truncation
 * @param {string} [suffix='...'] - Suffix to append when truncated
 * @returns {string} Truncated text with suffix or original text if within limit
 */
export function truncate(text, maxLength = 100, suffix = '...') {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + suffix;
}

/**
 * Get user role from JWT token in localStorage
 * @returns {string|null} User role or null if not authenticated
 */
export function getUserRole() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
        const decoded = decodeJWT(token);
        return decoded?.role ?? null;
    } catch {
        return null;
    }
}