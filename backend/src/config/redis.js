/*
 * @name redis
 * @file /docman/backend/src/config/redis.js
 * @description Pluggable Redis provider for rate limiting.
 *
 *  Providers
 *   - "upstash": Upstash serverless Redis over HTTPS (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *   - "local":   Self-hosted Redis on your own server (REDIS_URL, e.g. redis://:password@127.0.0.1:6379/0)
 *   - "memory":  In-process fallback for development or a single-instance deployment without Redis
 *
 *  Which provider is active (highest priority first)
 *   1. The runtime choice a superadmin saved in System Settings (stored in MongoDB, survives restarts)
 *   2. REDIS_PROVIDER in the environment
 *   3. Auto: upstash if its credentials exist, else local if REDIS_URL exists, else memory
 *
 *  Only providers whose credentials are configured can be selected. Switching tests the connection first.
 *  If the active provider fails at runtime, requests fall back to the in-memory limiter (logged and shown
 *  in the status endpoint) instead of being blocked or let through unlimited.
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import dotenv from "dotenv";
import crypto from "crypto";
import RespClient from "../lib/redisRespClient.js";

if (process.env.NODE_ENV === "development") {
    dotenv.config({ path: ".env.dev" });
} else if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env.prod" });
} else {
    dotenv.config();
}

export const PROVIDERS = Object.freeze(["upstash", "local", "memory"]);
export const SETTING_KEY = "redis.provider";

const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || "docman:ratelimit:";

const state = {
    runtimeChoice: null, // set from SystemSetting
    runtimeChoiceUpdatedAt: null,
    runtimeChoiceUpdatedBy: null,
    lastError: null,
    lastErrorAt: null,
    fallbackCount: 0,
};

let localClient = null;
let localClientUrl = null;
let upstashModules = null;
let upstashRedis = null;
const upstashLimiters = new Map();
const memoryBuckets = new Map();

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

function localRedisUrl() {
    if (process.env.REDIS_URL) return process.env.REDIS_URL;
    if (process.env.REDIS_HOST) {
        const auth = process.env.REDIS_PASSWORD
            ? `${encodeURIComponent(process.env.REDIS_USERNAME || "")}:${encodeURIComponent(process.env.REDIS_PASSWORD)}@`
            : "";
        const scheme = String(process.env.REDIS_TLS || "").toLowerCase() === "true" ? "rediss" : "redis";
        return `${scheme}://${auth}${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}/${process.env.REDIS_DB || 0}`;
    }
    return null;
}

export function isProviderConfigured(provider) {
    switch (provider) {
        case "upstash":
            return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
        case "local":
            return Boolean(localRedisUrl());
        case "memory":
            return true;
        default:
            return false;
    }
}

export function getEnvProvider() {
    const configured = String(process.env.REDIS_PROVIDER || "").trim().toLowerCase();
    if (PROVIDERS.includes(configured)) return configured;
    if (isProviderConfigured("upstash")) return "upstash";
    if (isProviderConfigured("local")) return "local";
    return "memory";
}

export function getActiveProvider() {
    if (state.runtimeChoice && isProviderConfigured(state.runtimeChoice)) return state.runtimeChoice;
    const envProvider = getEnvProvider();
    return isProviderConfigured(envProvider) ? envProvider : "memory";
}

/** Parse "60 s", "15m", "1 h", "1d", or a number of seconds into milliseconds. */
export function parseWindow(window) {
    if (typeof window === "number") return window * 1000;
    const match = String(window).trim().match(/^(\d+)\s*(ms|s|m|h|d)?$/i);
    if (!match) throw new Error(`Invalid rate-limit window: ${window}`);
    const amount = Number(match[1]);
    const unit = (match[2] || "s").toLowerCase();
    const factor = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
    return amount * factor;
}

// ---------------------------------------------------------------------------
// Provider clients
// ---------------------------------------------------------------------------

function getLocalClient() {
    const url = localRedisUrl();
    if (!url) throw new Error("Local Redis is not configured (set REDIS_URL).");
    if (!localClient || localClientUrl !== url) {
        localClient?.quit().catch(() => {});
        localClient = new RespClient({
            url,
            connectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 3000),
            commandTimeoutMs: Number(process.env.REDIS_COMMAND_TIMEOUT_MS || 3000),
        });
        localClientUrl = url;
    }
    return localClient;
}

