// Format a date to a human-readable string
export function formatDate(date) {
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// Manual JWT Decode
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

// Helper function to generate navigation link classes
export const getLinkClass = (currentPath, targetPath, base = "btn px-3 py-3 font-semibold text-sm") =>
    currentPath === targetPath
        ? `${base} bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300`
        : `${base} btn-ghost`;

// Truncate text to a specified length with ellipsis
export function truncate(text, maxLength = 100, suffix = '...') {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + suffix;
}