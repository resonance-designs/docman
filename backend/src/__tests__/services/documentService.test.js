/*
 * @name documentService Tests
 * @file /docman/backend/src/__tests__/services/documentService.test.js
 * @description Unit tests for document service business logic
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import {
    hasDocumentAccess,
    buildDocumentFilter,
    buildDocumentSort,
    parseDocumentData,
    getDocuments
} from '../../services/documentService.js';

// Mock the Doc model
const mockDoc = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
};

jest.unstable_mockModule('../../models/Doc.js', () => ({
    default: mockDoc
}));

describe('DocumentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('hasDocumentAccess', () => {
        const userId = '507f1f77bcf86cd799439011';
        
        test('should allow admin access to any document', () => {
            const doc = { author: 'other-user-id' };
            const result = hasDocumentAccess(doc, userId, 'admin');
            expect(result).toBe(true);
        });

        test('should allow author access to their document', () => {
            const doc = { author: userId };
            const result = hasDocumentAccess(doc, userId, 'editor');
            expect(result).toBe(true);
        });

        test('should allow stakeholder access', () => {
            const doc = { 
                author: 'other-user-id',
                stakeholders: [userId, 'another-user-id']
            };
            const result = hasDocumentAccess(doc, userId, 'editor');
            expect(result).toBe(true);
        });

        test('should allow owner access', () => {
            const doc = { 
                author: 'other-user-id',
                stakeholders: ['another-user-id'],
                owners: [userId]
            };
            const result = hasDocumentAccess(doc, userId, 'viewer');
            expect(result).toBe(true);
        });

        test('should deny access when user has no relationship to document', () => {
            const doc = { 
                author: 'other-user-id',
                stakeholders: ['another-user-id'],
                owners: ['yet-another-user-id']
            };
            const result = hasDocumentAccess(doc, userId, 'viewer');
            expect(result).toBe(false);
        });

        test('should handle missing arrays gracefully', () => {
            const doc = { author: 'other-user-id' };
            const result = hasDocumentAccess(doc, userId, 'viewer');
            expect(result).toBe(false);
        });
    });

    describe('buildDocumentFilter', () => {
        test('should build empty filter for no parameters', () => {
            const filter = buildDocumentFilter({});
            expect(filter).toEqual({});
        });

        test('should build search filter with regex', () => {
            const filter = buildDocumentFilter({ search: 'test document' });
            expect(filter.$or).toEqual([
                { title: { $regex: 'test document', $options: 'i' } },
                { description: { $regex: 'test document', $options: 'i' } }
            ]);
        });

        test('should sanitize search input', () => {
            const filter = buildDocumentFilter({ search: 'test.*document' });
            expect(filter.$or[0].title.$regex).toBe('test\\.\\*document');
        });

        test('should ignore empty or invalid search', () => {
            const filter1 = buildDocumentFilter({ search: '' });
            const filter2 = buildDocumentFilter({ search: '   ' });
            const filter3 = buildDocumentFilter({ search: 'a'.repeat(101) });
            
            expect(filter1.$or).toBeUndefined();
            expect(filter2.$or).toBeUndefined();
            expect(filter3.$or).toBeUndefined();
        });

        test('should build category filter', () => {
            const categoryId = '507f1f77bcf86cd799439011';
            const filter = buildDocumentFilter({ category: categoryId });
            expect(filter.category).toEqual(new mongoose.Types.ObjectId(categoryId));
        });

        test('should build author filter', () => {
            const authorId = '507f1f77bcf86cd799439011';
            const filter = buildDocumentFilter({ author: authorId });
            expect(filter.author).toEqual(new mongoose.Types.ObjectId(authorId));
        });

        test('should build date range filter', () => {
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';
            const filter = buildDocumentFilter({ startDate, endDate });
            
            expect(filter.createdAt).toEqual({
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            });
        });

        test('should build review status filters', () => {
            const now = new Date();
            
            // Overdue filter
            const overdueFilter = buildDocumentFilter({ reviewStatus: 'overdue' });
            expect(overdueFilter.reviewDate.$lt).toBeInstanceOf(Date);
            expect(overdueFilter.reviewCompleted).toEqual({ $ne: true });
            
            // Due soon filter
            const dueSoonFilter = buildDocumentFilter({ reviewStatus: 'due-soon' });
            expect(dueSoonFilter.reviewDate.$gte).toBeInstanceOf(Date);
            expect(dueSoonFilter.reviewDate.$lte).toBeInstanceOf(Date);
            
            // Current filter
            const currentFilter = buildDocumentFilter({ reviewStatus: 'current' });
            expect(currentFilter.reviewDate.$gt).toBeInstanceOf(Date);
        });

        test('should combine multiple filters', () => {
            const filter = buildDocumentFilter({
                search: 'test',
                category: '507f1f77bcf86cd799439011',
                author: '507f1f77bcf86cd799439012',
                startDate: '2024-01-01'
            });
            
            expect(filter.$or).toBeDefined();
            expect(filter.category).toBeDefined();
            expect(filter.author).toBeDefined();
            expect(filter.createdAt).toBeDefined();
        });
    });

    describe('buildDocumentSort', () => {
        test('should return default sort for no parameters', () => {
            const sort = buildDocumentSort();
            expect(sort).toEqual({ createdAt: -1 });
        });

        test('should build ascending sort', () => {
            const sort = buildDocumentSort('title', 'asc');
            expect(sort).toEqual({ title: 1 });
        });

        test('should build descending sort', () => {
            const sort = buildDocumentSort('updatedAt', 'desc');
            expect(sort).toEqual({ updatedAt: -1 });
        });

        test('should handle invalid sort field', () => {
            const sort = buildDocumentSort('invalidField', 'asc');
            expect(sort).toEqual({ createdAt: -1 });
        });

        test('should handle invalid sort order', () => {
            const sort = buildDocumentSort('title', 'invalid');
            expect(sort).toEqual({ title: 1 });
        });
    });

    describe('parseDocumentData', () => {
        test('should parse valid document data', () => {
            const data = {
                title: 'Test Document',
                description: 'Test Description',
                author: '507f1f77bcf86cd799439011',
                category: '507f1f77bcf86cd799439012',
                stakeholders: JSON.stringify(['507f1f77bcf86cd799439013']),
                owners: JSON.stringify(['507f1f77bcf86cd799439014']),
                externalContacts: JSON.stringify([{
                    name: 'John Doe',
                    email: 'john@example.com',
                    type: '507f1f77bcf86cd799439015'
                }])
            };

            const parsed = parseDocumentData(data);

            expect(parsed.title).toBe('Test Document');
            expect(parsed.description).toBe('Test Description');
            expect(parsed.stakeholders).toEqual(['507f1f77bcf86cd799439013']);
            expect(parsed.owners).toEqual(['507f1f77bcf86cd799439014']);
            expect(parsed.externalContacts).toHaveLength(1);
            expect(parsed.externalContacts[0].name).toBe('John Doe');
        });

        test('should handle missing optional fields', () => {
            const data = {
                title: 'Test Document',
                author: '507f1f77bcf86cd799439011',
                category: '507f1f77bcf86cd799439012'
            };

            const parsed = parseDocumentData(data);

            expect(parsed.title).toBe('Test Document');
            expect(parsed.stakeholders).toEqual([]);
            expect(parsed.owners).toEqual([]);
            expect(parsed.externalContacts).toEqual([]);
        });

        test('should validate stakeholder IDs', () => {
            const data = {
                title: 'Test Document',
                author: '507f1f77bcf86cd799439011',
                category: '507f1f77bcf86cd799439012',
                stakeholders: JSON.stringify(['invalid-id', '507f1f77bcf86cd799439013'])
            };

            expect(() => parseDocumentData(data)).toThrow('Invalid stakeholders format');
        });

        test('should validate owner IDs', () => {
            const data = {
                title: 'Test Document',
                author: '507f1f77bcf86cd799439011',
                category: '507f1f77bcf86cd799439012',
                owners: JSON.stringify(['invalid-id'])
            };

            expect(() => parseDocumentData(data)).toThrow('Invalid owners format');
        });

        test('should validate external contacts', () => {
            const data = {
                title: 'Test Document',
                author: '507f1f77bcf86cd799439011',
                category: '507f1f77bcf86cd799439012',
                externalContacts: JSON.stringify([{ email: 'test@example.com' }]) // Missing name
            };

            expect(() => parseDocumentData(data)).toThrow('Invalid external contacts format');
        });

        test('should handle malformed JSON', () => {
            const data = {
                title: 'Test Document',
                author: '507f1f77bcf86cd799439011',
                category: '507f1f77bcf86cd799439012',
                stakeholders: 'invalid-json'
            };

            expect(() => parseDocumentData(data)).toThrow('Invalid stakeholders format');
        });
    });

    describe('getDocuments integration', () => {
        test('should call aggregation pipeline with correct parameters', async () => {
            const mockResult = [{
                documents: [{ _id: '1', title: 'Test Doc' }],
                totalCount: [{ count: 1 }]
            }];

            mockDoc.aggregate.mockResolvedValue(mockResult);

            const filters = { search: 'test' };
            const options = { limit: 10, skip: 0, sortBy: 'title', sortOrder: 'asc' };
            const user = { id: '507f1f77bcf86cd799439011', role: 'editor' };

            const result = await getDocuments(filters, options, user);

            expect(mockDoc.aggregate).toHaveBeenCalledWith(expect.any(Array));
            expect(result.documents).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.page).toBe(1);
        });

        test('should handle empty results', async () => {
            const mockResult = [{
                documents: [],
                totalCount: []
            }];

            mockDoc.aggregate.mockResolvedValue(mockResult);

            const result = await getDocuments({}, {}, { id: '1', role: 'admin' });

            expect(result.documents).toEqual([]);
            expect(result.total).toBe(0);
        });

        test('should handle database errors', async () => {
            mockDoc.aggregate.mockRejectedValue(new Error('Database error'));

            await expect(getDocuments({}, {}, { id: '1', role: 'admin' }))
                .rejects.toThrow('Database error');
        });
    });
});
