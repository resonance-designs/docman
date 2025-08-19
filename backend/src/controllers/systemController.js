/*
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import os from 'os';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import Doc from '../models/Doc.js';
import Category from '../models/Category.js';
import Book from '../models/Book.js';
import CustomChart from '../models/CustomChart.js';
import ExternalContact from '../models/ExternalContact.js';
import ExternalContactType from '../models/ExternalContactType.js';
import File from '../models/File.js';
import Notification from '../models/Notification.js';
import Project from '../models/Project.js';
import ReviewAssignment from '../models/ReviewAssignment.js';
import Team from '../models/Team.js';
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

/**
 * Clear a collection and archive its documents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with operation result
 */
export async function clearCollection(req, res) {
    const { collection } = req.params;
    
    try {
        // Map collection name to model
        const modelMap = {
            'books': Book,
            'documents': Doc,
            'charts': CustomChart,
            'external_contacts': ExternalContact,
            'external_contact_types': ExternalContactType,
            'files': File,
            'notifications': Notification,
            'projects': Project,
            'review_assignments': ReviewAssignment,
            'teams': Team,
            'users': User,
            'categories': Category
        };
        
        // Check if collection exists in our map
        if (!modelMap[collection]) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid collection: ${collection}` 
            });
        }
        
        // Get the model and archive collection name
        const Model = modelMap[collection];
        const archiveCollectionName = `archives_${collection}`;
        
        // Get all documents from the collection
        const documents = await Model.find({});
        
        if (documents.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: `No documents found in ${collection} collection` 
            });
        }
        
        // Create archive collection if it doesn't exist
        if (!mongoose.connection.collections[archiveCollectionName]) {
            await mongoose.connection.createCollection(archiveCollectionName);
        }
        
        // Insert documents into archive collection
        await mongoose.connection.collection(archiveCollectionName).insertMany(
            documents.map(doc => doc.toObject())
        );
        
        // Delete all documents from original collection
        await Model.deleteMany({});
        
        return res.status(200).json({ 
            success: true, 
            message: `Successfully archived and cleared ${documents.length} documents from ${collection}` 
        });
    } catch (error) {
        console.error(`Error clearing collection ${collection}:`, error);
        return res.status(500).json({ 
            success: false, 
            message: `Failed to clear collection: ${error.message}` 
        });
    }
}

/**
 * Restore a collection from its archive
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with operation result
 */
export async function restoreCollection(req, res) {
    const { collection } = req.params;
    
    try {
        // Map collection name to model
        const modelMap = {
            'books': Book,
            'documents': Doc,
            'charts': CustomChart,
            'external_contacts': ExternalContact,
            'external_contact_types': ExternalContactType,
            'files': File,
            'notifications': Notification,
            'projects': Project,
            'review_assignments': ReviewAssignment,
            'teams': Team,
            'users': User,
            'categories': Category
        };
        
        // Check if collection exists in our map
        if (!modelMap[collection]) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid collection: ${collection}` 
            });
        }
        
        // Get the model and archive collection name
        const Model = modelMap[collection];
        const archiveCollectionName = `archives_${collection}`;
        
        // Check if archive collection exists
        if (!mongoose.connection.collections[archiveCollectionName]) {
            return res.status(404).json({ 
                success: false, 
                message: `Archive collection ${archiveCollectionName} not found` 
            });
        }
        
        // Get all documents from archive collection
        const archivedDocs = await mongoose.connection.collection(archiveCollectionName).find({}).toArray();
        
        if (archivedDocs.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: `No documents found in ${archiveCollectionName} collection` 
            });
        }
        
        // Insert documents into original collection
        await Model.insertMany(archivedDocs);
        
        return res.status(200).json({ 
            success: true, 
            message: `Successfully restored ${archivedDocs.length} documents to ${collection}` 
        });
    } catch (error) {
        console.error(`Error restoring collection ${collection}:`, error);
        return res.status(500).json({ 
            success: false, 
            message: `Failed to restore collection: ${error.message}` 
        });
    }
}

/**
 * Archive files from uploads directory
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with operation result
 */
export async function archiveFiles(req, res) {
    try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const archiveDir = path.join(process.cwd(), 'uploads_archive');
        
        // Create archive directory if it doesn't exist
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }
        
        // Check if uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
            return res.status(404).json({ 
                success: false, 
                message: 'Uploads directory not found' 
            });
        }
        
        // Get all files in uploads directory
        const files = fs.readdirSync(uploadsDir);
        
        if (files.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'No files found in uploads directory' 
            });
        }
        
        let movedCount = 0;
        
        // Move each file to archive directory
        for (const file of files) {
            const sourcePath = path.join(uploadsDir, file);
            const destPath = path.join(archiveDir, file);
            
            // Skip directories and hidden files
            if (fs.statSync(sourcePath).isDirectory() || file.startsWith('.')) {
                continue;
            }
            
            fs.renameSync(sourcePath, destPath);
            movedCount++;
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `Successfully archived ${movedCount} files from uploads directory` 
        });
    } catch (error) {
        console.error('Error archiving files:', error);
        return res.status(500).json({ 
            success: false, 
            message: `Failed to archive files: ${error.message}` 
        });
    }
}

/**
 * Restore files from archive directory
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with operation result
 */
export async function restoreFiles(req, res) {
    try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const archiveDir = path.join(process.cwd(), 'uploads_archive');
        
        // Check if archive directory exists
        if (!fs.existsSync(archiveDir)) {
            return res.status(404).json({ 
                success: false, 
                message: 'Archive directory not found' 
            });
        }
        
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Get all files in archive directory
        const files = fs.readdirSync(archiveDir);
        
        if (files.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'No files found in archive directory' 
            });
        }
        
        let movedCount = 0;
        
        // Move each file to uploads directory
        for (const file of files) {
            const sourcePath = path.join(archiveDir, file);
            const destPath = path.join(uploadsDir, file);
            
            // Skip directories and hidden files
            if (fs.statSync(sourcePath).isDirectory() || file.startsWith('.')) {
                continue;
            }
            
            fs.renameSync(sourcePath, destPath);
            movedCount++;
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `Successfully restored ${movedCount} files to uploads directory` 
        });
    } catch (error) {
        console.error('Error restoring files:', error);
        return res.status(500).json({ 
            success: false, 
            message: `Failed to restore files: ${error.message}` 
        });
    }
}

/**
 * Generate dummy data for testing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with operation result
 */
export async function generateDummyData(req, res) {
    try {
        // This is a placeholder for generating dummy data
        // In a real implementation, you would create sample data for each collection
        
        // Example: Create dummy categories
        const categories = [
            { name: 'Technical', description: 'Technical documentation' },
            { name: 'Business', description: 'Business documentation' },
            { name: 'Legal', description: 'Legal documentation' },
            { name: 'Marketing', description: 'Marketing materials' }
        ];
        
        await Category.insertMany(categories);
        
        // Example: Create dummy users
        const users = [
            { 
                username: 'testuser1', 
                email: 'test1@example.com',
                password: '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG3vv1BD7WC', // 'password123'
                role: 'user'
            },
            { 
                username: 'testuser2', 
                email: 'test2@example.com',
                password: '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG3vv1BD7WC', // 'password123'
                role: 'user'
            }
        ];
        
        await User.insertMany(users);
        
        // Add more dummy data generation as needed
        
        return res.status(200).json({ 
            success: true, 
            message: 'Successfully generated dummy data' 
        });
    } catch (error) {
        console.error('Error generating dummy data:', error);
        return res.status(500).json({ 
            success: false, 
            message: `Failed to generate dummy data: ${error.message}` 
        });
    }
}
