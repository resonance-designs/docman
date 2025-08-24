/*
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
/**
 * Check if all fields in an object are empty
 * Considers null, undefined, and empty/whitespace-only strings as empty values
 * @param {Object} obj - Object to check for empty fields
 * @returns {boolean} True if all fields are empty, false if any field has a value or if input is not a valid object
 * @example
 * areAllObjectFieldsEmpty({ name: '', age: null }) // returns true
 * areAllObjectFieldsEmpty({ name: 'John', age: null }) // returns false
 * areAllObjectFieldsEmpty(null) // returns false
 */
export function areAllObjectFieldsEmpty(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false; // Not a valid object to check
    }

    const values = Object.values(obj);

    for (const value of values) {
        if (value !== null && value !== undefined && String(value).trim() !== '') {
            return false; // Found a non-empty value
        }
    }
    return true; // All values are considered empty
}

/**
 * Sanitize error messages to prevent information disclosure
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default message to return
 * @returns {string} Sanitized error message
 */
export function sanitizeErrorMessage(error, defaultMessage = "An error occurred") {
    // In production, don't expose detailed error messages
    if (process.env.NODE_ENV === 'production') {
        return defaultMessage;
    }

    // In development, provide more details but still sanitize sensitive info
    if (error && error.message) {
        // Remove sensitive patterns from error messages
        const sensitivePatterns = [
            /password/gi,
            /token/gi,
            /secret/gi,
            /key/gi,
            /mongodb:\/\/[^@]+:[^@]+@/gi, // Database connection strings
            /\/[a-zA-Z]:[\\\/].*/g // File paths
        ];

        let sanitized = error.message;
        sensitivePatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        });

        return sanitized;
    }

    return defaultMessage;
}

/**
 * Log error securely without exposing sensitive information
 * @param {string} context - Context where error occurred
 * @param {Error} error - Error object
 * @param {Object} additionalInfo - Additional non-sensitive info to log
 */
export function logError(context, error, additionalInfo = {}) {
    const logData = {
        context,
        timestamp: new Date().toISOString(),
        message: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
        ...additionalInfo
    };

    console.error(`[${context}]`, logData);
}

/**
 * Check if user has super admin privileges
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user is super admin
 */
export function isSuperAdmin(user) {
    return user && user.role === 'superadmin';
}

/**
 * Check if user has admin privileges (admin or super admin)
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user is admin or super admin
 */
export function isAdminOrAbove(user) {
    return user && (user.role === 'admin' || user.role === 'superadmin');
}

/**
 * Check if user can manage all resources (super admin only)
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user can manage all resources
 */
export function canManageAll(user) {
    return isSuperAdmin(user);
}

/**
 * Check if user can edit a resource based on ownership/authorship
 * @param {Object} user - User object with id and role
 * @param {Object} resource - Resource object with ownership/authorship fields
 * @returns {boolean} True if user can edit the resource
 */
export function canEditResource(user, resource) {
    if (!user || !resource) return false;
    
    // Super admins can edit anything
    if (isSuperAdmin(user)) return true;
    
    const userId = user._id?.toString() || user.id?.toString();
    
    // Check if user is owner
    if (resource.owner && resource.owner.toString() === userId) return true;
    
    // Check if user is author
    if (resource.author && resource.author.toString() === userId) return true;
    
    // Check if user is in authors array
    if (resource.authors && Array.isArray(resource.authors)) {
        if (resource.authors.some(author => author.toString() === userId)) return true;
    }
    
    // Check if user is contributor/collaborator
    if (resource.contributors && Array.isArray(resource.contributors)) {
        if (resource.contributors.some(contributor => contributor.toString() === userId)) return true;
    }
    
    if (resource.collaborators && Array.isArray(resource.collaborators)) {
        if (resource.collaborators.some(collaborator => collaborator.toString() === userId)) return true;
    }
    
    // Check if user is manager (for projects/teams)
    if (resource.managers && Array.isArray(resource.managers)) {
        if (resource.managers.some(manager => manager.toString() === userId)) return true;
    }
    
    // Check if resource has isManager method (for projects)
    if (typeof resource.isManager === 'function' && resource.isManager(userId)) return true;
    
    // Check if resource has isMember method and user is member (for teams)
    if (typeof resource.isMember === 'function' && resource.isMember(userId)) return true;
    
    return false;
}