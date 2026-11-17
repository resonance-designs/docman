/*
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import { createRateLimiter } from "../config/redis.js";
import { parseLimitSpec } from "../config/upstash.js";

if (process.env.NODE_ENV === 'development') {
    console.log("🚀 Development environment detected - Rate limiting will be disabled");
}

// Separate rate limiters for auth endpoints. Keys are per client IP, so if many staff share one public IP
// (office NAT), raise these with RATE_LIMIT_LOGIN / RATE_LIMIT_REGISTER / RATE_LIMIT_PASSWORD_RESET.
const loginSpec = parseLimitSpec(process.env.RATE_LIMIT_LOGIN, 5, "15m");
const registerSpec = parseLimitSpec(process.env.RATE_LIMIT_REGISTER, 10, "1h");
const resetSpec = parseLimitSpec(process.env.RATE_LIMIT_PASSWORD_RESET, 3, "1h");

const loginRateLimiter = createRateLimiter(loginSpec.limit, loginSpec.window);
const registerRateLimiter = createRateLimiter(registerSpec.limit, registerSpec.window);
const passwordResetRateLimiter = createRateLimiter(resetSpec.limit, resetSpec.window);

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