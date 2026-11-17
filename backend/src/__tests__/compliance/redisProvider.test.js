/*
 * @name Redis provider Tests
 * @file /docman/backend/src/__tests__/compliance/redisProvider.test.js
 * @description Provider selection, in-memory limiter, RESP protocol, and the self-hosted Redis client against a
 *              fake RESP server (AUTH/SELECT/PING/EVAL). The EVAL handler mirrors the sliding-window Lua script.
 * @version 2.3.0
 * @license UNLICENSED
 */
import net from "net";
import {
    parseWindow,
    getEnvProvider,
    getActiveProvider,
    isProviderConfigured,
    createRateLimiter,
    getRedisStatus,
    setRuntimeProvider,
    resetRedisStateForTests,
} from "../../config/redis.js";
import { RespParser, encodeCommand, parseRedisUrl, RespClient, RedisReplyError } from "../../lib/redisRespClient.js";

const ENV_KEYS = ["REDIS_PROVIDER", "REDIS_URL", "REDIS_HOST", "REDIS_PASSWORD", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
const savedEnv = {};

beforeEach(() => {
    for (const key of ENV_KEYS) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
    }
    resetRedisStateForTests();
});
afterEach(() => {
    for (const key of ENV_KEYS) {
        if (savedEnv[key] === undefined) delete process.env[key];
        else process.env[key] = savedEnv[key];
    }
});

/** Fake Redis speaking RESP2. Implements AUTH, SELECT, PING, QUIT and the sliding-window EVAL. */
function startFakeRedis({ password = null } = {}) {
    const zsets = new Map();
    const seen = [];
    const sockets = new Set();
    const server = net.createServer((socket) => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        const parser = new RespParser();
        let authed = !password;
        socket.on("data", (chunk) => {
            for (const args of parser.push(chunk)) {
                seen.push(args);
                const [cmd, ...rest] = args;
                const name = String(cmd).toUpperCase();
                if (name === "AUTH") {
                    authed = rest[rest.length - 1] === password;
                    socket.write(authed ? "+OK\r\n" : "-WRONGPASS invalid password\r\n");
                } else if (!authed) {
                    socket.write("-NOAUTH Authentication required.\r\n");
                } else if (name === "SELECT") {
                    socket.write("+OK\r\n");
                } else if (name === "PING") {
                    socket.write("+PONG\r\n");
                } else if (name === "QUIT") {
                    socket.end("+OK\r\n");
                } else if (name === "EVAL") {
                    const [, , key, nowRaw, windowRaw, limitRaw, member] = rest;
                    const now = Number(nowRaw);
                    const windowMs = Number(windowRaw);
                    const limit = Number(limitRaw);
                    const hits = (zsets.get(key) || []).filter((score) => score > now - windowMs);
                    let allowed = 0;
                    if (hits.length < limit) {
                        hits.push(now);
                        allowed = 1;
                    }
                    zsets.set(key, hits);
                    void member;
                    const reset = (hits[0] ?? now) + windowMs;
                    socket.write(`*3\r\n:${allowed}\r\n:${limit - hits.length}\r\n:${reset}\r\n`);
                } else {
                    socket.write(`-ERR unknown command '${cmd}'\r\n`);
                }
            }
        });
    });
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve({ server, sockets, port: server.address().port, seen }));
    });
}

describe("configuration", () => {
    test("parseWindow understands the formats used in the codebase", () => {
        expect(parseWindow("60 s")).toBe(60000);
        expect(parseWindow("15m")).toBe(900000);
        expect(parseWindow("1 h")).toBe(3600000);
        expect(parseWindow(30)).toBe(30000);
        expect(() => parseWindow("soon")).toThrow();
    });

    test("auto-selects upstash, then local, then memory", () => {
        expect(getEnvProvider()).toBe("memory");
        process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
        expect(getEnvProvider()).toBe("local");
        process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
        process.env.UPSTASH_REDIS_REST_TOKEN = "token";
        expect(getEnvProvider()).toBe("upstash");
        process.env.REDIS_PROVIDER = "local";
        expect(getActiveProvider()).toBe("local");
    });

    test("an explicitly chosen but unconfigured provider falls back to memory", () => {
        process.env.REDIS_PROVIDER = "upstash";
        expect(isProviderConfigured("upstash")).toBe(false);
        expect(getActiveProvider()).toBe("memory");
    });

    test("REDIS_HOST/REDIS_PASSWORD build a local URL", () => {
        process.env.REDIS_HOST = "10.0.0.5";
        process.env.REDIS_PASSWORD = "p@ss";
        expect(isProviderConfigured("local")).toBe(true);
    });

    test("switching to an unconfigured provider is refused before anything is saved", async () => {
        await expect(setRuntimeProvider("upstash")).rejects.toMatchObject({ statusCode: 400 });
        await expect(setRuntimeProvider("bogus")).rejects.toMatchObject({ statusCode: 400 });
    });

    test("status never leaks credentials", async () => {
        process.env.REDIS_URL = "redis://:supersecret@127.0.0.1:1/0";
        process.env.REDIS_PROVIDER = "memory";
        const status = await getRedisStatus({ ping: false });
        expect(JSON.stringify(status)).not.toContain("supersecret");
        expect(status.providers.local.target).toBe("redis://127.0.0.1:1/0");
    });
});

