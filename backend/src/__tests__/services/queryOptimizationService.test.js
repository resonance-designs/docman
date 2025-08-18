/*
 * @name queryOptimizationService Tests
 * @file /docman/backend/src/__tests__/services/queryOptimizationService.test.js
 * @description Unit tests for query optimization service
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import { jest } from '@jest/globals';
import {
    clearCache,
    optimizedDocumentSearch,
    getUserDashboardData,
    getOptimizedAnalytics
} from '../../services/queryOptimizationService.js';

// Mock the models
const mockDoc = {
    aggregate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn()
};

const mockUser = {
    countDocuments: jest.fn()
};

const mockCategory = {
    countDocuments: jest.fn()
};

jest.unstable_mockModule('../../models/Doc.js', () => ({
    default: mockDoc
}));

jest.unstable_mockModule('../../models/User.js', () => ({
    default: mockUser
}));

jest.unstable_mockModule('../../models/Category.js', () => ({
    default: mockCategory
}));

describe('QueryOptimizationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearCache(); // Clear cache before each test
    });

    describe('Cache Management', () => {
        test('should clear all cache when no keys provided', () => {
            // This test verifies the cache clearing functionality
            expect(() => clearCache()).not.toThrow();
        });

        test('should clear specific cache keys', () => {
            expect(() => clearCache(['key1', 'key2'])).not.toThrow();
        });

        test('should clear cache by pattern', () => {
            expect(() => clearCache('dashboard:')).not.toThrow();
        });
    });

    describe('optimizedDocumentSearch', () => {
        const mockUser = { id: '507f1f77bcf86cd799439011', role: 'editor' };
        
        beforeEach(() => {
            mockDoc.aggregate.mockResolvedValue([{
                documents: [
                    { _id: '1', title: 'Test Doc 1', author: { firstname: 'John', lastname: 'Doe' } },
                    { _id: '2', title: 'Test Doc 2', author: { firstname: 'Jane', lastname: 'Smith' } }
                ],
                totalCount: [{ count: 25 }]
            }]);
        });

        test('should perform basic document search', async () => {
            const filters = { search: 'test' };
            const options = { limit: 10, skip: 0 };
            
            const result = await optimizedDocumentSearch(filters, options, mockUser);
            
            expect(mockDoc.aggregate).toHaveBeenCalledWith(expect.any(Array));
            expect(result.documents).toHaveLength(2);
            expect(result.total).toBe(25);
            expect(result.page).toBe(1);
            expect(result.totalPages).toBe(3);
            expect(result.hasNextPage).toBe(true);
            expect(result.hasPrevPage).toBe(false);
        });

        test('should build correct aggregation pipeline for text search', async () => {
            const filters = { search: 'test document' };
            const options = { limit: 5, skip: 10 };
            
            await optimizedDocumentSearch(filters, options, mockUser);
            
            const pipeline = mockDoc.aggregate.mock.calls[0][0];
            
            // Check for text search match stage
            const matchStage = pipeline.find(stage => stage.$match);
            expect(matchStage.$match.$text).toEqual({ $search: 'test document' });
            
            // Check for text score addition
            const addFieldsStage = pipeline.find(stage => stage.$addFields);
            expect(addFieldsStage.$addFields.score).toEqual({ $meta: 'textScore' });
            
            // Check for facet stage with pagination
            const facetStage = pipeline.find(stage => stage.$facet);
            expect(facetStage.$facet.documents[0].$skip).toBe(10);
            expect(facetStage.$facet.documents[1].$limit).toBe(5);
        });

        test('should apply category filter', async () => {
            const filters = { category: '507f1f77bcf86cd799439011' };
            const options = {};
            
            await optimizedDocumentSearch(filters, options, mockUser);
            
            const pipeline = mockDoc.aggregate.mock.calls[0][0];
            const matchStage = pipeline.find(stage => stage.$match);
            
            expect(matchStage.$match.category).toBeDefined();
        });

        test('should apply author filter', async () => {
            const filters = { author: '507f1f77bcf86cd799439012' };
            const options = {};
            
            await optimizedDocumentSearch(filters, options, mockUser);
            
            const pipeline = mockDoc.aggregate.mock.calls[0][0];
            const matchStage = pipeline.find(stage => stage.$match);
            
            expect(matchStage.$match.author).toBeDefined();
        });

        test('should apply date range filters', async () => {
            const filters = { 
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            };
            const options = {};
            
            await optimizedDocumentSearch(filters, options, mockUser);
            
            const pipeline = mockDoc.aggregate.mock.calls[0][0];
            const matchStage = pipeline.find(stage => stage.$match);
            
            expect(matchStage.$match.createdAt).toBeDefined();
            expect(matchStage.$match.createdAt.$gte).toBeInstanceOf(Date);
            expect(matchStage.$match.createdAt.$lte).toBeInstanceOf(Date);
        });

        test('should apply review status filters', async () => {
            const filters = { reviewStatus: 'overdue' };
            const options = {};
            
            await optimizedDocumentSearch(filters, options, mockUser);
            
            const pipeline = mockDoc.aggregate.mock.calls[0][0];
            const matchStage = pipeline.find(stage => stage.$match);
            
            expect(matchStage.$match.reviewDate).toBeDefined();
            expect(matchStage.$match.reviewCompleted).toEqual({ $ne: true });
        });

        test('should apply user access control for non-admin users', async () => {
            const nonAdminUser = { id: '507f1f77bcf86cd799439011', role: 'editor' };
            const filters = {};
            const options = {};
            
            await optimizedDocumentSearch(filters, options, nonAdminUser);
            
            const pipeline = mockDoc.aggregate.mock.calls[0][0];
            const matchStage = pipeline.find(stage => stage.$match);
            
            expect(matchStage.$match.$or).toBeDefined();
            expect(matchStage.$match.$or).toHaveLength(3); // author, stakeholders, owners
        });

        test('should not apply access control for admin users', async () => {
            const adminUser = { id: '507f1f77bcf86cd799439011', role: 'admin' };
            const filters = {};
            const options = {};
            
            await optimizedDocumentSearch(filters, options, adminUser);
            
            const pipeline = mockDoc.aggregate.mock.calls[0][0];
            const matchStage = pipeline.find(stage => stage.$match);
            
            expect(matchStage.$match.$or).toBeUndefined();
        });

        test('should handle empty results', async () => {
            mockDoc.aggregate.mockResolvedValue([{
                documents: [],
                totalCount: []
            }]);
            
            const result = await optimizedDocumentSearch({}, {}, mockUser);
            
            expect(result.documents).toEqual([]);
            expect(result.total).toBe(0);
            expect(result.totalPages).toBe(0);
        });

        test('should handle database errors', async () => {
            mockDoc.aggregate.mockRejectedValue(new Error('Database connection failed'));
            
            await expect(optimizedDocumentSearch({}, {}, mockUser))
                .rejects.toThrow('Database connection failed');
        });
    });

    describe('getUserDashboardData', () => {
        const userId = '507f1f77bcf86cd799439011';
        
        beforeEach(() => {
            // Mock aggregation for user stats
            mockDoc.aggregate.mockResolvedValueOnce([{
                totalDocuments: 10,
                authoredDocuments: 5,
                overdueReviews: 2
            }]);
            
            // Mock find for recent documents
            const mockFind = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([
                    { _id: '1', title: 'Recent Doc 1' },
                    { _id: '2', title: 'Recent Doc 2' }
                ])
            };
            mockDoc.find.mockReturnValue(mockFind);
            
            // Mock find for upcoming reviews
            const mockFindReviews = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([
                    { _id: '3', title: 'Review Doc 1', reviewDate: new Date() }
                ])
            };
            mockDoc.find.mockReturnValueOnce(mockFind).mockReturnValueOnce(mockFindReviews);
        });

        test('should return dashboard data with caching', async () => {
            const result = await getUserDashboardData(userId);
            
            expect(result.stats).toBeDefined();
            expect(result.recentDocuments).toBeDefined();
            expect(result.upcomingReviews).toBeDefined();
            
            expect(result.stats.totalDocuments).toBe(10);
            expect(result.stats.authoredDocuments).toBe(5);
            expect(result.stats.overdueReviews).toBe(2);
            
            expect(result.recentDocuments).toHaveLength(2);
            expect(result.upcomingReviews).toHaveLength(1);
        });

        test('should use cached data on second call', async () => {
            // First call
            await getUserDashboardData(userId);
            
            // Clear mock call history
            jest.clearAllMocks();
            
            // Second call should use cache
            const result = await getUserDashboardData(userId);
            
            // Should not call database again
            expect(mockDoc.aggregate).not.toHaveBeenCalled();
            expect(mockDoc.find).not.toHaveBeenCalled();
            
            // But should still return data
            expect(result.stats).toBeDefined();
        });

        test('should handle database errors gracefully', async () => {
            mockDoc.aggregate.mockRejectedValue(new Error('Database error'));
            
            await expect(getUserDashboardData(userId))
                .rejects.toThrow('Database error');
        });
    });

    describe('getOptimizedAnalytics', () => {
        beforeEach(() => {
            // Mock all the parallel aggregations
            mockDoc.aggregate
                .mockResolvedValueOnce([{ _id: 'Technical', count: 5 }]) // documentsByCategory
                .mockResolvedValueOnce([{ _id: { name: 'John Doe' }, count: 3 }]) // documentsByAuthor
                .mockResolvedValueOnce([{ _id: 'Current', count: 8 }]); // reviewStatus
            
            // Mock Promise.all for total counts
            mockDoc.countDocuments.mockResolvedValue(25);
            mockUser.countDocuments.mockResolvedValue(10);
            mockCategory.countDocuments.mockResolvedValue(5);
            
            // Mock recent activity count
            mockDoc.countDocuments.mockResolvedValueOnce(3);
        });

        test('should return comprehensive analytics data', async () => {
            const result = await getOptimizedAnalytics();
            
            expect(result.documentsByCategory).toBeDefined();
            expect(result.documentsByAuthor).toBeDefined();
            expect(result.reviewStatus).toBeDefined();
            expect(result.totalDocuments).toBe(25);
            expect(result.totalUsers).toBe(10);
            expect(result.totalCategories).toBe(5);
            expect(result.recentDocuments).toBe(3);
        });

        test('should use caching for analytics data', async () => {
            // First call
            await getOptimizedAnalytics();
            
            // Clear mock call history
            jest.clearAllMocks();
            
            // Second call should use cache
            const result = await getOptimizedAnalytics();
            
            // Should not call database again
            expect(mockDoc.aggregate).not.toHaveBeenCalled();
            expect(mockDoc.countDocuments).not.toHaveBeenCalled();
            
            // But should still return data
            expect(result.totalDocuments).toBe(25);
        });

        test('should handle partial failures in parallel operations', async () => {
            mockDoc.aggregate
                .mockResolvedValueOnce([{ _id: 'Technical', count: 5 }])
                .mockRejectedValueOnce(new Error('Aggregation failed'))
                .mockResolvedValueOnce([{ _id: 'Current', count: 8 }]);
            
            await expect(getOptimizedAnalytics())
                .rejects.toThrow();
        });
    });
});
