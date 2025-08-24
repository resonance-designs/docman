/*
 * @name userService
 * @file /docman/backend/src/services/userService.js
 * @service userService
 * @description Business logic service for user operations including CRUD, validation, and access control
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import User from "../models/User.js";
import bcrypt from "bcrypt";
import { sanitizeErrorMessage, logError } from "../lib/utils.js";
import {
    validateName,
    validateEmail,
    validatePassword,
    validatePhone,
    validateTitle,
    validateRole,
    sanitizeString,
    sanitizeEmail
} from "../lib/validation.js";

/**
 * Check if user has permission to access another user's data
 * @param {string} requestingUserId - ID of user making the request
 * @param {string} requestingUserRole - Role of user making the request
 * @param {string} targetUserId - ID of user being accessed
 * @returns {boolean} True if user has access
 */
export function hasUserAccess(requestingUserId, requestingUserRole, targetUserId) {
    // Super admins can access any user
    if (requestingUserRole === 'superadmin') return true;
    
    // Users can access their own data
    if (requestingUserId === targetUserId) return true;
    
    // Regular admins can no longer edit other users' profiles
    return false;
}

/**
 * Build filter object for user queries with input sanitization
 * @param {Object} queryParams - Query parameters from request
 * @returns {Object} Sanitized filter object
 */
export function buildUserFilter(queryParams) {
    const { search, role } = queryParams;
    const filter = {};

    // Search filter - sanitize search input
    if (search && typeof search === 'string') {
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (sanitizedSearch.trim().length > 0 && sanitizedSearch.length <= 100) {
            // Split search terms by spaces to handle multi-word searches
            const searchTerms = sanitizedSearch.trim().split(/\s+/);
            
            if (searchTerms.length === 1) {
                // Single term search
                filter.$or = [
                    { firstname: { $regex: sanitizedSearch, $options: 'i' } },
                    { lastname: { $regex: sanitizedSearch, $options: 'i' } },
                    { email: { $regex: sanitizedSearch, $options: 'i' } },
                    { username: { $regex: sanitizedSearch, $options: 'i' } }
                ];
            } else {
                // Multi-term search - search for full name combinations
                const fullNameRegex = sanitizedSearch;
                filter.$or = [
                    { $expr: { $regexMatch: { input: { $concat: ["$firstname", " ", "$lastname"] }, regex: fullNameRegex, options: "i" } } },
                    { $expr: { $regexMatch: { input: { $concat: ["$lastname", " ", "$firstname"] }, regex: fullNameRegex, options: "i" } } },
                    { email: { $regex: sanitizedSearch, $options: 'i' } },
                    { username: { $regex: sanitizedSearch, $options: 'i' } }
                ];
            }
        }
    }

    // Role filter - validate role
    if (role && typeof role === 'string') {
        const allowedRoles = ['viewer', 'editor', 'admin', 'superadmin'];
        if (allowedRoles.includes(role)) {
            filter.role = role;
        }
    }

    return filter;
}

/**
 * Build sort object for user queries
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc/desc)
 * @returns {Object} Sort object
 */
