/*
 * @name Frontend Test Setup
 * @file /docman/frontend/src/__tests__/setup.js
 * @description Global test setup and configuration for React components
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://localhost:5001/api',
    MODE: 'test',
    DEV: false,
    PROD: false,
    SSR: false
  },
  writable: true
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

// Mock File and FileReader
global.File = class MockFile {
  constructor(parts, filename, properties) {
    this.parts = parts;
    this.name = filename;
    this.size = parts.reduce((acc, part) => acc + part.length, 0);
    this.type = properties?.type || '';
    this.lastModified = Date.now();
  }
};

global.FileReader = class MockFileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
    this.onloadstart = null;
    this.onloadend = null;
    this.onprogress = null;
  }

  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = `data:${file.type};base64,mock-base64-data`;
      if (this.onload) this.onload({ target: this });
    }, 0);
  }

  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'mock file content';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }

  abort() {
    this.readyState = 2;
    if (this.onabort) this.onabort({ target: this });
  }
};

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      pathname: '/test',
      search: '',
      hash: '',
      state: null,
      key: 'test'
    }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock axios
vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}));

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  BarElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
}));

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Bar: vi.fn(() => null),
  Line: vi.fn(() => null),
  Pie: vi.fn(() => null),
  Doughnut: vi.fn(() => null),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const MockIcon = ({ size, className, ...props }) => 
    React.createElement('svg', { 
      'data-testid': 'mock-icon',
      width: size || 24,
      height: size || 24,
      className,
      ...props
    });

  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return MockIcon;
      }
      return target[prop];
    }
  });
});

// Helper functions for tests
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

global.createMockDocument = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439012',
  title: 'Test Document',
  description: 'Test Description',
  author: {
    _id: '507f1f77bcf86cd799439011',
    firstname: 'Test',
    lastname: 'User'
  },
  category: {
    _id: '507f1f77bcf86cd799439013',
    name: 'Test Category'
  },
  stakeholders: [],
  owners: [],
  reviewDate: new Date().toISOString(),
  reviewCompleted: false,
  currentVersion: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

global.createMockFile = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439014',
  filename: 'test-file.pdf',
  originalname: 'test.pdf',
  path: '/uploads/test-file.pdf',
  mimetype: 'application/pdf',
  size: 1024,
  documentId: '507f1f77bcf86cd799439012',
  version: 1,
  uploadedAt: new Date().toISOString(),
  uploadedBy: '507f1f77bcf86cd799439011',
  ...overrides
});

// Mock form data for testing
global.createMockFormData = () => {
  const formData = new Map();
  return {
    append: vi.fn((key, value) => formData.set(key, value)),
    get: vi.fn((key) => formData.get(key)),
    getAll: vi.fn((key) => [formData.get(key)].filter(Boolean)),
    has: vi.fn((key) => formData.has(key)),
    set: vi.fn((key, value) => formData.set(key, value)),
    delete: vi.fn((key) => formData.delete(key)),
    entries: vi.fn(() => formData.entries()),
    keys: vi.fn(() => formData.keys()),
    values: vi.fn(() => formData.values()),
    forEach: vi.fn((callback) => formData.forEach(callback)),
  };
};

// Mock event objects
global.createMockEvent = (overrides = {}) => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  target: {
    value: '',
    name: '',
    checked: false,
    files: [],
    ...overrides.target
  },
  currentTarget: {
    value: '',
    name: '',
    checked: false,
    files: [],
    ...overrides.currentTarget
  },
  ...overrides
});

// Async testing helpers
global.waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

global.flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Console suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Suppress React warnings in tests unless explicitly needed
  console.error = vi.fn((message) => {
    if (
      typeof message === 'string' &&
      (message.includes('Warning:') || message.includes('React'))
    ) {
      return;
    }
    originalConsoleError(message);
  });
  
  console.warn = vi.fn((message) => {
    if (typeof message === 'string' && message.includes('Warning:')) {
      return;
    }
    originalConsoleWarn(message);
  });
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