async function getUpstash() {
    if (!isProviderConfigured("upstash")) throw new Error("Upstash is not configured.");
    if (!upstashModules) {
        const [{ Ratelimit }, { Redis }] = await Promise.all([
            import("@upstash/ratelimit"),
            import("@upstash/redis"),
        ]);
        upstashModules = { Ratelimit, Redis };
    }
    if (!upstashRedis) {
        upstashRedis = new upstashModules.Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    return { ...upstashModules, redis: upstashRedis };
}

// Sliding-window log, executed atomically inside Redis.
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
local allowed = 0
if count < limit then
  redis.call('ZADD', key, now, member)
  count = count + 1
  allowed = 1
end
redis.call('PEXPIRE', key, window)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local reset = now + window
if oldest[2] then reset = tonumber(oldest[2]) + window end
return {allowed, limit - count, reset}
`;

async function limitLocal(key, limit, windowMs) {
    const client = getLocalClient();
    const now = Date.now();
    const member = `${now}-${crypto.randomBytes(6).toString("hex")}`;
    const [allowed, remaining, reset] = await client.command(
        "EVAL", SLIDING_WINDOW_LUA, 1, `${KEY_PREFIX}${key}`, now, windowMs, limit, member
    );
    return { success: Number(allowed) === 1, limit, remaining: Math.max(Number(remaining), 0), reset: Number(reset) };
}

async function limitUpstash(key, limit, windowMs) {
    const { Ratelimit, redis } = await getUpstash();
    const cacheKey = `${limit}:${windowMs}`;
    if (!upstashLimiters.has(cacheKey)) {
        upstashLimiters.set(cacheKey, new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(limit, `${Math.max(1, Math.round(windowMs / 1000))} s`),
            prefix: KEY_PREFIX.replace(/:$/, ""),
        }));
    }
    const result = await upstashLimiters.get(cacheKey).limit(key);
    return { success: result.success, limit: result.limit, remaining: result.remaining, reset: result.reset };
}

function limitMemory(key, limit, windowMs) {
    const now = Date.now();
    const bucketKey = `${limit}:${windowMs}:${key}`;
    const hits = (memoryBuckets.get(bucketKey) || []).filter((timestamp) => timestamp > now - windowMs);
    const success = hits.length < limit;
    if (success) hits.push(now);
    memoryBuckets.set(bucketKey, hits);
    if (memoryBuckets.size > 50000) {
        for (const [storedKey, storedHits] of memoryBuckets) {
            if (!storedHits.length || storedHits[storedHits.length - 1] <= now - windowMs) memoryBuckets.delete(storedKey);
        }
    }
    return { success, limit, remaining: Math.max(limit - hits.length, 0), reset: (hits[0] || now) + windowMs };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a rate limiter. The provider is resolved on every call, so a runtime switch takes effect immediately.
 * @param {number} limit - Requests allowed per window
 * @param {string|number} window - e.g. "60 s", "15 m", "1 h"
 * @returns {{ limit: (key: string) => Promise<{success: boolean, limit: number, remaining: number, reset: number, provider: string}> }}
 */
export function createRateLimiter(limit, window) {
    const windowMs = parseWindow(window);
    return {
        async limit(key) {
            const provider = getActiveProvider();
            try {
                let result;
                if (provider === "local") result = await limitLocal(key, limit, windowMs);
                else if (provider === "upstash") result = await limitUpstash(key, limit, windowMs);
                else result = limitMemory(key, limit, windowMs);
                return { ...result, provider };
            } catch (error) {
                state.lastError = error.message;
                state.lastErrorAt = new Date();
                state.fallbackCount += 1;
                if (state.fallbackCount === 1 || state.fallbackCount % 100 === 0) {
                    console.error(`Rate limiter provider "${provider}" failed (${error.message}); using in-memory fallback.`);
                }
                return { ...limitMemory(key, limit, windowMs), provider: "memory-fallback" };
            }
        },
    };
}

/** Ping a provider. Resolves with latency in ms or rejects. */
export async function pingProvider(provider) {
    const started = Date.now();
    if (provider === "local") {
        const reply = await getLocalClient().command("PING");
        if (reply !== "PONG") throw new Error(`Unexpected PING reply: ${reply}`);
    } else if (provider === "upstash") {
        const { redis } = await getUpstash();
        const reply = await redis.ping();
        if (String(reply).toUpperCase() !== "PONG") throw new Error(`Unexpected PING reply: ${reply}`);
    } else if (provider !== "memory") {
        throw new Error(`Unknown provider: ${provider}`);
    }
    return Date.now() - started;
}

/** Status for the admin UI / health checks. Never includes secrets. */
export async function getRedisStatus({ ping = true } = {}) {
    const active = getActiveProvider();
    const providers = {};
    for (const provider of PROVIDERS) {
        providers[provider] = { configured: isProviderConfigured(provider) };
    }
    if (isProviderConfigured("local")) {
        try {
            const url = new URL(localRedisUrl());
            providers.local.target = `${url.protocol}//${url.hostname}:${url.port || 6379}${url.pathname || ""}`;
        } catch {
            providers.local.target = "invalid REDIS_URL";
        }
    }
    if (isProviderConfigured("upstash")) {
        try {
            providers.upstash.target = new URL(process.env.UPSTASH_REDIS_REST_URL).host;
        } catch {
            providers.upstash.target = "invalid UPSTASH_REDIS_REST_URL";
        }
    }

    let health = { ok: true, latencyMs: 0, error: null };
    if (ping) {
        try {
            health = { ok: true, latencyMs: await pingProvider(active), error: null };
        } catch (error) {
            health = { ok: false, latencyMs: null, error: error.message };
        }
    }

    return {
        activeProvider: active,
        source: state.runtimeChoice && state.runtimeChoice === active ? "system-setting" : (process.env.REDIS_PROVIDER ? "environment" : "auto"),
        envProvider: getEnvProvider(),
        runtimeChoice: state.runtimeChoice,
        runtimeChoiceUpdatedAt: state.runtimeChoiceUpdatedAt,
        runtimeChoiceUpdatedBy: state.runtimeChoiceUpdatedBy,
        providers,
        health,
        lastError: state.lastError,
        lastErrorAt: state.lastErrorAt,
        fallbackCount: state.fallbackCount,
    };
}

