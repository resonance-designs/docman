/*
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import Doc from "../models/Doc.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import { getOptimizedAnalytics } from "../services/queryOptimizationService.js";

/**
 * Get analytics data for dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with analytics data or error message
 */
export async function getAnalyticsData(req, res) {
    try {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1); // January 1st of current year

        // Documents created by month (2025 onwards)
        const documentsPerMonth = await Doc.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfYear }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);

        // Documents by category
        const documentsByCategory = await Doc.aggregate([
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            {
                $unwind: "$categoryInfo"
            },
            {
                $group: {
                    _id: "$categoryInfo.name",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Documents by author
        const documentsByAuthor = await Doc.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "_id",
                    as: "authorInfo"
                }
            },
            {
                $unwind: "$authorInfo"
            },
            {
                $group: {
                    _id: {
                        name: { $concat: ["$authorInfo.firstname", " ", "$authorInfo.lastname"] },
                        email: "$authorInfo.email"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10 // Top 10 authors
            }
        ]);

        // Review status analysis
        const now = new Date();
        const reviewStatus = await Doc.aggregate([
            {
                $project: {
                    status: {
                        $cond: {
                            if: { $lt: ["$reviewDate", now] },
                            then: "Overdue",
                            else: {
                                $cond: {
                                    if: { 
                                        $lt: ["$reviewDate", new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)] 
                                    },
                                    then: "Due Soon",
                                    else: "Current"
                                }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Total counts
        const totalDocuments = await Doc.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalCategories = await Category.countDocuments();

        // Recent activity (last 30 days)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentDocuments = await Doc.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        res.json({
            documentsPerMonth,
            documentsByCategory,
            documentsByAuthor,
            reviewStatus,
            totals: {
                documents: totalDocuments,
                users: totalUsers,
                categories: totalCategories,
                recentDocuments
            }
        });

    } catch (error) {
        console.error("Error fetching analytics data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Export analytics data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with exported data or error message
 */
export async function getAnalyticsExport(req, res) {
    try {
        const { type } = req.query;
        
        let data;
        let filename;

        switch (type) {
            case 'monthly':
                data = await getMonthlyDocumentsData();
                filename = 'documents-by-month.json';
                break;
            case 'category':
                data = await getCategoryData();
                filename = 'documents-by-category.json';
                break;
            case 'author':
                data = await getAuthorData();
                filename = 'documents-by-author.json';
                break;
            case 'review':
                data = await getReviewStatusData();
                filename = 'review-status.json';
                break;
            default:
                return res.status(400).json({ message: "Invalid export type" });
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(data);

    } catch (error) {
        console.error("Error exporting analytics data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get monthly documents data for export
 * @returns {Array} Array of monthly document statistics
 */
async function getMonthlyDocumentsData() {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    
    return await Doc.aggregate([
        {
            $match: {
                createdAt: { $gte: startOfYear }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                },
                count: { $sum: 1 },
                documents: { $push: { title: "$title", createdAt: "$createdAt" } }
            }
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1 }
        }
    ]);
}

/**
 * Get category data for export
 * @returns {Array} Array of category statistics
 */
async function getCategoryData() {
    return await Doc.aggregate([
        {
            $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "categoryInfo"
            }
        },
        {
            $unwind: "$categoryInfo"
        },
        {
            $group: {
                _id: "$categoryInfo.name",
                count: { $sum: 1 },
                documents: { $push: { title: "$title", createdAt: "$createdAt" } }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
}

/**
 * Get author data for export
 * @returns {Array} Array of author statistics
 */
async function getAuthorData() {
    return await Doc.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "authorInfo"
            }
        },
        {
            $unwind: "$authorInfo"
        },
        {
            $group: {
                _id: {
                    name: { $concat: ["$authorInfo.firstname", " ", "$authorInfo.lastname"] },
                    email: "$authorInfo.email"
                },
                count: { $sum: 1 },
                documents: { $push: { title: "$title", createdAt: "$createdAt" } }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
}

/**
 * Get review status data for export
 * @returns {Array} Array of review status statistics
 */
async function getReviewStatusData() {
    const now = new Date();
    return await Doc.aggregate([
        {
            $project: {
                title: 1,
                reviewDate: 1,
                createdAt: 1,
                status: {
                    $cond: {
                        if: { $lt: ["$reviewDate", now] },
                        then: "Overdue",
                        else: {
                            $cond: {
                                if: { 
                                    $lt: ["$reviewDate", new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)] 
                                },
                                then: "Due Soon",
                                else: "Current"
                            }
                        }
                    }
                }
            }
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
                documents: { $push: { title: "$title", reviewDate: "$reviewDate", createdAt: "$createdAt" } }
            }
        }
    ]);
}
