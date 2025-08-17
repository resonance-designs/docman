/*
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
// middleware/requireRole.js

/**
 * Role-based access control middleware factory
 * Creates middleware that restricts access to users with specific roles
 * @param {...string} allowedRoles - Variable number of role strings that are allowed access
 * @returns {Function} Express middleware function that checks user roles
 * @example
 * // Allow only admins
 * router.get('/admin-only', requireRole('admin'), handler);
 *
 * // Allow editors and admins
 * router.post('/create', requireRole('editor', 'admin'), handler);
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
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
}
