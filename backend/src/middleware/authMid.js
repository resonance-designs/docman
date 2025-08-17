/*
 * @name authMid
 * @file /docman/backend/src/middleware/authMid.js
 * @middleware authMid
 * @description JWT authentication middleware for verifying Bearer tokens and protecting routes
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

/**
 * Load environment variables based on NODE_ENV
 * Supports development, production, and default configurations
 */
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.dev' });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.prod' });
} else {
    dotenv.config(); // Loads .env by default
}

/**
 * JWT token secret key from environment variables
 * Supports multiple environment variable names for compatibility
 * @type {string}
 */
const TOKEN_KEY = process.env.JWT_SECRET || process.env.TOKEN_KEY || "docman-dev-secret-key-2024";

// Log warning if using default token
if (TOKEN_KEY === "docman-dev-secret-key-2024") {
    console.warn("⚠️  WARNING: Using default JWT secret. Set JWT_SECRET or TOKEN_KEY environment variable for security!");
}

/**
 * Authentication middleware to verify JWT tokens
 * Extracts and validates Bearer tokens from Authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with error message if authentication fails
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, TOKEN_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({ message: "Invalid token." });
    }
};

export default authMiddleware;