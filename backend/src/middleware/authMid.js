/*
 * @name authMid
 * @file /docman/backend/src/middleware/authMid.js
 * @middleware authMid
 * @description JWT authentication middleware for verifying Bearer tokens and protecting routes
 * @author Richard Bakos
 * @version 2.2.4
 * @license UNLICENSED
 */
import jwt from "jsonwebtoken";
import { TOKEN_KEY } from "../lib/jwtSecret.js";

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
