/*
 * @name Test Setup
 * @file /docman/backend/src/__tests__/setup.js
 * @description Global test setup and configuration
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Global test setup
beforeAll(async () => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  
  // Setup test database connection if needed
  if (process.env.TEST_DATABASE_URL) {
    await mongoose.connect(process.env.TEST_DATABASE_URL);
  }
});

// Global test cleanup
afterAll(async () => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  
  // Close database connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  // Clear all timers
  jest.clearAllTimers();
});

// Reset between tests
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset modules
  jest.resetModules();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock external dependencies that shouldn't be called during tests
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }))
}));

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true)
}));

// Mock multer for file uploads
jest.mock('multer', () => {
  const multer = jest.fn(() => ({
    single: jest.fn(() => (req, res, next) => {
      req.file = {
        filename: 'test-file.pdf',
        originalname: 'test.pdf',
        path: '/uploads/test-file.pdf',
        mimetype: 'application/pdf',
        size: 1024
      };
      next();
    }),
    array: jest.fn(() => (req, res, next) => {
      req.files = [{
        filename: 'test-file.pdf',
        originalname: 'test.pdf',
        path: '/uploads/test-file.pdf',
        mimetype: 'application/pdf',
        size: 1024
      }];
      next();
    })
  }));
  
  multer.diskStorage = jest.fn();
  multer.memoryStorage = jest.fn();
  
  return multer;
});

// Helper functions for tests
global.createMockRequest = (overrides = {}) => ({
  method: 'GET',
  url: '/test',
  headers: {},
  query: {},
  params: {},
  body: {},
  user: null,
  ...overrides
});

global.createMockResponse = (overrides = {}) => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    ...overrides
  };
  return res;
};

global.createMockNext = () => jest.fn();

// Mock user for authentication tests
global.createMockUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  firstname: 'Test',
  lastname: 'User',
  email: 'test@example.com',
  username: 'testuser',
  role: 'editor',
  isActive: true,
  ...overrides
});

// Mock document for document tests
global.createMockDocument = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439012',
  title: 'Test Document',
  description: 'Test Description',
  author: '507f1f77bcf86cd799439011',
  category: '507f1f77bcf86cd799439013',
  stakeholders: [],
  owners: [],
  reviewDate: new Date(),
  reviewCompleted: false,
  currentVersion: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Mock JWT tokens
global.createMockTokens = () => ({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token'
});

// Database test helpers
global.clearDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

global.closeDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

// Async test helpers
global.waitFor = (condition, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
};

// Performance testing helpers
global.measurePerformance = async (fn) => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds
  
  return {
    result,
    duration
  };
};
