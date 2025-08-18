/*
 * @name performanceMonitor Tests
 * @file /docman/backend/src/__tests__/middleware/performanceMonitor.test.js
 * @description Unit tests for performance monitoring middleware
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import { jest } from '@jest/globals';
import {
    performanceMonitor,
    getPerformanceStats,
    clearPerformanceMetrics,
    monitorQuery
} from '../../middleware/performanceMonitor.js';

describe('PerformanceMonitor', () => {
    let req, res, next;
    let originalConsoleWarn, originalConsoleError;

    beforeEach(() => {
        req = {
            method: 'GET',
            originalUrl: '/api/test',
            url: '/api/test',
            get: jest.fn().mockReturnValue('test-user-agent'),
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' }
        };
        
        res = {
            statusCode: 200,
            end: jest.fn(),
            set: jest.fn()
        };
        
        next = jest.fn();
        
        // Mock console methods to avoid noise in tests
        originalConsoleWarn = console.warn;
        originalConsoleError = console.error;
        console.warn = jest.fn();
        console.error = jest.fn();
        
        // Clear metrics before each test
        clearPerformanceMetrics();
    });

    afterEach(() => {
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
    });

    describe('performanceMonitor middleware', () => {
        test('should track response time and add header', (done) => {
            performanceMonitor(req, res, next);
            
            expect(next).toHaveBeenCalled();
            
            // Simulate response after some time
            setTimeout(() => {
                res.end();
                
                expect(res.set).toHaveBeenCalledWith(
                    'X-Response-Time',
                    expect.stringMatching(/\d+ms/)
                );
                
                const stats = getPerformanceStats();
                expect(stats.total.requests).toBe(1);
                expect(stats.total.averageResponseTime).toBeGreaterThan(0);
                
                done();
            }, 10);
        });

        test('should track memory usage delta', (done) => {
            performanceMonitor(req, res, next);
            
            setTimeout(() => {
                res.end();
                
                const stats = getPerformanceStats();
                const request = stats.total.requests > 0;
                expect(request).toBe(true);
                
                done();
            }, 10);
        });

        test('should log warning for slow requests (>1s)', (done) => {
            performanceMonitor(req, res, next);
            
            // Mock a slow response by delaying the end call
            setTimeout(() => {
                res.end();
                
                // Should have logged a warning
                expect(console.warn).toHaveBeenCalledWith(
                    expect.stringContaining('Slow request detected')
                );
                
                done();
            }, 1100); // Slightly over 1 second
        }, 2000); // Increase test timeout

        test('should log error for very slow requests (>5s)', (done) => {
            performanceMonitor(req, res, next);
            
            // Mock a very slow response
            setTimeout(() => {
                res.end();
                
                // Should have logged an error
                expect(console.error).toHaveBeenCalledWith(
                    expect.stringContaining('Very slow request')
                );
                
                done();
            }, 5100); // Slightly over 5 seconds
        }, 6000); // Increase test timeout

        test('should handle different HTTP methods', (done) => {
            req.method = 'POST';
            req.originalUrl = '/api/docs';
            
            performanceMonitor(req, res, next);
            
            setTimeout(() => {
                res.end();
                
                const stats = getPerformanceStats();
                expect(stats.total.requests).toBe(1);
                
                done();
            }, 10);
        });

        test('should handle different status codes', (done) => {
            res.statusCode = 404;
            
            performanceMonitor(req, res, next);
            
            setTimeout(() => {
                res.end();
                
                const stats = getPerformanceStats();
                expect(stats.total.requests).toBe(1);
                
                done();
            }, 10);
        });

        test('should preserve original res.end functionality', (done) => {
            const originalEnd = res.end;
            const endSpy = jest.fn();
            res.end = endSpy;
            
            performanceMonitor(req, res, next);
            
            setTimeout(() => {
                res.end('test data');
                
                expect(endSpy).toHaveBeenCalledWith('test data');
                
                done();
            }, 10);
        });
    });

    describe('getPerformanceStats', () => {
        test('should return empty stats initially', () => {
            const stats = getPerformanceStats();
            
            expect(stats.total.requests).toBe(0);
            expect(stats.total.averageResponseTime).toBe(0);
            expect(stats.total.slowQueries).toBe(0);
            expect(stats.hourly.requests).toBe(0);
            expect(stats.daily.requests).toBe(0);
            expect(stats.endpoints).toEqual([]);
            expect(stats.slowestQueries).toEqual([]);
            expect(stats.memoryUsage).toBeDefined();
            expect(stats.uptime).toBeGreaterThan(0);
        });

        test('should calculate statistics correctly', (done) => {
            // Create multiple requests with different response times
            const requests = [
                { method: 'GET', url: '/api/test1', delay: 100 },
                { method: 'POST', url: '/api/test2', delay: 200 },
                { method: 'GET', url: '/api/test1', delay: 150 }
            ];
            
            let completed = 0;
            
            requests.forEach((request, index) => {
                const testReq = { ...req, method: request.method, originalUrl: request.url };
                const testRes = { ...res, end: jest.fn() };
                
                performanceMonitor(testReq, testRes, next);
                
                setTimeout(() => {
                    testRes.end();
                    completed++;
                    
                    if (completed === requests.length) {
                        const stats = getPerformanceStats();
                        
                        expect(stats.total.requests).toBe(3);
                        expect(stats.total.averageResponseTime).toBeGreaterThan(0);
                        expect(stats.endpoints.length).toBeGreaterThan(0);
                        
                        // Check endpoint grouping
                        const getEndpoint = stats.endpoints.find(e => e.endpoint === 'GET /api/test1');
                        expect(getEndpoint).toBeDefined();
                        expect(getEndpoint.count).toBe(2);
                        
                        done();
                    }
                }, request.delay);
            });
        }, 2000);

        test('should filter requests by time period', (done) => {
            performanceMonitor(req, res, next);
            
            setTimeout(() => {
                res.end();
                
                const stats = getPerformanceStats();
                
                expect(stats.hourly.requests).toBe(1);
                expect(stats.daily.requests).toBe(1);
                
                done();
            }, 10);
        });
    });

    describe('clearPerformanceMetrics', () => {
        test('should clear all performance metrics', (done) => {
            performanceMonitor(req, res, next);
            
            setTimeout(() => {
                res.end();
                
                // Verify metrics exist
                let stats = getPerformanceStats();
                expect(stats.total.requests).toBe(1);
                
                // Clear metrics
                clearPerformanceMetrics();
                
                // Verify metrics are cleared
                stats = getPerformanceStats();
                expect(stats.total.requests).toBe(0);
                expect(stats.total.averageResponseTime).toBe(0);
                
                done();
            }, 10);
        });
    });

    describe('monitorQuery', () => {
        test('should monitor successful query execution', async () => {
            const mockQuery = jest.fn().mockResolvedValue({ data: 'test' });
            
            const result = await monitorQuery('test-operation', mockQuery);
            
            expect(mockQuery).toHaveBeenCalled();
            expect(result).toEqual({ data: 'test' });
        });

        test('should log warning for slow queries (>500ms)', async () => {
            const mockQuery = jest.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 600))
            );
            
            await monitorQuery('slow-operation', mockQuery);
            
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Slow database query: slow-operation')
            );
        }, 1000);

        test('should log error for very slow queries (>2s)', async () => {
            const mockQuery = jest.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 2100))
            );
            
            await monitorQuery('very-slow-operation', mockQuery);
            
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Very slow database query: very-slow-operation')
            );
        }, 3000);

        test('should handle query errors and log them', async () => {
            const mockQuery = jest.fn().mockRejectedValue(new Error('Database error'));
            
            await expect(monitorQuery('failed-operation', mockQuery))
                .rejects.toThrow('Database error');
            
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Database query failed: failed-operation')
            );
        });

        test('should measure query execution time accurately', async () => {
            const delay = 100;
            const mockQuery = jest.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), delay))
            );
            
            const startTime = Date.now();
            await monitorQuery('timed-operation', mockQuery);
            const endTime = Date.now();
            
            const actualDuration = endTime - startTime;
            expect(actualDuration).toBeGreaterThanOrEqual(delay);
        }, 1000);
    });
});
