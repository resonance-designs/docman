/*
 * @name inputValidation
 * @file /docman/backend/src/middleware/inputValidation.js
 * @middleware inputValidation
 * @description Centralized input validation middleware for sanitizing and validating all user inputs
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize string input to prevent XSS and injection attacks
 * @param {string} input - Input string to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
function sanitizeString(input, options = {}) {
    if (typeof input !== 'string') return input;
    
    const {
        allowHTML = false,
        maxLength = 10000,
        trim = true
    } = options;

    let sanitized = input;

    // Trim whitespace if requested
    if (trim) {
        sanitized = sanitized.trim();
    }

    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    // Sanitize HTML if not allowed
    if (!allowHTML) {
        sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
    } else {
        // Allow limited HTML tags
        sanitized = DOMPurify.sanitize(sanitized, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
            ALLOWED_ATTR: []
        });
    }

    // Escape special characters for database safety
    sanitized = validator.escape(sanitized);

    return sanitized;
}

/**
 * Validate and sanitize email addresses
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { isValid: false, sanitized: '', error: 'Email is required' };
    }

    const sanitized = sanitizeString(email, { maxLength: 254 });
    const isValid = validator.isEmail(sanitized);

    return {
        isValid,
        sanitized: isValid ? sanitized : '',
        error: isValid ? null : 'Invalid email format'
    };
}

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {Object} Validation result
 */
function validateObjectId(id) {
    if (!id || typeof id !== 'string') {
        return { isValid: false, sanitized: '', error: 'ID is required' };
    }

    const sanitized = sanitizeString(id, { maxLength: 24 });
    const isValid = validator.isMongoId(sanitized);

    return {
        isValid,
        sanitized: isValid ? sanitized : '',
        error: isValid ? null : 'Invalid ID format'
    };
}

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate
 * @returns {Object} Validation result
 */
function validateURL(url) {
    if (!url || typeof url !== 'string') {
        return { isValid: false, sanitized: '', error: 'URL is required' };
    }

    const sanitized = sanitizeString(url, { maxLength: 2048 });
    const isValid = validator.isURL(sanitized, {
        protocols: ['http', 'https'],
        require_protocol: true
    });

    return {
        isValid,
        sanitized: isValid ? sanitized : '',
        error: isValid ? null : 'Invalid URL format'
    };
}

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @param {Object} schema - Validation schema
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, schema = {}) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
        const fieldSchema = schema[key] || {};
        
        if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'string' 
                    ? sanitizeString(item, fieldSchema)
                    : typeof item === 'object'
                    ? sanitizeObject(item, fieldSchema.itemSchema || {})
                    : item
            );
        } else if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value, fieldSchema);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, fieldSchema.schema || {});
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Input validation middleware
 * @param {Object} schema - Validation schema for the endpoint
 * @returns {Function} Middleware function
 */
export function validateInput(schema = {}) {
    return (req, res, next) => {
        try {
            // Sanitize request body
            if (req.body && typeof req.body === 'object') {
                req.body = sanitizeObject(req.body, schema.body || {});
            }

            // Sanitize query parameters
            if (req.query && typeof req.query === 'object') {
                req.query = sanitizeObject(req.query, schema.query || {});
            }

            // Sanitize URL parameters
            if (req.params && typeof req.params === 'object') {
                req.params = sanitizeObject(req.params, schema.params || {});
            }

            // Validate required fields
            if (schema.required) {
                for (const field of schema.required) {
                    const value = req.body?.[field] || req.query?.[field] || req.params?.[field];
                    if (!value || (typeof value === 'string' && value.trim() === '')) {
                        return res.status(400).json({
                            message: `${field} is required`,
                            field
                        });
                    }
                }
            }

            // Custom validation functions
            if (schema.custom) {
                for (const [field, validator] of Object.entries(schema.custom)) {
                    const value = req.body?.[field] || req.query?.[field] || req.params?.[field];
                    const result = validator(value);
                    if (!result.isValid) {
                        return res.status(400).json({
                            message: result.error,
                            field
                        });
                    }
                }
            }

            next();
        } catch (error) {
            console.error('Input validation error:', error);
            res.status(500).json({ message: 'Input validation failed' });
        }
    };
}

/**
 * Common validation schemas
 */
export const validationSchemas = {
    // Document validation
    document: {
        body: {
            title: { maxLength: 200 },
            description: { maxLength: 2000 },
            author: { maxLength: 24 },
            category: { maxLength: 24 }
        },
        required: ['title', 'description', 'author', 'category'],
        custom: {
            author: validateObjectId,
            category: validateObjectId
        }
    },

    // User validation
    user: {
        body: {
            firstname: { maxLength: 50 },
            lastname: { maxLength: 50 },
            email: { maxLength: 254 },
            password: { maxLength: 128 }
        },
        required: ['firstname', 'lastname', 'email'],
        custom: {
            email: validateEmail
        }
    },

    // Authentication validation
    auth: {
        body: {
            email: { maxLength: 254 },
            password: { maxLength: 128 }
        },
        required: ['email', 'password'],
        custom: {
            email: validateEmail
        }
    },

    // ID parameter validation
    idParam: {
        params: {
            id: { maxLength: 24 }
        },
        required: ['id'],
        custom: {
            id: validateObjectId
        }
    }
};

// Export utility functions
export {
    sanitizeString,
    validateEmail,
    validateObjectId,
    validateURL,
    sanitizeObject
};
