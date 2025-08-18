/*
 * @name rateLimiter
 * @file /docman/backend/src/middleware/rateLimiter.js
 * @middleware rateLimiter
 * @description Rate limiting middleware using Redis for preventing API abuse and ensuring fair usage
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import ratelimit from "../config/upstash.js";

/**
 * Get client identifier for rate limiting
 * Uses IP address and user ID if available
 * @param {Object} req - Express request object
 * @returns {string} Client identifier
 */
function getClientId(req) {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userId = req.user?.id;
    return userId ? `user:${userId}` : `ip:${ip}`;
}

/**
 * Determine rate limit configuration based on endpoint
 * @param {string} path - Request path
 * @param {string} method - HTTP method
 * @returns {Object} Rate limit configuration
 */
function getRateLimitConfig(path, method) {
    // Authentication endpoints - strict limits
    if (path.includes('/auth/login') || path.includes('/auth/register')) {
        return {
            identifier: 'auth',
            limit: 5, // 5 attempts per window
            window: '15m', // 15 minutes
            message: 'Too many authentication attempts. Please try again in 15 minutes.'
        };
    }

    // Password reset - very strict
    if (path.includes('/auth/forgot-password') || path.includes('/auth/reset-password')) {
        return {
            identifier: 'password-reset',
            limit: 3, // 3 attempts per window
            window: '1h', // 1 hour
            message: 'Too many password reset attempts. Please try again in 1 hour.'
        };
    }

    // File upload endpoints - moderate limits
    if (path.includes('/upload') || (method === 'POST' && path.includes('/docs'))) {
        return {
            identifier: 'upload',
            limit: 20, // 20 uploads per window
            window: '1h', // 1 hour
            message: 'Upload limit exceeded. Please try again later.'
        };
    }

    // API read operations - generous limits
    if (method === 'GET') {
        return {
            identifier: 'read',
            limit: 1000, // 1000 requests per window
            window: '1h', // 1 hour
            message: 'API rate limit exceeded. Please try again later.'
        };
    }

    // API write operations - moderate limits
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return {
            identifier: 'write',
            limit: 100, // 100 requests per window
            window: '1h', // 1 hour
            message: 'API rate limit exceeded. Please try again later.'
        };
    }

    // Default rate limit
    return {
        identifier: 'default',
        limit: 100,
        window: '1h',
        message: 'Rate limit exceeded. Please try again later.'
    };
}

/**
 * Enhanced rate limiting middleware with endpoint-specific limits
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with 429 status if rate limit exceeded
 */
const rateLimiter = async (req, res, next) => {
    try {
        const clientId = getClientId(req);
        const config = getRateLimitConfig(req.path, req.method);
        const rateLimitKey = `${config.identifier}:${clientId}`;

        // Check rate limit
        const { success, limit, remaining, reset } = await ratelimit.limit(rateLimitKey);

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', limit || config.limit);
        res.setHeader('X-RateLimit-Remaining', remaining || 0);
        res.setHeader('X-RateLimit-Reset', reset || Date.now() + 3600000);

        if (!success) {
            return res.status(429).json({
                message: config.message,
                retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 3600
            });
        }

        next();
    } catch (error) {
        console.error("Rate limiting error:", error);
        // Don't block requests if rate limiting fails
        next();
    }
};

/**
 * Strict rate limiter for sensitive endpoints
 * @param {number} limit - Request limit
 * @param {string} window - Time window
 * @param {string} message - Error message
 * @returns {Function} Rate limiting middleware
 */
export const createStrictRateLimiter = (limit = 5, window = '15m', message = 'Rate limit exceeded') => {
    return async (req, res, next) => {
        try {
            const clientId = getClientId(req);
            const rateLimitKey = `strict:${req.path}:${clientId}`;

            const { success, remaining, reset } = await ratelimit.limit(rateLimitKey);

            res.setHeader('X-RateLimit-Limit', limit);
            res.setHeader('X-RateLimit-Remaining', remaining || 0);
            res.setHeader('X-RateLimit-Reset', reset || Date.now() + 900000);

            if (!success) {
                return res.status(429).json({
                    message,
                    retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 900
                });
            }

            next();
        } catch (error) {
            console.error("Strict rate limiting error:", error);
            next();
        }
    };
};

export default rateLimiter;