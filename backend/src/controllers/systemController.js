/*
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import os from 'os';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Doc from '../models/Doc.js';
import Category from '../models/Category.js';
import { getPerformanceStats } from '../middleware/performanceMonitor.js';
import { getCacheStats } from '../middleware/cacheMiddleware.js';

/**
 * Get system information and health metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with system information or error message
 */
export async function getSystemInfo(req, res) {
    try {
        // Basic system information
        const nodeVersion = process.version;
        const platform = os.platform();
        const architecture = os.arch();
        const hostname = os.hostname();
        const uptime = formatUptime(process.uptime());
        const memoryUsage = formatMemoryUsage(process.memoryUsage());

        // Environment information
        const environment = process.env.ENV || process.env.NODE_ENV || 'development';
        const port = process.env.NODE_PORT || 5001;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Database information
        const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
        const dbName = mongoose.connection.name || process.env.MONGO_DB || 'docman';
        const dbHost = mongoose.connection.host || process.env.MONGO_HOST || 'localhost';
        const dbPort = process.env.MONGO_PORT || '27017';

        // Get collection counts
        const [userCount, docCount, categoryCount] = await Promise.all([
            User.countDocuments(),
            Doc.countDocuments(),
            Category.countDocuments()
        ]);

        const totalDocuments = userCount + docCount + categoryCount;
        const collections = mongoose.connection.db ?
            (await mongoose.connection.db.listCollections().toArray()).length : 0;

        // System health metrics
        const cpuUsage = getCpuUsage();
        const memoryStats = getMemoryStats();
        const loadAverage = os.loadavg();

        const systemInfo = {
            // Server Information
            environment,
            nodeVersion,
            port,
            os: `${os.type()} ${os.release()}`,
            platform,
            architecture,
            hostname,
            uptime,
            memoryUsage,

            // Database Information
            database: {
                type: 'MongoDB',
                status: dbStatus,
                name: dbName,
                host: `${dbHost}:${dbPort}`,
                collections,
                totalDocuments,
                userCount,
                docCount,
                categoryCount
            },

            // Application Information
            app: {
                name: 'DocMan',
                version: '1.0.0',
                buildDate: new Date().toISOString().split('T')[0],
                frontendUrl,
                apiBaseUrl: `http://localhost:${port}/api`,
                uploadPath: process.cwd() + '/uploads'
            },

            // System Health
            health: {
                cpuUsage: `${cpuUsage.toFixed(2)}%`,
                cpuStatus: cpuUsage > 80 ? 'warning' : cpuUsage > 95 ? 'error' : 'healthy',
                memoryPercentage: `${memoryStats.percentage.toFixed(2)}%`,
                memoryStatus: memoryStats.percentage > 80 ? 'warning' : memoryStats.percentage > 95 ? 'error' : 'healthy',
                diskUsage: 'N/A', // Would need additional package for disk usage
                diskStatus: 'healthy',
                loadAverage: loadAverage.map(load => load.toFixed(2)).join(', '),
                activeConnections: 'N/A', // Would need to track this
                lastCheck: new Date().toISOString()
            },

            // Additional Information
            additional: {
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                locale: Intl.DateTimeFormat().resolvedOptions().locale,
                totalMemory: formatBytes(os.totalmem()),
                freeMemory: formatBytes(os.freemem()),
                cpuCores: os.cpus().length,
                networkInterfaces: Object.keys(os.networkInterfaces()).length,
                activeEnv: process.env.ACTIVE_ENV || 'N/A',
                mongoUser: process.env.MONGO_USER || 'N/A',
                redisConfigured: process.env.UPSTASH_REDIS_REST_URL ? 'Yes' : 'No'
            }
        };

        res.status(200).json(systemInfo);
    } catch (error) {
        console.error('Error fetching system info:', error);
        res.status(500).json({ message: 'Failed to fetch system information' });
    }
}

/**
 * Get system performance metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with performance metrics or error message
 */
export async function getPerformanceMetrics(req, res) {
    try {
        const performanceStats = getPerformanceStats();
        const cacheStats = getCacheStats();

        // Database connection stats
        const dbStats = {
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name,
            collections: Object.keys(mongoose.connection.collections).length
        };

        // System resource usage
        const systemStats = {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            uptime: process.uptime(),
            platform: process.platform,
            nodeVersion: process.version,
            loadAverage: os.loadavg(),
            freeMemory: os.freemem(),
            totalMemory: os.totalmem()
        };

        const metrics = {
            performance: performanceStats,
            cache: cacheStats,
            database: dbStats,
            system: systemStats,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(metrics);
    } catch (error) {
        console.error('Error fetching performance metrics:', error);
        res.status(500).json({
            message: 'Failed to retrieve performance metrics',
            error: error.message
        });
    }
}

/**
 * Format uptime in a human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Format memory usage object with human-readable values
 * @param {Object} memUsage - Memory usage object from process.memoryUsage()
 * @returns {Object} Formatted memory usage object
 */
function formatMemoryUsage(memUsage) {
    return {
        rss: formatBytes(memUsage.rss),
        heapTotal: formatBytes(memUsage.heapTotal),
        heapUsed: formatBytes(memUsage.heapUsed),
        external: formatBytes(memUsage.external)
    };
}

/**
 * Format bytes into human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted bytes string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get CPU usage percentage
 * @returns {number} CPU usage percentage
 */
function getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
        for (let type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return usage;
}

/**
 * Get memory statistics
 * @returns {Object} Memory statistics object
 */
function getMemoryStats() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentage
    };
}
