/*
 * @name Vitest Configuration
 * @file /docman/frontend/vitest.config.js
 * @description Vitest testing configuration for React components and hooks
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Global setup
    globals: true,
    
    // Setup files
    setupFiles: ['./src/__tests__/setup.js'],
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.next',
      'coverage'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.spec.{js,jsx,ts,tsx}',
        'src/main.jsx',
        'src/vite-env.d.ts',
        '**/*.config.{js,ts}',
        'src/stories/',
        '.storybook/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Test timeout
    testTimeout: 10000,
    
    // Hook timeout
    hookTimeout: 10000,
    
    // Retry failed tests
    retry: 2,
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    
    // Output directory for reports
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html'
    },
    
    // Mock configuration
    deps: {
      inline: ['@testing-library/jest-dom']
    },
    
    // Watch configuration
    watch: false,
    
    // Pool options
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  
  // Define global variables
  define: {
    'process.env.NODE_ENV': '"test"',
    'import.meta.env.VITE_API_URL': '"http://localhost:5001/api"'
  },
  
  // Esbuild options
  esbuild: {
    target: 'node14'
  }
});