export function buildUserSort(sortBy = 'firstname', sortOrder = 'asc') {
    const allowedSortFields = ['firstname', 'lastname', 'email', 'role', 'createdAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'firstname';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    return { [sortField]: sortDirection };
}

/**
 * Validate and sanitize user data
 * @param {Object} userData - User data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} Validation result
 */
export function validateUserData(userData, isUpdate = false) {
    const errors = [];
    const sanitized = {};

    // Validate and sanitize firstname
    if (userData.firstname !== undefined) {
        const firstnameValidation = validateName(userData.firstname);
        if (!firstnameValidation.isValid) {
            errors.push(`Firstname: ${firstnameValidation.error}`);
        } else {
            sanitized.firstname = firstnameValidation.sanitized;
        }
    } else if (!isUpdate) {
        errors.push('Firstname is required');
    }

    // Validate and sanitize lastname
    if (userData.lastname !== undefined) {
        const lastnameValidation = validateName(userData.lastname);
        if (!lastnameValidation.isValid) {
            errors.push(`Lastname: ${lastnameValidation.error}`);
        } else {
            sanitized.lastname = lastnameValidation.sanitized;
        }
    } else if (!isUpdate) {
        errors.push('Lastname is required');
    }

    // Validate and sanitize email
    if (userData.email !== undefined) {
        const emailValidation = validateEmail(userData.email);
        if (!emailValidation.isValid) {
            errors.push(`Email: ${emailValidation.error}`);
        } else {
            sanitized.email = emailValidation.sanitized;
        }
    } else if (!isUpdate) {
        errors.push('Email is required');
    }

    // Validate password (only if provided)
    if (userData.password !== undefined) {
        const passwordValidation = validatePassword(userData.password);
        if (!passwordValidation.isValid) {
            errors.push(`Password: ${passwordValidation.error}`);
        } else {
            sanitized.password = userData.password; // Don't sanitize password, just validate
        }
    } else if (!isUpdate) {
        errors.push('Password is required');
    }

    // Validate optional fields
    if (userData.telephone !== undefined) {
        const phoneValidation = validatePhone(userData.telephone);
        if (!phoneValidation.isValid) {
            errors.push(`Phone: ${phoneValidation.error}`);
        } else {
            sanitized.telephone = phoneValidation.sanitized;
        }
    }

    if (userData.title !== undefined) {
        const titleValidation = validateTitle(userData.title);
        if (!titleValidation.isValid) {
            errors.push(`Title: ${titleValidation.error}`);
        } else {
            sanitized.title = titleValidation.sanitized;
        }
    }

    if (userData.role !== undefined) {
        const roleValidation = validateRole(userData.role);
        if (!roleValidation.isValid) {
            errors.push(`Role: ${roleValidation.error}`);
        } else {
            sanitized.role = roleValidation.sanitized;
        }
    }

    // Sanitize other string fields
    ['department', 'bio', 'theme'].forEach(field => {
        if (userData[field] !== undefined) {
            sanitized[field] = sanitizeString(userData[field], { maxLength: 500 });
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        sanitized
    };
}

/**
 * Get users with filtering, sorting, and pagination
 * @param {Object} queryParams - Query parameters
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} Users and pagination metadata
 */
export async function getUsers(queryParams, requestingUser) {
    try {
        const { limit = 50, page = 1 } = queryParams;
        
        // Build filter and sort
        const filter = buildUserFilter(queryParams);
        const sort = buildUserSort(queryParams.sortBy, queryParams.sortOrder);

        // Select fields based on user role
        const selectFields = (requestingUser.role === 'admin' || requestingUser.role === 'superadmin')
            ? "_id firstname lastname email role profilePicture backgroundImage createdAt telephone title department"
            : "_id firstname lastname email role profilePicture backgroundImage createdAt";

        // Parse pagination
        const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 users per page
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * limitNum;

        // Execute query with pagination
        const [users, totalCount] = await Promise.all([
            User.find(filter, selectFields).sort(sort).skip(skip).limit(limitNum),
            User.countDocuments(filter)
        ]);

        return {
            users,
            pagination: {
                total: totalCount,
                page: Math.max(parseInt(page) || 1, 1),
                limit: limitNum,
                pages: Math.ceil(totalCount / limitNum)
            }
        };
    } catch (error) {
        logError('getUsers', error);
        throw new Error(sanitizeErrorMessage(error, "Failed to retrieve users"));
    }
}

/**
 * Get a single user by ID with access control
 * @param {string} userId - User ID
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} User object
 */
export async function getUserById(userId, requestingUser) {
    try {
        // Check access permissions
        if (!hasUserAccess(requestingUser.id, requestingUser.role, userId)) {
            throw new Error("Access denied");
        }

        const selectFields = (requestingUser.role === 'admin' || requestingUser.role === 'superadmin') || requestingUser.id === userId
            ? "_id firstname lastname email telephone title department bio role profilePicture backgroundImage theme createdAt updatedAt"
            : "_id firstname lastname email role profilePicture backgroundImage createdAt";

        const user = await User.findById(userId, selectFields);
        
        if (!user) {
            throw new Error("User not found");
        }

        return user;
    } catch (error) {
        logError('getUserById', error, { userId, requestingUserId: requestingUser.id });
        throw new Error(sanitizeErrorMessage(error, "Failed to retrieve user"));
    }
}

/**
 * Update user data
 * @param {string} userId - User ID to update
 * @param {Object} updateData - Data to update
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUser(userId, updateData, requestingUser) {
    try {
        // Check access permissions
        if (!hasUserAccess(requestingUser.id, requestingUser.role, userId)) {
            throw new Error("Access denied");
        }

        // Validate and sanitize input data
        const validation = validateUserData(updateData, true);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Check if email is being changed and if it's already taken
        if (validation.sanitized.email) {
            const existingUser = await User.findOne({ 
                email: validation.sanitized.email, 
                _id: { $ne: userId } 
            });
            if (existingUser) {
                throw new Error("Email already in use");
            }
        }

        // Hash password if provided
        if (validation.sanitized.password) {
            validation.sanitized.password = await bcrypt.hash(validation.sanitized.password, 12);
        }

        // Only super admins can change roles, and admins can only create users with roles up to their own
        if (validation.sanitized.role) {
            if (requestingUser.role === 'superadmin') {
                // Super admins can set any role
            } else if (requestingUser.role === 'admin') {
                // Admins can only set roles up to admin (not superadmin)
                if (validation.sanitized.role === 'superadmin') {
                    delete validation.sanitized.role;
                }
            } else {
                // Non-admins cannot change roles
                delete validation.sanitized.role;
            }
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { ...validation.sanitized, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).select("_id firstname lastname email telephone title department bio role profilePicture backgroundImage theme createdAt updatedAt");

        if (!updatedUser) {
            throw new Error("User not found");
        }

        return updatedUser;
    } catch (error) {
        logError('updateUser', error, { userId, requestingUserId: requestingUser.id });
        throw new Error(sanitizeErrorMessage(error, "Failed to update user"));
    }
}

/**
 * Delete a user
 * @param {string} userId - User ID to delete
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<void>}
 */
export async function deleteUser(userId, requestingUser) {
    try {
        // Only super admins can delete users, and they can't delete themselves
        if (requestingUser.role !== 'superadmin') {
            throw new Error("Insufficient permissions");
        }

        if (requestingUser.id === userId) {
            throw new Error("Cannot delete your own account");
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        await User.findByIdAndDelete(userId);
    } catch (error) {
        logError('deleteUser', error, { userId, requestingUserId: requestingUser.id });
        throw new Error(sanitizeErrorMessage(error, "Failed to delete user"));
    }
}
