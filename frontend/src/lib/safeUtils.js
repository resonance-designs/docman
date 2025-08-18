/*
 * @name safeUtils
 * @file /docman/backend/src/lib/safeUtils.js
 * @module safeUtils
 * @description Safe utility functions to prevent common React errors. These functions ensure data is always in the expected format
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */

/**
 * Ensures a value is always an array
 * @param {any} value - Value to convert to array
 * @param {Array} fallback - Fallback array if value is not valid
 * @returns {Array} Safe array
 */
export const ensureArray = (value, fallback = []) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return fallback;
    return fallback;
};

/**
 * Ensures a value is always an object
 * @param {any} value - Value to convert to object
 * @param {Object} fallback - Fallback object if value is not valid
 * @returns {Object} Safe object
 */
export const ensureObject = (value, fallback = {}) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    return fallback;
};

/**
 * Ensures a value is always a string
 * @param {any} value - Value to convert to string
 * @param {string} fallback - Fallback string if value is not valid
 * @returns {string} Safe string
 */
export const ensureString = (value, fallback = '') => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return fallback;
    return String(value);
};

/**
 * Ensures a value is always a number
 * @param {any} value - Value to convert to number
 * @param {number} fallback - Fallback number if value is not valid
 * @returns {number} Safe number
 */
export const ensureNumber = (value, fallback = 0) => {
    const num = Number(value);
    if (isNaN(num)) return fallback;
    return num;
};

/**
 * Safely get a nested property from an object
 * @param {Object} obj - Object to get property from
 * @param {string} path - Dot notation path (e.g., 'user.profile.name')
 * @param {any} fallback - Fallback value if property doesn't exist
 * @returns {any} Property value or fallback
 */
export const safeGet = (obj, path, fallback = null) => {
    if (!obj || typeof obj !== 'object') return fallback;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current === null || current === undefined || !(key in current)) {
            return fallback;
        }
        current = current[key];
    }
    
    return current;
};

/**
 * Safely execute array methods with fallback
 * @param {any} array - Array to operate on
 * @param {string} method - Array method name ('map', 'filter', 'find', etc.)
 * @param {Function} callback - Callback function for the method
 * @param {any} fallback - Fallback value if array is invalid
 * @returns {any} Result of array method or fallback
 */
export const safeArrayMethod = (array, method, callback, fallback = []) => {
    const safeArray = ensureArray(array);
    if (typeof safeArray[method] !== 'function') return fallback;
    
    try {
        return safeArray[method](callback);
    } catch (error) {
        console.error(`Error in safeArrayMethod(${method}):`, error);
        return fallback;
    }
};

/**
 * Safely parse JSON with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} Parsed object or fallback
 */
export const safeJsonParse = (jsonString, fallback = null) => {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return fallback;
    }
};

/**
 * Safely access form data with validation
 * @param {Object} formData - Form data object
 * @param {string} field - Field name
 * @param {any} fallback - Fallback value
 * @returns {any} Field value or fallback
 */
export const safeFormValue = (formData, field, fallback = '') => {
    return safeGet(ensureObject(formData), field, fallback);
};

/**
 * Create a safe state setter that validates data before setting
 * @param {Function} setState - React setState function
 * @param {Function} validator - Validation function
 * @param {any} fallback - Fallback value if validation fails
 * @returns {Function} Safe setState function
 */
export const createSafeSetter = (setState, validator, fallback) => {
    return (value) => {
        try {
            const validatedValue = validator ? validator(value) : value;
            setState(validatedValue !== undefined ? validatedValue : fallback);
        } catch (error) {
            console.error('Error in safe setter:', error);
            setState(fallback);
        }
    };
};

/**
 * Safely handle API responses
 * @param {Object} response - API response object
 * @param {string} dataPath - Path to data in response (e.g., 'data.items')
 * @param {any} fallback - Fallback value if data is invalid
 * @returns {any} Response data or fallback
 */
export const safeApiResponse = (response, dataPath = 'data', fallback = null) => {
    if (!response) return fallback;
    return safeGet(response, dataPath, fallback);
};

/**
 * Create safe array operations object
 * @param {any} array - Array to make safe
 * @returns {Object} Object with safe array methods
 */
export const createSafeArray = (array) => {
    const safeArray = ensureArray(array);
    
    return {
        data: safeArray,
        map: (callback) => safeArrayMethod(safeArray, 'map', callback, []),
        filter: (callback) => safeArrayMethod(safeArray, 'filter', callback, []),
        find: (callback) => safeArrayMethod(safeArray, 'find', callback, null),
        slice: (start, end) => safeArrayMethod(safeArray, 'slice', () => safeArray.slice(start, end), []),
        length: safeArray.length,
        isEmpty: () => safeArray.length === 0,
        isNotEmpty: () => safeArray.length > 0
    };
};

export default {
    ensureArray,
    ensureObject,
    ensureString,
    ensureNumber,
    safeGet,
    safeArrayMethod,
    safeJsonParse,
    safeFormValue,
    createSafeSetter,
    safeApiResponse,
    createSafeArray
};
