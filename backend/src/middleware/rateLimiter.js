/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import ratelimit from "../config/upstash.js";

/**
 * Rate limiting middleware using Upstash Redis
 * Limits the number of requests per client to prevent abuse
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with 429 status if rate limit exceeded
 */
const rateLimiter = async (req, res, next) => {
    try {
        const {success} = await ratelimit.limit("my-rate-limit");
        if (!success) {
            return res.status(429).json({ message: "Too many requests, please try again later." });
        }
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error("Rate limiting error:", error);
        next(error); // Pass the error to the next middleware
    }
}

export default rateLimiter;