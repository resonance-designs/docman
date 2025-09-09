/*
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import {Ratelimit} from "@upstash/ratelimit";
import {Redis} from "@upstash/redis";
import dotenv from "dotenv";

/**
 * Load environment configuration based on NODE_ENV
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
 * Upstash Redis-based rate limiter configuration
 * Uses sliding window algorithm to limit requests per time period
 * Automatically connects to Upstash Redis using environment variables:
 * - UPSTASH_REDIS_REST_URL: Redis REST API URL
 * - UPSTASH_REDIS_REST_TOKEN: Redis authentication token
 *
 * Current configuration: 100 requests per 60 seconds sliding window
 * @type {Ratelimit}
 */
const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(), // Automatically uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from environment variables
    limiter: Ratelimit.slidingWindow(100, "60 s") // 100 requests every 60 seconds
});

export default ratelimit;