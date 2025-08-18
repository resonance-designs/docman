/*
 * @name Validation utility functions
 * @file /docman/frontend/src/lib/validation.js
 * @module validation
 * @description Form validation utilities with comprehensive validation rules and error handling
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
/**
 * Validation utility functions for forms
 */

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return null;
};

/**
 * Validate password strength and requirements
 * @param {string} password - Password to validate
 * @returns {string|null} Error message or null if valid
 */
export const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/(?=.*[a-z])/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/(?=.*[A-Z])/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/(?=.*\d)/.test(password)) return "Password must contain at least one number";
    if (!/(?=.*[@$!%*?&])/.test(password)) return "Password must contain at least one special character (@$!%*?&)";
    return null;
};

/**
 * Validate password confirmation matches original password
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {string|null} Error message or null if valid
 */
export const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) return "Please confirm your password";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
};

/**
 * Validate name field with customizable field name
 * @param {string} name - Name to validate
 * @param {string} [fieldName="Name"] - Field name for error messages
 * @returns {string|null} Error message or null if valid
 */
export const validateName = (name, fieldName = "Name") => {
    if (!name) return `${fieldName} is required`;
    if (name.length < 2) return `${fieldName} must be at least 2 characters long`;
    if (name.length > 50) return `${fieldName} must be less than 50 characters`;
    if (!/^[a-zA-Z\s'-]+$/.test(name)) return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    return null;
};

/**
 * Validate phone number format (optional field)
 * @param {string} phone - Phone number to validate
 * @returns {string|null} Error message or null if valid
 */
export const validatePhone = (phone) => {
    if (!phone) return null; // Phone is optional
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
        return "Please enter a valid phone number";
    }
    return null;
};

/**
 * Validate title field (optional)
 * @param {string} title - Title to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateTitle = (title) => {
    if (!title) return null; // Title is optional
    if (title.length > 100) return "Title must be less than 100 characters";
    return null;
};

/**
 * Validate document title with specific requirements
 * @param {string} title - Document title to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateDocumentTitle = (title) => {
    if (!title) return "Document title is required";
    if (title.length < 3) return "Document title must be at least 3 characters long";
    if (title.length > 200) return "Document title must be less than 200 characters";
    return null;
};

/**
 * Validate document content with length requirements
 * @param {string} content - Document content to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateDocumentContent = (content) => {
    if (!content) return "Document content is required";
    if (content.length < 10) return "Document content must be at least 10 characters long";
    if (content.length > 50000) return "Document content must be less than 50,000 characters";
    return null;
};

/**
 * Validate category name with specific character restrictions
 * @param {string} name - Category name to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateCategoryName = (name) => {
    if (!name) return "Category name is required";
    if (name.length < 2) return "Category name must be at least 2 characters long";
    if (name.length > 50) return "Category name must be less than 50 characters";
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) return "Category name can only contain letters, numbers, spaces, hyphens, and underscores";
    return null;
};

/**
 * Validate category description (optional field)
 * @param {string} description - Category description to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateCategoryDescription = (description) => {
    if (!description) return null; // Description is optional
    if (description.length > 500) return "Category description must be less than 500 characters";
    return null;
};

/**
 * Validate file size against maximum limit
 * @param {File} file - File to validate
 * @param {number} [maxSizeMB=2] - Maximum file size in megabytes
 * @returns {string|null} Error message or null if valid
 */
export const validateFileSize = (file, maxSizeMB = 2) => {
    if (!file) return "Please select a file";
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) return `File size must be less than ${maxSizeMB}MB`;
    return null;
};

/**
 * Validate file type against allowed types
 * @param {File} file - File to validate
 * @param {string[]} [allowedTypes] - Array of allowed MIME types
 * @returns {string|null} Error message or null if valid
 */
export const validateFileType = (file, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']) => {
    if (!file) return "Please select a file";
    if (!allowedTypes.includes(file.type)) {
        const typeNames = allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ');
        return `File must be one of the following types: ${typeNames}`;
    }
    return null;
};

