/*
 * @name secretToken
 * @file /docman/backend/src/lib/secretToken.js
 * @module secretToken
 * @description JWT token utilities for creating, verifying, and blacklisting authentication tokens
 * @author Richard Bakos
 * @version 2.2.5
 * @license UNLICENSED
 */
import jwt from "jsonwebtoken";
import BlacklistedToken from "../models/BlacklistedToken.js";
import { TOKEN_KEY } from "./jwtSecret.js";
import { extractBearerToken, resolveRequestIdentity } from "../services/identityService.js";

/**
 * Create an access token for API authentication
 * @param {string} id - User ID to encode in token
 * @param {string} role - User role to encode in token
 * @returns {string} JWT access token valid for 5 days
 */
export function createAccessToken(id, role) {
    // Use 5 days for token expiration
    const token = jwt.sign({ id, role }, TOKEN_KEY, { expiresIn: "5d" });
    console.log("🔑 Created token for user:", id, "with role:", role);

    // Decode to check expiration
    const decoded = jwt.decode(token);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;
    const days = Math.floor(expiresIn / (60 * 60 * 24));
    const hours = Math.floor((expiresIn % (60 * 60 * 24)) / (60 * 60));
    console.log(`🔑 Token expires in: ${expiresIn} seconds (${days} days and ${hours} hours)`);
    console.log("🔑 Current server time:", new Date().toISOString());
    console.log("🔑 Token expiry time:", new Date(decoded.exp * 1000).toISOString());

    return token;
}

/**
 * Create a long-lived refresh token (optional helper, not used by opaque token flow)
 * @param {string} id - User ID to encode in token
 * @param {string} role - User role to encode in token
 * @returns {string} JWT refresh token valid for 5 days
 */
export function createSecretToken(id, role) {
    return jwt.sign({ id, role }, TOKEN_KEY, { expiresIn: "5d" });
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
        const token = extractBearerToken(req);

        console.log("🔒 verifyAccessToken: Processing request to:", req.url);
        console.log("🔒 verifyAccessToken: Auth header:", req.headers?.authorization ? "present" : "missing");
        console.log("🔒 verifyAccessToken: Token:", token ? token.substring(0, 20) + "..." : "none");

        if (!token) {
            console.log("🔒 No token provided in request");
            return res.status(401).json({ message: "No token provided" });
        }

        const decodedWithoutVerify = jwt.decode(token);
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decodedWithoutVerify?.exp - now;
        console.log("🔒 verifyAccessToken: Token expiry check:", {
            tokenExp: decodedWithoutVerify?.exp,
            currentTime: now,
            timeUntilExpiry: timeUntilExpiry,
            expired: timeUntilExpiry <= 0
        });

        const identity = await resolveRequestIdentity(req);
        req.user = identity.user;
        req.identity = identity;
        console.log("🔒 verifyAccessToken: Identity resolved via:", identity.authType);
        console.log("🔒 verifyAccessToken: Success! User attached to request:", identity.user.email);
        next();
    } catch (err) {
        console.error("🔒 verifyAccessToken error:", err.message || err);
        console.error("🔒 Token verification failed. TOKEN_KEY length:", TOKEN_KEY.length);
        return res.status(err.statusCode || 401).json({ message: err.message || "Invalid token" });
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