/**
 * Load the persisted runtime choice (call once after the DB connects).
 */
export async function initRedisProvider() {
    try {
        const { default: SystemSetting } = await import("../models/SystemSetting.js");
        const setting = await SystemSetting.findOne({ key: SETTING_KEY }).lean();
        if (setting?.value && PROVIDERS.includes(setting.value)) {
            state.runtimeChoice = setting.value;
            state.runtimeChoiceUpdatedAt = setting.updatedAt || null;
            state.runtimeChoiceUpdatedBy = setting.updatedBy ? String(setting.updatedBy) : null;
        }
    } catch (error) {
        console.error("Could not load Redis provider setting:", error.message);
    }
    const active = getActiveProvider();
    console.log(`Rate limiting store: ${active}${state.runtimeChoice ? " (set in System Settings)" : ""}`);
    if (state.runtimeChoice && state.runtimeChoice !== active) {
        console.warn(`Saved Redis provider "${state.runtimeChoice}" is not configured in this environment; using "${active}".`);
    }
    return active;
}

/**
 * Switch provider at runtime (superadmin). Pass null to clear the override and follow the environment.
 * The connection is tested before the switch is saved.
 * @returns {Promise<{previous: string, active: string}>}
 */
export async function setRuntimeProvider(provider, userId = null) {
    const previous = getActiveProvider();
    if (provider !== null) {
        if (!PROVIDERS.includes(provider)) throw Object.assign(new Error(`Unknown provider "${provider}".`), { statusCode: 400 });
        if (!isProviderConfigured(provider)) {
            throw Object.assign(new Error(`Provider "${provider}" is not configured on this server. Add its settings to the environment first.`), { statusCode: 400 });
        }
        try {
            await pingProvider(provider);
        } catch (error) {
            throw Object.assign(new Error(`Could not connect to "${provider}": ${error.message}`), { statusCode: 502 });
        }
    }

    const { default: SystemSetting } = await import("../models/SystemSetting.js");
    if (provider === null) {
        await SystemSetting.deleteOne({ key: SETTING_KEY });
    } else {
        await SystemSetting.findOneAndUpdate(
            { key: SETTING_KEY },
            { $set: { value: provider, updatedBy: userId } },
            { upsert: true, new: true }
        );
    }
    state.runtimeChoice = provider;
    state.runtimeChoiceUpdatedAt = new Date();
    state.runtimeChoiceUpdatedBy = userId ? String(userId) : null;
    state.lastError = null;
    state.fallbackCount = 0;
    return { previous, active: getActiveProvider() };
}

/** Test helper. */
export function resetRedisStateForTests() {
    state.runtimeChoice = null;
    state.lastError = null;
    state.fallbackCount = 0;
    memoryBuckets.clear();
    upstashLimiters.clear();
    upstashRedis = null;
    localClient?.quit().catch(() => {});
    localClient = null;
    localClientUrl = null;
}