/**
 * Validate image dimensions with customizable constraints
 * @param {File} file - Image file to validate
 * @param {Object} [options={}] - Validation options
 * @param {number} [options.minWidth=0] - Minimum width in pixels
 * @param {number} [options.minHeight=0] - Minimum height in pixels
 * @param {number} [options.maxWidth=Infinity] - Maximum width in pixels
 * @param {number} [options.maxHeight=Infinity] - Maximum height in pixels
 * @param {number} [options.recommendedWidth] - Recommended width in pixels
 * @param {number} [options.recommendedHeight] - Recommended height in pixels
 * @param {number} [options.aspectRatio] - Required aspect ratio (width/height)
 * @returns {Promise<string|null>} Promise resolving to error message or null if valid
 */
export const validateImageDimensions = (file, options = {}) => {
    return new Promise((resolve) => {
        if (!file || !file.type.startsWith('image/')) {
            resolve("File must be an image");
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const { width, height } = img;
            const {
                minWidth = 0,
                minHeight = 0,
                maxWidth = Infinity,
                maxHeight = Infinity,
                recommendedWidth,
                recommendedHeight,
                aspectRatio // e.g., 4/1 for 4:1 ratio
            } = options;

            // Check minimum dimensions
            if (width < minWidth || height < minHeight) {
                resolve(`Image must be at least ${minWidth}x${minHeight}px. Current: ${width}x${height}px`);
                return;
            }

            // Check maximum dimensions
            if (width > maxWidth || height > maxHeight) {
                resolve(`Image must be no larger than ${maxWidth}x${maxHeight}px. Current: ${width}x${height}px`);
                return;
            }

            // Check aspect ratio if specified
            if (aspectRatio) {
                const currentRatio = width / height;
                const tolerance = 0.1; // 10% tolerance
                if (Math.abs(currentRatio - aspectRatio) > tolerance) {
                    const ratioText = aspectRatio === 1 ? "1:1 (square)" : `${Math.round(aspectRatio)}:1`;
                    resolve(`Image should have a ${ratioText} aspect ratio. Current ratio: ${currentRatio.toFixed(2)}:1`);
                    return;
                }
            }

            // Provide recommendation if dimensions are valid but not optimal
            if (recommendedWidth && recommendedHeight) {
                if (width !== recommendedWidth || height !== recommendedHeight) {
                    // This is just a warning, not an error
                    resolve(null); // Still valid
                    return;
                }
            }

            resolve(null); // Valid
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve("Invalid image file");
        };

        img.src = url;
    });
};

/**
 * Validate that a field has a value (generic required field validator)
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
export const validateRequired = (value, fieldName) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} is required`;
    }
    return null;
};

/**
 * Validate user role against allowed roles
 * @param {string} role - Role to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateRole = (role) => {
    const validRoles = ['viewer', 'editor', 'admin'];
    if (!role) return "Role is required";
    if (!validRoles.includes(role)) return "Please select a valid role";
    return null;
};

/**
 * Form validation helper that validates all fields according to rules
 * @param {Object} formData - Form data object
 * @param {Object} validationRules - Validation rules object with field names as keys and arrays of validation functions as values
 * @returns {Object} Object with isValid boolean and errors object
 */
export const validateForm = (formData, validationRules) => {
    const errors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(field => {
        const rules = validationRules[field];
        const value = formData[field];

        for (const rule of rules) {
            const error = rule(value, formData);
            if (error) {
                errors[field] = error;
                isValid = false;
                break; // Stop at first error for this field
            }
        }
    });

    return { isValid, errors };
};

/**
 * Real-time validation helper for individual fields
 * @param {string} fieldName - Name of the field to validate
 * @param {any} value - Value to validate
 * @param {Object} validationRules - Validation rules object
 * @param {Object} [formData={}] - Complete form data for cross-field validation
 * @returns {string|null} Error message or null if valid
 */
export const validateField = (fieldName, value, validationRules, formData = {}) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    for (const rule of rules) {
        const error = rule(value, formData);
        if (error) return error;
    }
    return null;
};
