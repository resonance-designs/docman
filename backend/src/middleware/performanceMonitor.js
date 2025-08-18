/*
 * @name performanceMonitor
 * @file /docman/backend/src/middleware/performanceMonitor.js
 * @middleware performanceMonitor
 * @description Performance monitoring middleware for tracking API response times and database query performance
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */

// Performance metrics storage
const performanceMetrics = {
    requests: [],
    slowQueries: [],
    averageResponseTime: 0,
    totalRequests: 0
};

/**
 * Performance monitoring middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function performanceMonitor(req, res, next) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(...args) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const endMemory = process.memoryUsage();
        
        // Calculate memory usage
        const memoryDelta = {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal
        };
        
        // Store performance data
        const performanceData = {
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            responseTime,
            memoryDelta,
            timestamp: new Date().toISOString(),
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
        };
        
        // Add to metrics
        addPerformanceMetric(performanceData);
        
        // Log slow requests (> 1 second)
        if (responseTime > 1000) {
            console.warn(`🐌 Slow request detected: ${req.method} ${req.originalUrl} - ${responseTime}ms`);
        }
        
        // Log very slow requests (> 5 seconds)
        if (responseTime > 5000) {
            console.error(`🚨 Very slow request: ${req.method} ${req.originalUrl} - ${responseTime}ms`);
        }
        
        // Add response time header
        res.set('X-Response-Time', `${responseTime}ms`);
        
        // Call original end function
        originalEnd.apply(this, args);
    };
    
    next();
}

/**
 * Add performance metric to storage
 * @param {Object} data - Performance data
 */
function addPerformanceMetric(data) {
    performanceMetrics.requests.push(data);
    performanceMetrics.totalRequests++;
    
    // Keep only last 1000 requests
    if (performanceMetrics.requests.length > 1000) {
        performanceMetrics.requests.shift();
    }
    
    // Update average response time
    const totalTime = performanceMetrics.requests.reduce((sum, req) => sum + req.responseTime, 0);
    performanceMetrics.averageResponseTime = totalTime / performanceMetrics.requests.length;
    
    // Track slow queries
    if (data.responseTime > 2000) {
        performanceMetrics.slowQueries.push(data);
        
        // Keep only last 100 slow queries
        if (performanceMetrics.slowQueries.length > 100) {
            performanceMetrics.slowQueries.shift();
        }
    }
}

/**
 * Get performance statistics
 * @returns {Object} Performance statistics
 */
export function getPerformanceStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // Filter requests by time period
    const recentRequests = performanceMetrics.requests.filter(req => 
        new Date(req.timestamp).getTime() > oneHourAgo
    );
    
    const dailyRequests = performanceMetrics.requests.filter(req => 
        new Date(req.timestamp).getTime() > oneDayAgo
    );
    
    // Calculate statistics
    const stats = {
        total: {
            requests: performanceMetrics.totalRequests,
            averageResponseTime: Math.round(performanceMetrics.averageResponseTime),
            slowQueries: performanceMetrics.slowQueries.length
        },
        hourly: {
            requests: recentRequests.length,
            averageResponseTime: recentRequests.length > 0 
                ? Math.round(recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length)
                : 0,
            slowQueries: recentRequests.filter(req => req.responseTime > 2000).length
        },
        daily: {
            requests: dailyRequests.length,
            averageResponseTime: dailyRequests.length > 0 
                ? Math.round(dailyRequests.reduce((sum, req) => sum + req.responseTime, 0) / dailyRequests.length)
                : 0,
            slowQueries: dailyRequests.filter(req => req.responseTime > 2000).length
        },
        endpoints: getEndpointStats(recentRequests),
        slowestQueries: performanceMetrics.slowQueries
            .sort((a, b) => b.responseTime - a.responseTime)
            .slice(0, 10),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
    };
    
    return stats;
}

/**
 * Get endpoint-specific statistics
 * @param {Array} requests - Array of request data
 * @returns {Object} Endpoint statistics
 */
function getEndpointStats(requests) {
    const endpointStats = {};
    
    requests.forEach(req => {
        const endpoint = `${req.method} ${req.url.split('?')[0]}`;
        
        if (!endpointStats[endpoint]) {
            endpointStats[endpoint] = {
                count: 0,
                totalTime: 0,
                averageTime: 0,
                maxTime: 0,
                minTime: Infinity
            };
        }
        
        const stats = endpointStats[endpoint];
        stats.count++;
        stats.totalTime += req.responseTime;
        stats.averageTime = Math.round(stats.totalTime / stats.count);
        stats.maxTime = Math.max(stats.maxTime, req.responseTime);
        stats.minTime = Math.min(stats.minTime, req.responseTime);
    });
    
    // Convert to array and sort by average response time
    return Object.entries(endpointStats)
        .map(([endpoint, stats]) => ({ endpoint, ...stats }))
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 20); // Top 20 endpoints
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics() {
    performanceMetrics.requests = [];
    performanceMetrics.slowQueries = [];
    performanceMetrics.averageResponseTime = 0;
    performanceMetrics.totalRequests = 0;
    console.log('🧹 Performance metrics cleared');
}

/**
 * Database query performance monitor
 * @param {string} operation - Operation name
 * @param {Function} queryFn - Query function
 * @returns {Promise} Query result with performance logging
 */
export async function monitorQuery(operation, queryFn) {
    const startTime = Date.now();
    
    try {
        const result = await queryFn();
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Log slow database queries
        if (duration > 500) {
            console.warn(`🐌 Slow database query: ${operation} - ${duration}ms`);
        }
        
        if (duration > 2000) {
            console.error(`🚨 Very slow database query: ${operation} - ${duration}ms`);
        }
        
        return result;
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.error(`❌ Database query failed: ${operation} - ${duration}ms - ${error.message}`);
        throw error;
    }
}

export default {
    performanceMonitor,
    getPerformanceStats,
    clearPerformanceMetrics,
    monitorQuery
};
