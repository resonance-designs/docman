// Check if all fields in an object are empty
// This function checks if all fields in an object are either null, undefined, or empty strings
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