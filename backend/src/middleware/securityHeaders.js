/*
 * @name securityHeaders
 * @file /docman/backend/src/middleware/securityHeaders.js
 * @middleware securityHeaders
 * @description Comprehensive security headers middleware for protecting against common web vulnerabilities
 * @author Richard Bakos
 * @version 2.1.3
 * @license UNLICENSED
 */

/**
 * Security headers middleware to protect against common web vulnerabilities
 * Implements OWASP security header recommendations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function securityHeaders(req, res, next) {
    // Content Security Policy (CSP) - Prevents XSS attacks
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.github.com",
        "media-src 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', cspDirectives);

    // HTTP Strict Transport Security (HSTS) - Forces HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // X-Content-Type-Options - Prevents MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options - Prevents clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // X-XSS-Protection - Enables XSS filtering (legacy browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy - Controls referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy - Controls browser features
    const permissionsPolicy = [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'accelerometer=()',
        'gyroscope=()'
    ].join(', ');
    res.setHeader('Permissions-Policy', permissionsPolicy);

    // X-Permitted-Cross-Domain-Policies - Restricts Adobe Flash/PDF cross-domain requests
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // X-DNS-Prefetch-Control - Controls DNS prefetching
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // X-Download-Options - Prevents IE from executing downloads in site context
    res.setHeader('X-Download-Options', 'noopen');

    // Cross-Origin-Embedder-Policy - Enables cross-origin isolation
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Cross-Origin-Opener-Policy - Prevents cross-origin attacks
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // Cross-Origin-Resource-Policy - Controls cross-origin resource sharing
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    next();
}

/**
 * CORS configuration middleware with security-focused settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function corsHeaders(req, res, next) {
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        process.env.FRONTEND_URL,
        process.env.PRODUCTION_URL
    ].filter(Boolean);

    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Allowed methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');

    // Allowed headers
    res.setHeader('Access-Control-Allow-Headers', [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma'
    ].join(', '));

    // Allow credentials
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Preflight cache duration
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    next();
}

/**
 * Security middleware for API responses
 * Removes sensitive server information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function apiSecurity(req, res, next) {
    // Remove server signature
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Add API-specific security headers
    res.setHeader('X-API-Version', process.env.API_VERSION || '1.0');
    res.setHeader('X-RateLimit-Policy', 'standard');

    // Prevent caching of sensitive API responses
    if (req.path.includes('/auth') || req.path.includes('/users')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }

    next();
}

/**
 * Development-only security headers (less restrictive for development)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function developmentSecurityHeaders(req, res, next) {
    // Relaxed CSP for development
    const devCspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' *",
        "style-src 'self' 'unsafe-inline' *",
        "font-src 'self' *",
        "img-src 'self' data: *",
        "connect-src 'self' *",
        "media-src 'self' *",
        "object-src 'none'",
        "base-uri 'self'"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', devCspDirectives);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Less restrictive for dev tools
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');

    next();
}

/**
 * Combined security middleware factory
 * Returns appropriate middleware based on environment
 * @returns {Function} Security middleware function
 */
export function createSecurityMiddleware() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return (req, res, next) => {
        // Apply CORS first
        corsHeaders(req, res, () => {
            // Apply API security
            apiSecurity(req, res, () => {
                // Apply environment-specific security headers
                if (isProduction) {
                    securityHeaders(req, res, next);
                } else {
                    developmentSecurityHeaders(req, res, next);
                }
            });
        });
    };
}
