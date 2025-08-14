/*
 * @author Richard Bakos
 * @version 2.0.0
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