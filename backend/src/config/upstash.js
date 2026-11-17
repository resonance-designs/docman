/*
 * @name upstash (rate limiter)
 * @file /docman/backend/src/config/upstash.js
 * @description General API rate limiter. Kept at this path for backward compatibility; the backing store is now
 *              chosen by config/redis.js (Upstash, self-hosted Redis, or in-memory).
 *              Default: 100 requests per 60 seconds per client key. Override with RATE_LIMIT_GENERAL="100/60s".
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import { createRateLimiter } from "./redis.js";

/** Parse "N/window" strings such as "100/60s" or "5/15m". */
export function parseLimitSpec(spec, fallbackLimit, fallbackWindow) {
    const match = String(spec || "").trim().match(/^(\d+)\s*\/\s*(\d+\s*(?:ms|s|m|h|d)?)$/i);
    if (!match) return { limit: fallbackLimit, window: fallbackWindow };
    return { limit: Number(match[1]), window: match[2].replace(/\s+/g, "") };
}

const general = parseLimitSpec(process.env.RATE_LIMIT_GENERAL, 100, "60 s");

const ratelimit = createRateLimiter(general.limit, general.window);

export default ratelimit;