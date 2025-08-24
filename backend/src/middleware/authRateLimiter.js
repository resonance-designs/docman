/*
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.dev' });
    console.log("🚀 Development environment detected - Rate limiting will be disabled");
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.prod' });
} else {
    dotenv.config(); // Loads .env by default
}

// Create separate rate limiters for different auth endpoints
const loginRateLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "15 m") // 5 attempts per 15 minutes
});

const registerRateLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 h") // 10 attempts per hour
});

const passwordResetRateLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(3, "1 h") // 3 requests per hour
});

// Middleware functions for each auth endpoint
export async function limitLogin(req, res, next) {
    try {
        // Skip rate limiting in development environment
        if (process.env.NODE_ENV === 'development') {
            console.log("🚀 Development mode: Skipping login rate limiting");
            return next();
        }
        
        // Use IP address as identifier
        const identifier = req.ip || req.connection.remoteAddress;
        const { success } = await loginRateLimiter.limit(`login:${identifier}`);
        
        if (!success) {
            return res.status(429).json({ 
                message: "Too many login attempts, please try again later." 
            });
        }
        
        next();
    } catch (error) {
        console.error("Login rate limiting error:", error);
        next(error);
    }
}

export async function limitRegister(req, res, next) {
    try {
        // Skip rate limiting in development environment
        if (process.env.NODE_ENV === 'development') {
            console.log("🚀 Development mode: Skipping registration rate limiting");
            return next();
        }
        
        // Use IP address as identifier
        const identifier = req.ip || req.connection.remoteAddress;
        const { success } = await registerRateLimiter.limit(`register:${identifier}`);
        
        if (!success) {
            return res.status(429).json({ 
                message: "Too many registration attempts, please try again later." 
            });
        }
        
        next();
    } catch (error) {
        console.error("Registration rate limiting error:", error);
        next(error);
    }
}

export async function limitPasswordReset(req, res, next) {
    try {
        // Skip rate limiting in development environment
        if (process.env.NODE_ENV === 'development') {
            console.log("🚀 Development mode: Skipping password reset rate limiting");
            return next();
        }
        
        // Use IP address as identifier
        const identifier = req.ip || req.connection.remoteAddress;
        const { success } = await passwordResetRateLimiter.limit(`password-reset:${identifier}`);
        
        if (!success) {
            return res.status(429).json({ 
                message: "Too many password reset requests, please try again later." 
            });
        }
        
        next();
    } catch (error) {
        console.error("Password reset rate limiting error:", error);
        next(error);
    }
}

export default {
    limitLogin,
    limitRegister,
    limitPasswordReset
};