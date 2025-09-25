/*
 * @name errorHandler
 * @file /docman/backend/src/lib/errorHandler.js
 * @module errorHandler
 * @description Standardized error handling and logging utilities for consistent error management
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import fs from 'fs';
import path from 'path';

/**
 * Error types for categorization
 */
export const ErrorTypes = {
    VALIDATION: 'VALIDATION',
    AUTHENTICATION: 'AUTHENTICATION',
    AUTHORIZATION: 'AUTHORIZATION',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMIT: 'RATE_LIMIT',
    SERVER: 'SERVER',
    DATABASE: 'DATABASE',
    EXTERNAL: 'EXTERNAL'
};

/**
 * HTTP status codes mapping
 */
export const StatusCodes = {
    [ErrorTypes.VALIDATION]: 400,
    [ErrorTypes.AUTHENTICATION]: 401,
    [ErrorTypes.AUTHORIZATION]: 403,
    [ErrorTypes.NOT_FOUND]: 404,
    [ErrorTypes.CONFLICT]: 409,
    [ErrorTypes.RATE_LIMIT]: 429,
    [ErrorTypes.SERVER]: 500,
    [ErrorTypes.DATABASE]: 500,
    [ErrorTypes.EXTERNAL]: 502
};

/**
 * Custom application error class
 */
export class AppError extends Error {
    constructor(message, type = ErrorTypes.SERVER, statusCode = null, details = null) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.statusCode = statusCode || StatusCodes[type];
        this.details = details;
        this.timestamp = new Date().toISOString();
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Log error to file and console
 * @param {string} operation - Operation that failed
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export function logError(operation, error, context = {}) {
    const timestamp = new Date().toISOString();
    const errorInfo = {
        timestamp,
        operation,
        message: error.message,
        stack: error.stack,
        type: error.type || 'UNKNOWN',
        context,
        ...(error.details && { details: error.details })
    };

    // Console logging with colors
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
        console.error('\x1b[31m%s\x1b[0m', `[ERROR] ${operation}:`, error.message);
        if (context && Object.keys(context).length > 0) {
            console.error('\x1b[33m%s\x1b[0m', 'Context:', context);
        }
    }

    // File logging
    try {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logFile = path.join(logDir, `error-${new Date().toISOString().split('T')[0]}.log`);
        const logEntry = JSON.stringify(errorInfo) + '\n';
        
        fs.appendFileSync(logFile, logEntry);
    } catch (logError) {
        console.error('Failed to write error log:', logError.message);
    }
}

/**
 * Sanitize error message for client response
 * @param {Error} error - Error object
 * @param {string} fallbackMessage - Fallback message for production
 * @returns {string} Sanitized error message
 */
export function sanitizeErrorMessage(error, fallbackMessage = 'An error occurred') {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In production, don't expose internal error details
    if (isProduction && !(error instanceof AppError)) {
        return fallbackMessage;
    }

    // For operational errors, return the message
    if (error instanceof AppError || error.isOperational) {
        return error.message;
    }

    // For development, return the actual error message
    if (!isProduction) {
        return error.message;
    }

    return fallbackMessage;
}

/**
 * Create standardized error response
 * @param {Error} error - Error object
 * @param {string} operation - Operation that failed
 * @param {Object} context - Additional context
 * @returns {Object} Error response object
 */
export function createErrorResponse(error, operation, context = {}) {
    const timestamp = new Date().toISOString();
    const isProduction = process.env.NODE_ENV === 'production';

    // Log the error
    logError(operation, error, context);

    // Determine status code
    let statusCode = 500;
    if (error instanceof AppError) {
        statusCode = error.statusCode;
    } else if (error.name === 'ValidationError') {
        statusCode = 400;
    } else if (error.name === 'CastError') {
        statusCode = 400;
    } else if (error.code === 11000) { // MongoDB duplicate key
        statusCode = 409;
    }

    // Create response
    const response = {
        success: false,
        message: sanitizeErrorMessage(error, 'An error occurred'),
        timestamp,
        ...(error instanceof AppError && error.type && { type: error.type })
    };

    // Add details in development or for operational errors
    if (!isProduction || (error instanceof AppError && error.details)) {
        response.details = error.details;
    }

    // Add error code for client handling
    if (error instanceof AppError && error.type) {
        response.code = error.type;
    }

    return { statusCode, response };
}

