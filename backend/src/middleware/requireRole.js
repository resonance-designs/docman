/*
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
// middleware/requireRole.js

/**
 * Role hierarchy for permission checking
 */
const roleHierarchy = {
    viewer: 1,
    editor: 2,
    admin: 3,
    superadmin: 4
};

/**
 * Check if user has required permission level
 * @param {string} userRole - User's current role
 * @param {string} requiredRole - Required role
 * @returns {boolean} True if user has sufficient permissions
 */
function hasPermission(userRole, requiredRole) {
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
}

/**
 * Role-based access control middleware factory
 * Creates middleware that restricts access to users with specific roles
 * Supports hierarchical role checking (higher roles inherit lower role permissions)
 * @param {...string} allowedRoles - Variable number of role strings that are allowed access
 * @returns {Function} Express middleware function that checks user roles
 * @example
 * // Allow only admins and superadmins
 * router.get('/admin-only', requireRole('admin'), handler);
 *
 * // Allow editors, admins, and superadmins
 * router.post('/create', requireRole('editor'), handler);
 *
 * // Allow specific roles only (exact match)
 * router.post('/superadmin-only', requireRole('superadmin'), handler);
 */
export function requireRole(...allowedRoles) {
    /**
     * Express middleware function that validates user role
     * @param {Object} req - Express request object (must have req.user from auth middleware)
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {Object} JSON response with error message if access denied
     */
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Check if user has any of the allowed roles
        const hasAccess = allowedRoles.some(role => {
            // Always use hierarchical checking - higher roles inherit lower role permissions
            return hasPermission(req.user.role, role);
        });

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        next();
    };
}
