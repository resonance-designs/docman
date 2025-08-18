/*
 * @name queryOptimizationService
 * @file /docman/backend/src/services/queryOptimizationService.js
 * @service queryOptimizationService
 * @description Optimized database queries with caching and performance monitoring
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import Doc from '../models/Doc.js';
import User from '../models/User.js';
import Category from '../models/Category.js';

// Simple in-memory cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Cache wrapper for database queries
 * @param {string} key - Cache key
 * @param {Function} queryFn - Function that returns a promise with the data
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise} Cached or fresh data
 */
async function withCache(key, queryFn, ttl = CACHE_TTL) {
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
    }
    
    const data = await queryFn();
    cache.set(key, { data, timestamp: Date.now() });
    
    // Clean up expired cache entries periodically
    if (cache.size > 100) {
        const now = Date.now();
        for (const [cacheKey, value] of cache.entries()) {
            if (now - value.timestamp > ttl) {
                cache.delete(cacheKey);
            }
        }
    }
    
    return data;
}

/**
 * Clear cache for specific keys or all cache
 * @param {string|Array} keys - Specific keys to clear, or null for all
 */
export function clearCache(keys = null) {
    if (!keys) {
        cache.clear();
        return;
    }
    
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => cache.delete(key));
}

/**
 * Optimized document search with aggregation pipeline
 * @param {Object} filters - Search filters
 * @param {Object} options - Query options (limit, skip, sort)
 * @param {Object} user - User for access control
 * @returns {Promise<Object>} Search results with metadata
 */
export async function optimizedDocumentSearch(filters, options, user) {
    const { limit = 50, skip = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    // Build aggregation pipeline
    const pipeline = [];
    
    // Match stage with filters
    const matchStage = {};
    
    // Text search
    if (filters.search) {
        matchStage.$text = { $search: filters.search };
    }
    
    // Category filter
    if (filters.category) {
        matchStage.category = new mongoose.Types.ObjectId(filters.category);
    }
    
    // Author filter
    if (filters.author) {
        matchStage.author = new mongoose.Types.ObjectId(filters.author);
    }
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
        matchStage.createdAt = {};
        if (filters.startDate) {
            matchStage.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
            matchStage.createdAt.$lte = new Date(filters.endDate);
        }
    }
    
    // Review status filter
    if (filters.reviewStatus) {
        const now = new Date();
        switch (filters.reviewStatus) {
            case 'overdue':
                matchStage.reviewDate = { $lt: now };
                matchStage.reviewCompleted = { $ne: true };
                break;
            case 'due-soon':
                const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                matchStage.reviewDate = { $gte: now, $lte: weekFromNow };
                matchStage.reviewCompleted = { $ne: true };
                break;
            case 'current':
                matchStage.reviewDate = { $gt: now };
                break;
        }
    }
    
    // User access control for non-admins
    if (user.role !== 'admin') {
        matchStage.$or = [
            { author: new mongoose.Types.ObjectId(user.id) },
            { stakeholders: new mongoose.Types.ObjectId(user.id) },
            { owners: new mongoose.Types.ObjectId(user.id) }
        ];
    }
    
    pipeline.push({ $match: matchStage });
    
    // Add text score for text search
    if (filters.search) {
        pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
    }
    
    // Lookup stages for population
    pipeline.push(
        {
            $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'author',
                pipeline: [{ $project: { firstname: 1, lastname: 1, email: 1 } }]
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'category',
                pipeline: [{ $project: { name: 1 } }]
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'stakeholders',
                foreignField: '_id',
                as: 'stakeholders',
                pipeline: [{ $project: { firstname: 1, lastname: 1, email: 1 } }]
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'owners',
                foreignField: '_id',
                as: 'owners',
                pipeline: [{ $project: { firstname: 1, lastname: 1, email: 1 } }]
            }
        }
    );
    
    // Unwind single-value lookups
    pipeline.push(
        { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
    );
    
    // Sort stage
    const sortStage = {};
    if (filters.search && !sortBy) {
        sortStage.score = { $meta: 'textScore' };
    } else {
        sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }
    pipeline.push({ $sort: sortStage });
    
    // Facet stage for pagination and count
    pipeline.push({
        $facet: {
            documents: [
                { $skip: skip },
                { $limit: limit }
            ],
            totalCount: [
                { $count: 'count' }
            ]
        }
    });
    
    const [result] = await Doc.aggregate(pipeline);
    const documents = result.documents || [];
    const total = result.totalCount[0]?.count || 0;
    
    return {
        documents,
        total,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + limit < total,
        hasPrevPage: skip > 0
    };
}

