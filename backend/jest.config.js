/*
 * @name Jest Configuration
 * @file /docman/backend/jest.config.js
 * @description Jest testing configuration for backend services
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */

export default {
  // Test environment
  testEnvironment: 'node',
  
  // Module transformation
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }]
  },
  
  // Module name mapping for ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Coverage configuration (use `npm run test:coverage` to collect)
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!src/__tests__/**',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.js'
  ],
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test'
  },
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    'src'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Reporter configuration (jest-junit / jest-watch-typeahead were referenced but never installed,
  // which made `npm test` fail on every machine)
  reporters: ['default'],
  
  // Maximum worker processes
  maxWorkers: '50%',
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles (enable ad hoc with --detectOpenHandles; it slows every run)
  detectOpenHandles: false
};
