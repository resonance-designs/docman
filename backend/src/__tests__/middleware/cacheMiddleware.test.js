/*
 * @name cacheMiddleware Tests
 * @file /docman/backend/src/__tests__/middleware/cacheMiddleware.test.js
 * @description Unit tests for caching middleware
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import { jest } from '@jest/globals';
import {
    cacheResponse,
    cacheAnalytics,
    cacheUserData,
    clearCache,
    getCacheStats,
    setCacheHeaders
} from '../../middleware/cacheMiddleware.js';

describe('CacheMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            originalUrl: '/api/test',
            url: '/api/test',
            query: {}
        };
        
        res = {
            json: jest.fn(),
            set: jest.fn()
        };
        
        next = jest.fn();
        
        // Clear cache before each test
        clearCache();
    });

    describe('cacheResponse', () => {
        test('should cache response on first call', () => {
            const middleware = cacheResponse(300); // 5 minutes
            
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            
            // Simulate response
            const testData = { message: 'test data' };
            res.json(testData);
            
            expect(res.json).toHaveBeenCalledWith(testData);
        });

        test('should return cached response on subsequent calls', () => {
            const middleware = cacheResponse(300);
            const testData = { message: 'test data' };
            
            // First call
            middleware(req, res, next);
            res.json(testData);
            
            // Reset mocks
            jest.clearAllMocks();
            
            // Second call with same URL
            middleware(req, res, next);
            
            // Should return cached response without calling next
            expect(next).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(testData);
        });

        test('should create different cache keys for different URLs', () => {
            const middleware = cacheResponse(300);
            
            // First URL
            req.originalUrl = '/api/test1';
            middleware(req, res, next);
            res.json({ data: 'test1' });
            
            // Reset mocks
            jest.clearAllMocks();
            
            // Different URL
            req.originalUrl = '/api/test2';
            middleware(req, res, next);
            
            // Should call next for different URL
            expect(next).toHaveBeenCalled();
        });

        test('should create different cache keys for different query parameters', () => {
            const middleware = cacheResponse(300);
            
            // First call with query params
            req.query = { page: 1 };
            middleware(req, res, next);
            res.json({ data: 'page1' });
            
            // Reset mocks
            jest.clearAllMocks();
            
            // Different query params
            req.query = { page: 2 };
            middleware(req, res, next);
            
            // Should call next for different query params
            expect(next).toHaveBeenCalled();
        });

        test('should respect TTL and expire cache', (done) => {
            const middleware = cacheResponse(0.001); // 1ms TTL
            
            // First call
            middleware(req, res, next);
            res.json({ data: 'test' });
            
            // Wait for cache to expire
            setTimeout(() => {
                jest.clearAllMocks();
                
                // Second call after expiration
                middleware(req, res, next);
                
                // Should call next as cache expired
                expect(next).toHaveBeenCalled();
                done();
            }, 10);
        });

        test('should handle cache cleanup when size limit reached', () => {
            const middleware = cacheResponse(300);
            
            // Create many cache entries to trigger cleanup
            for (let i = 0; i < 105; i++) {
                req.originalUrl = `/api/test${i}`;
                middleware(req, res, next);
                res.json({ data: `test${i}` });
            }
            
            // Cache should have been cleaned up
            const stats = getCacheStats();
            expect(stats.totalEntries).toBeLessThanOrEqual(100);
        });
    });

    describe('cacheAnalytics', () => {
        test('should use 10 minute TTL for analytics', () => {
            const middleware = cacheAnalytics();
            
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            
            // Simulate response
            res.json({ analytics: 'data' });
            
            // Reset and call again
            jest.clearAllMocks();
            middleware(req, res, next);
            
            // Should use cached response
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('cacheUserData', () => {
        test('should use 2 minute TTL for user data', () => {
            const middleware = cacheUserData();
            
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            
            // Simulate response
            res.json({ user: 'data' });
            
            // Reset and call again
            jest.clearAllMocks();
            middleware(req, res, next);
            
            // Should use cached response
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('clearCache', () => {
        test('should clear all cache when no pattern provided', () => {
            const middleware = cacheResponse(300);
            
            // Create some cache entries
            req.originalUrl = '/api/test1';
            middleware(req, res, next);
            res.json({ data: 'test1' });
            
            req.originalUrl = '/api/test2';
            middleware(req, res, next);
            res.json({ data: 'test2' });
            
            // Clear all cache
            clearCache();
            
            // Verify cache is empty
            const stats = getCacheStats();
            expect(stats.totalEntries).toBe(0);
        });

        test('should clear cache by string pattern', () => {
            const middleware = cacheResponse(300);
            
            // Create cache entries
            req.originalUrl = '/api/users/1';
            middleware(req, res, next);
            res.json({ user: 'data1' });
            
            req.originalUrl = '/api/docs/1';
            middleware(req, res, next);
            res.json({ doc: 'data1' });
            
            // Clear only user-related cache
            clearCache('/api/users');
            
            // Verify selective clearing
            jest.clearAllMocks();
            
            // User endpoint should call next (cache cleared)
            req.originalUrl = '/api/users/1';
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            
            jest.clearAllMocks();
            
            // Docs endpoint should use cache (not cleared)
            req.originalUrl = '/api/docs/1';
            middleware(req, res, next);
            expect(next).not.toHaveBeenCalled();
        });

        test('should clear cache by regex pattern', () => {
            const middleware = cacheResponse(300);
            
            // Create cache entries
            req.originalUrl = '/api/users/123';
            middleware(req, res, next);
            res.json({ user: 'data' });
            
            req.originalUrl = '/api/users/456';
            middleware(req, res, next);
            res.json({ user: 'data' });
            
            req.originalUrl = '/api/docs/789';
            middleware(req, res, next);
            res.json({ doc: 'data' });
            
            // Clear cache matching regex pattern
            clearCache(/\/api\/users\/\d+/);
            
            // Verify regex-based clearing
            jest.clearAllMocks();
            
            // User endpoints should call next (cache cleared)
            req.originalUrl = '/api/users/123';
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            
            jest.clearAllMocks();
            
            // Docs endpoint should use cache (not cleared)
            req.originalUrl = '/api/docs/789';
            middleware(req, res, next);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('getCacheStats', () => {
        test('should return cache statistics', () => {
            const middleware = cacheResponse(300);
            
            // Create some cache entries
            req.originalUrl = '/api/test1';
            middleware(req, res, next);
            res.json({ data: 'test1' });
            
            req.originalUrl = '/api/test2';
            middleware(req, res, next);
            res.json({ data: 'test2' });
            
            const stats = getCacheStats();
            
            expect(stats.totalEntries).toBe(2);
            expect(stats.activeEntries).toBe(2);
            expect(stats.expiredEntries).toBe(0);
            expect(stats.memoryUsage).toBeDefined();
        });

        test('should count expired entries correctly', (done) => {
            const middleware = cacheResponse(0.001); // 1ms TTL
            
            // Create cache entry that will expire
            middleware(req, res, next);
            res.json({ data: 'test' });
            
            // Wait for expiration
            setTimeout(() => {
                const stats = getCacheStats();
                expect(stats.expiredEntries).toBe(1);
                expect(stats.activeEntries).toBe(0);
                done();
            }, 10);
        });
    });

    describe('setCacheHeaders', () => {
        test('should set cache control headers', () => {
            const middleware = setCacheHeaders(300);
            
            middleware(req, res, next);
            
            expect(res.set).toHaveBeenCalledWith({
                'Cache-Control': 'public, max-age=300',
                'ETag': expect.any(String),
                'Last-Modified': expect.any(String)
            });
            expect(next).toHaveBeenCalled();
        });

        test('should use custom max-age', () => {
            const middleware = setCacheHeaders(600);
            
            middleware(req, res, next);
            
            expect(res.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    'Cache-Control': 'public, max-age=600'
                })
            );
        });

        test('should use default max-age when not specified', () => {
            const middleware = setCacheHeaders();
            
            middleware(req, res, next);
            
            expect(res.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    'Cache-Control': 'public, max-age=300'
                })
            );
        });
    });
});
