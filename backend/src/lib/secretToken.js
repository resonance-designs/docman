/*
 * @name secretToken
 * @file /docman/backend/src/lib/secretToken.js
 * @module secretToken
 * @description JWT token utilities for creating, verifying, and blacklisting authentication tokens
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import BlacklistedToken from "../models/BlacklistedToken.js";

/**
 * Load environment variables based on NODE_ENV
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
 * @type {string}
 */
const TOKEN_KEY = process.env.TOKEN_KEY || "CHANGE_ME";

/**
 * Create a short-lived access token for API authentication
 * @param {string} id - User ID to encode in token
 * @param {string} role - User role to encode in token
 * @returns {string} JWT access token valid for 15 minutes
 */
export function createAccessToken(id, role) {
    return jwt.sign({ id, role }, TOKEN_KEY, { expiresIn: "15m" });
}

/**
 * Create a long-lived refresh token (optional helper, not used by opaque token flow)
 * @param {string} id - User ID to encode in token
 * @param {string} role - User role to encode in token
 * @returns {string} JWT refresh token valid for 7 days
 */
export function createSecretToken(id, role) {
    return jwt.sign({ id, role }, TOKEN_KEY, { expiresIn: "7d" });
}

/**
 * Middleware to verify access token from Authorization header and attach user to req.user
 * Checks for blacklisted tokens and fetches current user data from database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with error message if authentication fails
 */
export async function verifyAccessToken(req, res, next) {
    try {
        const authHeader = req.headers?.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
        if (!token) return res.status(401).json({ message: "No token provided" });

        // Check if token is blacklisted
        const blacklistedToken = await BlacklistedToken.findOne({ token });
        if (blacklistedToken) {
            return res.status(401).json({ message: "Token has been invalidated" });
        }

        const decoded = jwt.verify(token, TOKEN_KEY);
        if (!decoded || !decoded.id) return res.status(401).json({ message: "Invalid token" });

        // Attach minimal user info (id and role). If you need full user object, fetch from DB.
        // Here we fetch role from DB to ensure latest role change is respected.
        const user = await User.findById(decoded.id).select("-password -refreshTokenHash -resetPasswordToken -resetPasswordExpires").lean();
        if (!user) return res.status(401).json({ message: "User not found" });

        req.user = user;
        next();
    } catch (err) {
        console.error("verifyAccessToken error:", err.message || err);
        return res.status(401).json({ message: "Invalid token" });
    }
}

/**
 * Add a token to the blacklist to prevent its future use
 * Decodes the token to get expiration time and stores it in the blacklist collection
 * @param {string} token - JWT token to blacklist
 * @returns {Promise<boolean>} True if token was successfully blacklisted, false on error
 */
export async function blacklistToken(token) {
    try {
        // Decode the token to get its expiration time
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            throw new Error("Invalid token");
        }

        // Create a new blacklisted token entry
        const blacklistedToken = new BlacklistedToken({
            token: token,
            expiresAt: new Date(decoded.exp * 1000) // Convert to milliseconds
        });

        await blacklistedToken.save();
        return true;
    } catch (error) {
        console.error("Error blacklisting token:", error);
        return false;
    }
}
