/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
// backend/src/lib/globalUtils.js
// Universal helper and debugging functions for backend

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEBUG_ENABLED = process.env.DEBUG === 'true' || false;
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true' || false;
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs/app.log');

// Ensure logs directory exists
if (LOG_TO_FILE) {
  const logDir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level from environment or default to INFO
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} data - Additional data to log
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, data = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (data !== null) {
    logMessage += ` | Data: ${JSON.stringify(data)}`;
  }
  
  return logMessage;
}

/**
 * Write log message to file
 * @param {string} message - Formatted log message
 */
function writeToFile(message) {
  if (!LOG_TO_FILE) return;
  
  try {
    fs.appendFileSync(LOG_FILE_PATH, message + '\n', 'utf8');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Main logging function
 * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
 * @param {string} message - Log message
 * @param {any} data - Additional data to log
 */
function log(level, message, data = null) {
  // Check if logging is enabled and if the log level is sufficient
  const levelValue = LOG_LEVELS[level];
  if (!DEBUG_ENABLED || levelValue > CURRENT_LOG_LEVEL) {
    return;
  }
  
  const formattedMessage = formatLogMessage(level, message, data);
  
  // Log to console
  switch (level) {
    case 'ERROR':
      console.error(formattedMessage);
      break;
    case 'WARN':
      console.warn(formattedMessage);
      break;
    case 'INFO':
      console.info(formattedMessage);
      break;
    case 'DEBUG':
      console.debug(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
  
  // Log to file
  writeToFile(formattedMessage);
  
  // TODO: Add database logging if needed
  // This would require a database connection and a logs table
}

/**
 * Log an error message
 * @param {string} message - Error message
 * @param {any} data - Additional data to log
 */
export function logError(message, data = null) {
  log('ERROR', message, data);
}

/**
 * Log a warning message
 * @param {string} message - Warning message
 * @param {any} data - Additional data to log
 */
export function logWarn(message, data = null) {
  log('WARN', message, data);
}

/**
 * Log an info message
 * @param {string} message - Info message
 * @param {any} data - Additional data to log
 */
export function logInfo(message, data = null) {
  log('INFO', message, data);
}

/**
 * Log a debug message
 * @param {string} message - Debug message
 * @param {any} data - Additional data to log
 */
export function logDebug(message, data = null) {
  log('DEBUG', message, data);
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if value is empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Check if a value is not empty
 * @param {any} value - Value to check
 * @returns {boolean} True if value is not empty
 */
export function isNotEmpty(value) {
  return !isEmpty(value);
}

/**
 * Generate a random string
 * @param {number} length - Length of the random string
 * @returns {string} Random string
 */
export function generateRandomString(length = 10) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Format a date to a readable string
 * @param {Date} date - Date to format
 * @param {string} format - Format string (YYYY-MM-DD, MM/DD/YYYY, etc.)
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    default:
      return date.toISOString();
  }
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  
  return obj;
}

/**
 * Debounce function to limit the rate at which a function is executed
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function to limit the rate at which a function is executed
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Sleep function to pause execution for a specified time
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone number is valid
 */
export function validatePhone(phone) {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Capitalize the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalizeFirstLetter(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to kebab-case
 * @param {string} str - String to convert
 * @returns {string} Kebab-case string
 */
export function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/**
 * Convert a string to camelCase
 * @param {string} str - String to convert
 * @returns {string} CamelCase string
 */
export function toCamelCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Check if two objects are equal
 * @param {any} obj1 - First object
 * @param {any} obj2 - Second object
 * @returns {boolean} True if objects are equal
 */
export function isEqual(obj1, obj2) {
  if (obj1 === obj2) {
    return true;
  }
  
  if (obj1 == null || obj2 == null) {
    return false;
  }
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) {
    return false;
  }
  
  for (const key of keys1) {
    if (!keys2.includes(key) || !isEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  
  return true;
}

// Export all functions as default
export default {
  logError,
  logWarn,
  logInfo,
  logDebug,
  isEmpty,
  isNotEmpty,
  generateRandomString,
  formatDate,
  deepClone,
  debounce,
  throttle,
  sleep,
  validateEmail,
  validatePhone,
  capitalizeFirstLetter,
  toKebabCase,
  toCamelCase,
  generateId,
  isEqual
};