/**
 * Get user dashboard data with optimized queries
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Dashboard data
 */
export async function getUserDashboardData(userId) {
    const cacheKey = `dashboard:${userId}`;
    
    return withCache(cacheKey, async () => {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        // Use aggregation to get all data in fewer queries
        const [userStats, recentDocs, upcomingReviews] = await Promise.all([
            // User statistics
            Doc.aggregate([
                {
                    $match: {
                        $or: [
                            { author: userObjectId },
                            { stakeholders: userObjectId },
                            { owners: userObjectId }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalDocuments: { $sum: 1 },
                        authoredDocuments: {
                            $sum: { $cond: [{ $eq: ['$author', userObjectId] }, 1, 0] }
                        },
                        overdueReviews: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $lt: ['$reviewDate', new Date()] },
                                            { $ne: ['$reviewCompleted', true] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),
            
            // Recent documents
            Doc.find({
                $or: [
                    { author: userObjectId },
                    { stakeholders: userObjectId },
                    { owners: userObjectId }
                ]
            })
            .populate('author', 'firstname lastname')
            .populate('category', 'name')
            .sort({ updatedAt: -1 })
            .limit(5)
            .lean(),
            
            // Upcoming reviews
            Doc.find({
                $or: [
                    { author: userObjectId },
                    { stakeholders: userObjectId },
                    { owners: userObjectId }
                ],
                reviewDate: { $gte: new Date() },
                reviewCompleted: { $ne: true }
            })
            .populate('author', 'firstname lastname')
            .populate('category', 'name')
            .sort({ reviewDate: 1 })
            .limit(10)
            .lean()
        ]);
        
        return {
            stats: userStats[0] || { totalDocuments: 0, authoredDocuments: 0, overdueReviews: 0 },
            recentDocuments: recentDocs,
            upcomingReviews: upcomingReviews
        };
    }, 2 * 60 * 1000); // 2 minute cache for dashboard
}

/**
 * Get analytics data with optimized aggregations
 * @returns {Promise<Object>} Analytics data
 */
export async function getOptimizedAnalytics() {
    const cacheKey = 'analytics:main';
    
    return withCache(cacheKey, async () => {
        // Use Promise.all to run aggregations in parallel
        const [
            documentsByCategory,
            documentsByAuthor,
            reviewStatusData,
            totalCounts,
            recentActivity
        ] = await Promise.all([
            // Documents by category - optimized with single aggregation
            Doc.aggregate([
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'categoryInfo'
                    }
                },
                { $unwind: '$categoryInfo' },
                {
                    $group: {
                        _id: '$categoryInfo.name',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),
            
            // Top authors
            Doc.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'authorInfo'
                    }
                },
                { $unwind: '$authorInfo' },
                {
                    $group: {
                        _id: {
                            name: { $concat: ['$authorInfo.firstname', ' ', '$authorInfo.lastname'] },
                            email: '$authorInfo.email'
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            
            // Review status analysis
            Doc.aggregate([
                {
                    $project: {
                        status: {
                            $cond: {
                                if: { $lt: ['$reviewDate', new Date()] },
                                then: 'Overdue',
                                else: {
                                    $cond: {
                                        if: { 
                                            $lt: ['$reviewDate', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] 
                                        },
                                        then: 'Due Soon',
                                        else: 'Current'
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            
            // Total counts in parallel
            Promise.all([
                Doc.countDocuments(),
                User.countDocuments(),
                Category.countDocuments()
            ]),
            
            // Recent activity
            Doc.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            })
        ]);
        
        return {
            documentsByCategory,
            documentsByAuthor,
            reviewStatus: reviewStatusData,
            totalDocuments: totalCounts[0],
            totalUsers: totalCounts[1],
            totalCategories: totalCounts[2],
            recentDocuments: recentActivity
        };
    }, 10 * 60 * 1000); // 10 minute cache for analytics
}
