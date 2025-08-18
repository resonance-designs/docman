/*
 * @name sharedValidation
 * @file /docman/backend/src/lib/sharedValidation.js
 * @module sharedValidation
 * @description Shared validation utilities for consistent validation across all services
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Common validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the validation passed
 * @property {string} sanitized - Sanitized value
 * @property {string|null} error - Error message if validation failed
 */

/**
 * Sanitize and validate a string with common options
 * @param {string} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
export function validateString(value, options = {}) {
    const {
        required = false,
        minLength = 0,
        maxLength = 1000,
        allowHTML = false,
        pattern = null,
        fieldName = 'Field'
    } = options;

    // Check if required
    if (required && (!value || typeof value !== 'string' || value.trim() === '')) {
        return {
            isValid: false,
            sanitized: '',
            error: `${fieldName} is required`
        };
    }

    // If not required and empty, return valid
    if (!value || typeof value !== 'string') {
        return {
            isValid: true,
            sanitized: '',
            error: null
        };
    }

    let sanitized = value.trim();

    // Check length constraints
    if (sanitized.length < minLength) {
        return {
            isValid: false,
            sanitized: '',
            error: `${fieldName} must be at least ${minLength} characters long`
        };
    }

    if (sanitized.length > maxLength) {
        return {
            isValid: false,
            sanitized: '',
            error: `${fieldName} must be no more than ${maxLength} characters long`
        };
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

    // Escape for database safety
    sanitized = validator.escape(sanitized);

    // Check pattern if provided
    if (pattern && !pattern.test(sanitized)) {
        return {
            isValid: false,
            sanitized: '',
            error: `${fieldName} format is invalid`
        };
    }

    return {
        isValid: true,
        sanitized,
        error: null
    };
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @param {boolean} required - Whether email is required
 * @returns {ValidationResult} Validation result
 */
export function validateEmail(email, required = true) {
    const stringValidation = validateString(email, {
        required,
        maxLength: 254,
        fieldName: 'Email'
    });

    if (!stringValidation.isValid) {
        return stringValidation;
    }

    if (!stringValidation.sanitized) {
        return stringValidation; // Empty and not required
    }

    const isValidEmail = validator.isEmail(stringValidation.sanitized);
    
    return {
        isValid: isValidEmail,
        sanitized: isValidEmail ? stringValidation.sanitized.toLowerCase() : '',
        error: isValidEmail ? null : 'Invalid email format'
    };
}

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @param {boolean} required - Whether ID is required
 * @param {string} fieldName - Name of the field for error messages
 * @returns {ValidationResult} Validation result
 */