describe("in-memory limiter", () => {
    test("enforces the limit within the window", async () => {
        const limiter = createRateLimiter(3, "60 s");
        const results = [];
        for (let i = 0; i < 4; i += 1) results.push(await limiter.limit("ip:1"));
        expect(results.map((r) => r.success)).toEqual([true, true, true, false]);
        expect(results[0].provider).toBe("memory");
        expect((await limiter.limit("ip:2")).success).toBe(true);
    });
});

describe("RESP protocol", () => {
    test("encodes commands as RESP arrays", () => {
        expect(encodeCommand(["SET", "k", "välue"]).toString("utf8")).toBe("*3\r\n$3\r\nSET\r\n$1\r\nk\r\n$6\r\nvälue\r\n");
    });

    test("parses split, nested and error replies", () => {
        const parser = new RespParser();
        expect(parser.push(Buffer.from("*2\r\n:1\r\n$3\r\nab"))).toEqual([]);
        expect(parser.push(Buffer.from("c\r\n+OK\r\n-ERR bad\r\n$-1\r\n"))).toEqual([[1, "abc"], "OK", expect.any(RedisReplyError), null]);
    });

    test("parses redis:// and rediss:// URLs", () => {
        expect(parseRedisUrl("rediss://user:p%40ss@cache.local:6380/2")).toEqual({
            host: "cache.local", port: 6380, username: "user", password: "p@ss", db: 2, tls: true,
        });
        expect(() => parseRedisUrl("http://x")).toThrow();
    });
});

describe("self-hosted Redis client against a fake server", () => {
    let fake;
    afterEach(async () => {
        resetRedisStateForTests();
        if (!fake) return;
        for (const socket of fake.sockets) socket.destroy();
        await new Promise((resolve) => fake.server.close(() => resolve()));
        fake = null;
    });

    test("authenticates, selects the db, pings and pipelines", async () => {
        fake = await startFakeRedis({ password: "s3cret" });
        const client = new RespClient({ url: `redis://:s3cret@127.0.0.1:${fake.port}/3` });
        const replies = await Promise.all([client.command("PING"), client.command("PING"), client.command("PING")]);
        expect(replies).toEqual(["PONG", "PONG", "PONG"]);
        expect(fake.seen[0]).toEqual(["AUTH", "s3cret"]);
        expect(fake.seen[1]).toEqual(["SELECT", "3"]);
        await client.quit();
    });

    test("wrong password surfaces as an error", async () => {
        fake = await startFakeRedis({ password: "right" });
        const client = new RespClient({ url: `redis://:wrong@127.0.0.1:${fake.port}/0` });
        await expect(client.command("PING")).rejects.toThrow(/WRONGPASS/);
    });

    test("rate limiter uses the local provider end to end", async () => {
        fake = await startFakeRedis();
        process.env.REDIS_URL = `redis://127.0.0.1:${fake.port}/0`;
        process.env.REDIS_PROVIDER = "local";
        const limiter = createRateLimiter(2, "60 s");
        const first = await limiter.limit("user:1");
        const second = await limiter.limit("user:1");
        const third = await limiter.limit("user:1");
        expect([first.success, second.success, third.success]).toEqual([true, true, false]);
        expect(first.provider).toBe("local");
        expect(fake.seen.some((args) => args[0] === "EVAL" && args[3] === "docman:ratelimit:user:1")).toBe(true);
        const status = await getRedisStatus();
        expect(status.activeProvider).toBe("local");
        expect(status.health.ok).toBe(true);
    });

    test("falls back to memory when the Redis server is unreachable", async () => {
        process.env.REDIS_URL = "redis://127.0.0.1:1/0";
        process.env.REDIS_PROVIDER = "local";
        const limiter = createRateLimiter(1, "60 s");
        const result = await limiter.limit("ip:x");
        expect(result.provider).toBe("memory-fallback");
        expect(result.success).toBe(true);
        const status = await getRedisStatus();
        expect(status.health.ok).toBe(false);
        expect(status.fallbackCount).toBeGreaterThan(0);
    });
});
