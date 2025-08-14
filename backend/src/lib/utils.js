/*
 * @author Richard Bakos
 * @version 1.1.10
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