export function validateObjectId(id, required = true, fieldName = 'ID') {
    const stringValidation = validateString(id, {
        required,
        minLength: 24,
        maxLength: 24,
        fieldName
    });

    if (!stringValidation.isValid) {
        return stringValidation;
    }

    if (!stringValidation.sanitized) {
        return stringValidation; // Empty and not required
    }

    const isValidObjectId = validator.isMongoId(stringValidation.sanitized);
    
    return {
        isValid: isValidObjectId,
        sanitized: isValidObjectId ? stringValidation.sanitized : '',
        error: isValidObjectId ? null : `Invalid ${fieldName} format`
    };
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @param {boolean} required - Whether URL is required
 * @returns {ValidationResult} Validation result
 */
export function validateURL(url, required = false) {
    const stringValidation = validateString(url, {
        required,
        maxLength: 2048,
        fieldName: 'URL'
    });

    if (!stringValidation.isValid) {
        return stringValidation;
    }

    if (!stringValidation.sanitized) {
        return stringValidation; // Empty and not required
    }

    const isValidURL = validator.isURL(stringValidation.sanitized, {
        protocols: ['http', 'https'],
        require_protocol: true
    });
    
    return {
        isValid: isValidURL,
        sanitized: isValidURL ? stringValidation.sanitized : '',
        error: isValidURL ? null : 'Invalid URL format'
    };
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @param {boolean} required - Whether password is required
 * @returns {ValidationResult} Validation result
 */
export function validatePassword(password, required = true) {
    if (required && (!password || typeof password !== 'string' || password.length === 0)) {
        return {
            isValid: false,
            sanitized: '',
            error: 'Password is required'
        };
    }

    if (!password || typeof password !== 'string') {
        return {
            isValid: true,
            sanitized: '',
            error: null
        };
    }

    // Password strength requirements
    if (password.length < 8) {
        return {
            isValid: false,
            sanitized: '',
            error: 'Password must be at least 8 characters long'
        };
    }

    if (password.length > 128) {
        return {
            isValid: false,
            sanitized: '',
            error: 'Password must be no more than 128 characters long'
        };
    }

    // Check for at least one uppercase, one lowercase, one number
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
        return {
            isValid: false,
            sanitized: '',
            error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        };
    }

    return {
        isValid: true,
        sanitized: password, // Don't sanitize passwords
        error: null
    };
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @param {boolean} required - Whether phone is required
 * @returns {ValidationResult} Validation result
 */
export function validatePhone(phone, required = false) {
    const stringValidation = validateString(phone, {
        required,
        maxLength: 20,
        fieldName: 'Phone number'
    });

    if (!stringValidation.isValid) {
        return stringValidation;
    }

    if (!stringValidation.sanitized) {
        return stringValidation; // Empty and not required
    }

    // Remove all non-digit characters for validation
    const digitsOnly = stringValidation.sanitized.replace(/\D/g, '');
    
    // Check if it's a valid phone number (basic check)
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return {
            isValid: false,
            sanitized: '',
            error: 'Phone number must be between 10 and 15 digits'
        };
    }

    return {
        isValid: true,
        sanitized: stringValidation.sanitized,
        error: null
    };
}

/**
 * Validate array of ObjectIds
 * @param {Array} ids - Array of IDs to validate
 * @param {boolean} required - Whether array is required
 * @param {string} fieldName - Name of the field for error messages
 * @returns {ValidationResult} Validation result
 */
export function validateObjectIdArray(ids, required = false, fieldName = 'IDs') {
    if (required && (!ids || !Array.isArray(ids) || ids.length === 0)) {
        return {
            isValid: false,
            sanitized: [],
            error: `${fieldName} are required`
        };
    }

    if (!ids || !Array.isArray(ids)) {
        return {
            isValid: true,
            sanitized: [],
            error: null
        };
    }

    const sanitizedIds = [];
    
    for (const id of ids) {
        const validation = validateObjectId(id, true, fieldName.slice(0, -1)); // Remove 's' from fieldName
        if (!validation.isValid) {
            return {
                isValid: false,
                sanitized: [],
                error: validation.error
            };
        }
        sanitizedIds.push(validation.sanitized);
    }

    return {
        isValid: true,
        sanitized: sanitizedIds,
        error: null
    };
}

/**
 * Validate date
 * @param {string|Date} date - Date to validate
 * @param {boolean} required - Whether date is required
 * @param {string} fieldName - Name of the field for error messages
 * @returns {ValidationResult} Validation result
 */
export function validateDate(date, required = false, fieldName = 'Date') {
    if (required && (!date || (typeof date === 'string' && date.trim() === ''))) {
        return {
            isValid: false,
            sanitized: null,
            error: `${fieldName} is required`
        };
    }

    if (!date || (typeof date === 'string' && date.trim() === '')) {
        return {
            isValid: true,
            sanitized: null,
            error: null
        };
    }

    const parsedDate = new Date(date);
    
    if (isNaN(parsedDate.getTime())) {
        return {
            isValid: false,
            sanitized: null,
            error: `Invalid ${fieldName} format`
        };
    }

    return {
        isValid: true,
        sanitized: parsedDate,
        error: null
    };
}

/**
 * Validate enum value
 * @param {string} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {boolean} required - Whether value is required
 * @param {string} fieldName - Name of the field for error messages
 * @returns {ValidationResult} Validation result
 */
export function validateEnum(value, allowedValues, required = false, fieldName = 'Value') {
    if (required && (!value || typeof value !== 'string' || value.trim() === '')) {
        return {
            isValid: false,
            sanitized: '',
            error: `${fieldName} is required`
        };
    }

    if (!value || typeof value !== 'string' || value.trim() === '') {
        return {
            isValid: true,
            sanitized: '',
            error: null
        };
    }

    const trimmedValue = value.trim();
    
    if (!allowedValues.includes(trimmedValue)) {
        return {
            isValid: false,
            sanitized: '',
            error: `${fieldName} must be one of: ${allowedValues.join(', ')}`
        };
    }

    return {
        isValid: true,
        sanitized: trimmedValue,
        error: null
    };
}
