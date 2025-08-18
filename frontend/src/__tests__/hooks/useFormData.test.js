/*
 * @name useFormData Tests
 * @file /docman/frontend/src/__tests__/hooks/useFormData.test.js
 * @description Unit tests for useFormData custom hook
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useFormData } from '../../hooks/useFormData';
import api from '../../lib/axios';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../lib/axios');
vi.mock('react-hot-toast');

describe('useFormData', () => {
    const mockUsers = [
        { _id: '1', firstname: 'John', lastname: 'Doe', email: 'john@example.com' },
        { _id: '2', firstname: 'Jane', lastname: 'Smith', email: 'jane@example.com' }
    ];

    const mockCategories = [
        { _id: '1', name: 'Technical Documentation' },
        { _id: '2', name: 'Business Requirements' }
    ];

    const mockExternalContactTypes = [
        { _id: '1', name: 'Client' },
        { _id: '2', name: 'Vendor' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup default successful API responses
        api.get.mockImplementation((url) => {
            switch (url) {
                case '/users':
                    return Promise.resolve({ data: mockUsers });
                case '/categories':
                    return Promise.resolve({ data: mockCategories });
                case '/external-contacts/types':
                    return Promise.resolve({ data: mockExternalContactTypes });
                default:
                    return Promise.reject(new Error('Unknown endpoint'));
            }
        });
    });

    describe('default behavior', () => {
        test('should load all data by default', async () => {
            const { result } = renderHook(() => useFormData());

            // Initially loading
            expect(result.current.loading).toBe(true);
            expect(result.current.users).toEqual([]);
            expect(result.current.categories).toEqual([]);
            expect(result.current.externalContactTypes).toEqual([]);

            // Wait for data to load
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.users).toEqual(mockUsers);
            expect(result.current.categories).toEqual(mockCategories);
            expect(result.current.externalContactTypes).toEqual(mockExternalContactTypes);
            expect(result.current.error).toBeNull();

            // Verify all API calls were made
            expect(api.get).toHaveBeenCalledWith('/users');
            expect(api.get).toHaveBeenCalledWith('/categories');
            expect(api.get).toHaveBeenCalledWith('/external-contact-types');
        });

        test('should show error toast by default on failure', async () => {
            api.get.mockRejectedValue(new Error('API Error'));

            const { result } = renderHook(() => useFormData());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBeInstanceOf(Error);
            expect(toast.error).toHaveBeenCalledWith('Failed to load form data');
        });
    });

    describe('selective data loading', () => {
        test('should load only users when specified', async () => {
            const { result } = renderHook(() => 
                useFormData({
                    loadUsers: true,
                    loadCategories: false,
                    loadExternalContactTypes: false
                })
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.users).toEqual(mockUsers);
            expect(result.current.categories).toEqual([]);
            expect(result.current.externalContactTypes).toEqual([]);

            expect(api.get).toHaveBeenCalledWith('/users');
            expect(api.get).not.toHaveBeenCalledWith('/categories');
            expect(api.get).not.toHaveBeenCalledWith('/external-contact-types');
        });

        test('should load only categories when specified', async () => {
            const { result } = renderHook(() => 
                useFormData({
                    loadUsers: false,
                    loadCategories: true,
                    loadExternalContactTypes: false
                })
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.users).toEqual([]);
            expect(result.current.categories).toEqual(mockCategories);
            expect(result.current.externalContactTypes).toEqual([]);

            expect(api.get).not.toHaveBeenCalledWith('/users');
            expect(api.get).toHaveBeenCalledWith('/categories');
            expect(api.get).not.toHaveBeenCalledWith('/external-contacts/types');
        });

        test('should load only external contact types when specified', async () => {
            const { result } = renderHook(() => 
                useFormData({
                    loadUsers: false,
                    loadCategories: false,
                    loadExternalContactTypes: true
                })
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.users).toEqual([]);
            expect(result.current.categories).toEqual([]);
            expect(result.current.externalContactTypes).toEqual(mockExternalContactTypes);

            expect(api.get).not.toHaveBeenCalledWith('/users');
            expect(api.get).not.toHaveBeenCalledWith('/categories');
            expect(api.get).toHaveBeenCalledWith('/external-contacts/types');
        });

        test('should not make any API calls when all loading options are false', async () => {
            const { result } = renderHook(() => 
                useFormData({
                    loadUsers: false,
                    loadCategories: false,
                    loadExternalContactTypes: false
                })
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(api.get).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        test('should not show error toast when disabled', async () => {
            api.get.mockRejectedValue(new Error('API Error'));

            const { result } = renderHook(() => 
                useFormData({ showErrorToast: false })
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBeInstanceOf(Error);
            expect(toast.error).not.toHaveBeenCalled();
        });

        test('should handle partial failures gracefully', async () => {
            api.get.mockImplementation((url) => {
                switch (url) {
                    case '/users':
                        return Promise.resolve({ data: mockUsers });
                    case '/categories':
                        return Promise.reject(new Error('Categories API Error'));
                    case '/external-contacts/types':
                        return Promise.resolve({ data: mockExternalContactTypes });
                    default:
                        return Promise.reject(new Error('Unknown endpoint'));
                }
            });

            const { result } = renderHook(() => useFormData());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBeInstanceOf(Error);
            expect(toast.error).toHaveBeenCalledWith('Failed to load form data');
        });
    });

    describe('helper functions', () => {
        test('getFullName should format user names correctly', async () => {
            const { result } = renderHook(() => useFormData());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Test with user object
            const user = mockUsers[0];
            expect(result.current.getFullName(user)).toBe('John Doe');

            // Test with user ID
            expect(result.current.getFullName('1')).toBe('John Doe');

            // Test with unknown ID
            expect(result.current.getFullName('unknown')).toBe('unknown');

            // Test with null/undefined
            expect(result.current.getFullName(null)).toBe('Unknown');
            expect(result.current.getFullName(undefined)).toBe('Unknown');

            // Test with user missing names
            expect(result.current.getFullName({ _id: '3' })).toBe('Unknown');
        });

        test('getCategoryName should return category names correctly', async () => {
            const { result } = renderHook(() => useFormData());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Test with category object
            const category = mockCategories[0];
            expect(result.current.getCategoryName(category)).toBe('Technical Documentation');

            // Test with category ID
            expect(result.current.getCategoryName('1')).toBe('Technical Documentation');

            // Test with unknown ID
            expect(result.current.getCategoryName('unknown')).toBe('unknown');

            // Test with null/undefined
            expect(result.current.getCategoryName(null)).toBe('Unknown');
            expect(result.current.getCategoryName(undefined)).toBe('Unknown');
        });

        test('getContactTypeName should return contact type names correctly', async () => {
            const { result } = renderHook(() => useFormData());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Test with contact type object
            const contactType = mockExternalContactTypes[0];
            expect(result.current.getContactTypeName(contactType)).toBe('Client');

            // Test with contact type ID
            expect(result.current.getContactTypeName('1')).toBe('Client');

            // Test with unknown ID
            expect(result.current.getContactTypeName('unknown')).toBe('unknown');

            // Test with null/undefined
            expect(result.current.getContactTypeName(null)).toBe('Unknown');
            expect(result.current.getContactTypeName(undefined)).toBe('Unknown');
        });
    });

    describe('reload functionality', () => {
        test('should provide reload function', async () => {
            const { result } = renderHook(() => useFormData());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(typeof result.current.reload).toBe('function');
        });
    });

    describe('edge cases', () => {
        test('should handle empty API responses', async () => {
            api.get.mockImplementation(() => Promise.resolve({ data: null }));

            const { result } = renderHook(() => useFormData());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.users).toEqual([]);
            expect(result.current.categories).toEqual([]);
            expect(result.current.externalContactTypes).toEqual([]);
        });

        test('should handle API responses without data property', async () => {
            api.get.mockImplementation(() => Promise.resolve({}));

            const { result } = renderHook(() => useFormData());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.users).toEqual([]);
            expect(result.current.categories).toEqual([]);
            expect(result.current.externalContactTypes).toEqual([]);
        });
    });
});