/**
 * Express error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function errorHandlerMiddleware(error, req, res, next) {
    const operation = `${req.method} ${req.path}`;
    const context = {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    };

    const { statusCode, response } = createErrorResponse(error, operation, context);
    
    res.status(statusCode).json(response);
}

/**
 * Async wrapper for route handlers to catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Create specific error types
 */
export const createValidationError = (message, details = null) => 
    new AppError(message, ErrorTypes.VALIDATION, 400, details);

export const createAuthenticationError = (message = 'Authentication required') => 
    new AppError(message, ErrorTypes.AUTHENTICATION, 401);

export const createAuthorizationError = (message = 'Access denied') => 
    new AppError(message, ErrorTypes.AUTHORIZATION, 403);

export const createNotFoundError = (resource = 'Resource') => 
    new AppError(`${resource} not found`, ErrorTypes.NOT_FOUND, 404);

export const createConflictError = (message) => 
    new AppError(message, ErrorTypes.CONFLICT, 409);

export const createRateLimitError = (message = 'Rate limit exceeded') => 
    new AppError(message, ErrorTypes.RATE_LIMIT, 429);

export const createDatabaseError = (message = 'Database operation failed') => 
    new AppError(message, ErrorTypes.DATABASE, 500);

/**
 * Validation error formatter
 * @param {Array} validationErrors - Array of validation errors
 * @returns {AppError} Formatted validation error
 */
export function formatValidationErrors(validationErrors) {
    if (!Array.isArray(validationErrors) || validationErrors.length === 0) {
        return createValidationError('Validation failed');
    }

    const errorMessages = validationErrors.map(error => {
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        if (error.field && error.error) return `${error.field}: ${error.error}`;
        return 'Invalid input';
    });

    const details = validationErrors.reduce((acc, error) => {
        if (error.field) {
            acc[error.field] = error.message || error.error || 'Invalid input';
        }
        return acc;
    }, {});

    return createValidationError(
        `Validation failed: ${errorMessages.join(', ')}`,
        Object.keys(details).length > 0 ? details : null
    );
}

/**
 * Database error handler
 * @param {Error} error - Database error
 * @returns {AppError} Formatted database error
 */
export function handleDatabaseError(error) {
    // MongoDB duplicate key error
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        return createConflictError(`${field} already exists`);
    }

    // MongoDB validation error
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return createValidationError(`Validation failed: ${errors.join(', ')}`);
    }

    // MongoDB cast error (invalid ObjectId)
    if (error.name === 'CastError') {
        return createValidationError(`Invalid ${error.path} format`);
    }

    // Generic database error
    return createDatabaseError('Database operation failed');
}

/**
 * Service layer error wrapper
 * @param {Function} serviceFunction - Service function to wrap
 * @param {string} operation - Operation name for logging
 * @returns {Function} Wrapped service function
 */
export function wrapServiceError(serviceFunction, operation) {
    return async (...args) => {
        try {
            return await serviceFunction(...args);
        } catch (error) {
            // If it's already an AppError, re-throw it
            if (error instanceof AppError) {
                throw error;
            }

            // Handle database errors
            if (error.name === 'MongoError' || error.name === 'ValidationError' || error.name === 'CastError') {
                throw handleDatabaseError(error);
            }

            // Log and wrap unexpected errors
            logError(operation, error);
            throw new AppError(
                sanitizeErrorMessage(error, `${operation} failed`),
                ErrorTypes.SERVER,
                500
            );
        }
    };
}
