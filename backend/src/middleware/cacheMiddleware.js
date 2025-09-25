/*
 * @name cacheMiddleware
 * @file /docman/backend/src/middleware/cacheMiddleware.js
 * @middleware cacheMiddleware
 * @description Caching middleware for API responses to improve performance
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */

// Simple in-memory cache
const cache = new Map();

/**
 * Cache middleware for API responses
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Function} Express middleware function
 */
export function cacheResponse(ttl = 300) {
    return (req, res, next) => {
        // Respect explicit cache-bypass signals
        const noCacheHeader = (req.headers['cache-control'] || '').includes('no-cache') ||
                              (req.headers['cache-control'] || '').includes('no-store') ||
                              (req.headers['pragma'] || '').includes('no-cache');
        const hasCacheBuster = typeof req.query?._ts !== 'undefined';
        const isOverdueQuery = req.query?.overdue === 'true'; // frequently changing, user-specific
        
        // If any bypass condition is true, skip caching entirely
        if (noCacheHeader || hasCacheBuster || isOverdueQuery) {
            return next();
        }

        // Create cache key from request URL, query parameters, and user identity (to avoid cross-user leakage)
        const userKey = req.user ? `${req.user.id || req.user._id || 'anon'}:${req.user.role || 'role'}` : 'anon';
        const cacheKey = `${req.method}:${req.originalUrl || req.url}:${JSON.stringify(req.query)}:user=${userKey}`;
        
        // Check if response is cached
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < ttl * 1000) {
            console.log(`📦 Cache hit for: ${cacheKey}`);
            return res.json(cached.data);
        }
        
        // Store original res.json function
        const originalJson = res.json;
        
        // Override res.json to cache the response
        res.json = function(data) {
            // Cache the response
            cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            console.log(`💾 Cached response for: ${cacheKey}`);
            
            // Clean up expired cache entries periodically
            if (cache.size > 100) {
                cleanExpiredCache(ttl * 1000);
            }
            
            // Call original res.json
            return originalJson.call(this, data);
        };
        
        next();
    };
}

/**
 * Cache middleware specifically for analytics data (longer TTL)
 * @returns {Function} Express middleware function
 */
export function cacheAnalytics() {
    return cacheResponse(600); // 10 minutes cache for analytics
}

/**
 * Cache middleware for user-specific data (shorter TTL)
 * @returns {Function} Express middleware function
 */
export function cacheUserData() {
    return cacheResponse(120); // 2 minutes cache for user data
}

/**
 * Clear cache for specific patterns or all cache
 * @param {string|RegExp} pattern - Pattern to match cache keys, or null for all
 */
export function clearCache(pattern = null) {
    if (!pattern) {
        cache.clear();
        console.log('🗑️ Cleared all cache');
        return;
    }
    
    const keysToDelete = [];
    for (const key of cache.keys()) {
        if (typeof pattern === 'string' && key.includes(pattern)) {
            keysToDelete.push(key);
        } else if (pattern instanceof RegExp && pattern.test(key)) {
            keysToDelete.push(key);
        }
    }
    
    keysToDelete.forEach(key => cache.delete(key));
    console.log(`🗑️ Cleared ${keysToDelete.length} cache entries matching pattern`);
}

/**
 * Clean expired cache entries
 * @param {number} maxAge - Maximum age in milliseconds
 */
function cleanExpiredCache(maxAge) {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > maxAge) {
            keysToDelete.push(key);
        }
    }
    
    keysToDelete.forEach(key => cache.delete(key));
    
    if (keysToDelete.length > 0) {
        console.log(`🧹 Cleaned ${keysToDelete.length} expired cache entries`);
    }
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp < 600000) { // 10 minutes
            activeEntries++;
        } else {
            expiredEntries++;
        }
    }
    
    return {
        totalEntries: cache.size,
        activeEntries,
        expiredEntries,
        memoryUsage: process.memoryUsage()
    };
}

/**
 * Middleware to add cache control headers
 * @param {number} maxAge - Max age in seconds
 * @returns {Function} Express middleware function
 */
export function setCacheHeaders(maxAge = 300) {
    return (req, res, next) => {
        res.set({
            'Cache-Control': `public, max-age=${maxAge}`,
            'ETag': `"${Date.now()}"`,
            'Last-Modified': new Date().toUTCString()
        });
        next();
    };
}

// Periodic cleanup every 10 minutes
setInterval(() => {
    cleanExpiredCache(600000); // Clean entries older than 10 minutes
}, 600000);

export default {
    cacheResponse,
    cacheAnalytics,
    cacheUserData,
    clearCache,
    getCacheStats,
    setCacheHeaders
};
