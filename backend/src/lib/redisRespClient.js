/*
 * @name redisRespClient
 * @file /docman/backend/src/lib/redisRespClient.js
 * @description Minimal, dependency-free Redis client (RESP2) for the self-hosted Redis option.
 *              Supports redis:// and rediss:// (TLS) URLs, AUTH (password or ACL user+password), SELECT db,
 *              pipelined commands, lazy reconnect, and connect/command timeouts. It implements only what
 *              DocMan needs (EVAL, PING, INFO, etc.) — any Redis command can be sent with command().
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import net from "net";
import tls from "tls";

const CRLF = "\r\n";

/** Encode a command as a RESP array of bulk strings. */
export function encodeCommand(args) {
    let out = `*${args.length}${CRLF}`;
    for (const arg of args) {
        const value = Buffer.isBuffer(arg) ? arg : Buffer.from(String(arg));
        out += `$${value.length}${CRLF}${value.toString("binary")}${CRLF}`;
    }
    return Buffer.from(out, "binary");
}

export class RedisReplyError extends Error {
    constructor(message) {
        super(message);
        this.name = "RedisReplyError";
    }
}

/**
 * Incremental RESP2 parser. Feed it chunks; it returns complete replies.
 */
export class RespParser {
    constructor() {
        this.buffer = Buffer.alloc(0);
    }

    push(chunk) {
        this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
        const replies = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const result = this.parseAt(0);
            if (!result) break;
            replies.push(result.value);
            this.buffer = this.buffer.subarray(result.offset);
            if (this.buffer.length === 0) break;
        }
        return replies;
    }

    readLine(offset) {
        const end = this.buffer.indexOf(CRLF, offset, "binary");
        if (end === -1) return null;
        return { line: this.buffer.toString("utf8", offset, end), next: end + 2 };
    }

    parseAt(offset) {
        if (offset >= this.buffer.length) return null;
        const type = String.fromCharCode(this.buffer[offset]);
        const header = this.readLine(offset + 1);
        if (!header) return null;
        switch (type) {
            case "+":
                return { value: header.line, offset: header.next };
            case "-":
                return { value: new RedisReplyError(header.line), offset: header.next };
            case ":":
                return { value: Number(header.line), offset: header.next };
            case "$": {
                const length = Number(header.line);
                if (length === -1) return { value: null, offset: header.next };
                if (this.buffer.length < header.next + length + 2) return null;
                return {
                    value: this.buffer.toString("utf8", header.next, header.next + length),
                    offset: header.next + length + 2,
                };
            }
            case "*": {
                const count = Number(header.line);
                if (count === -1) return { value: null, offset: header.next };
                const items = [];
                let cursor = header.next;
                for (let i = 0; i < count; i += 1) {
                    const item = this.parseAt(cursor);
                    if (!item) return null;
                    items.push(item.value);
                    cursor = item.offset;
                }
                return { value: items, offset: cursor };
            }
            default:
                throw new Error(`Unexpected RESP type byte: ${type}`);
        }
    }
}

/** Parse redis://[user[:password]@]host[:port][/db] (or rediss:// for TLS). */
export function parseRedisUrl(url) {
    const parsed = new URL(url);
    if (!["redis:", "rediss:"].includes(parsed.protocol)) {
        throw new Error("REDIS_URL must start with redis:// or rediss://");
    }
    const db = parsed.pathname && parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0;
    return {
        host: parsed.hostname || "127.0.0.1",
        port: Number(parsed.port || 6379),
        username: parsed.username ? decodeURIComponent(parsed.username) : null,
        password: parsed.password ? decodeURIComponent(parsed.password) : null,
        db: Number.isFinite(db) ? db : 0,
        tls: parsed.protocol === "rediss:",
    };
}

export class RespClient {
    /**
     * @param {Object} options
     * @param {string} [options.url] - redis:// URL (takes precedence)
     * @param {string} [options.host]
     * @param {number} [options.port]
     * @param {string} [options.username]
     * @param {string} [options.password]
     * @param {number} [options.db]
     * @param {boolean} [options.tls]
     * @param {Object} [options.tlsOptions] - Extra options for tls.connect (e.g. { ca })
     * @param {number} [options.connectTimeoutMs=3000]
     * @param {number} [options.commandTimeoutMs=3000]
     */
    constructor(options = {}) {
        const fromUrl = options.url ? parseRedisUrl(options.url) : {};
        this.options = {
            host: "127.0.0.1",
            port: 6379,
            username: null,
            password: null,
            db: 0,
            tls: false,
            tlsOptions: {},
            connectTimeoutMs: 3000,
            commandTimeoutMs: 3000,
            ...Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined && value !== "")),
            ...fromUrl,
        };
        this.socket = null;
        this.connecting = null;
        this.pending = [];
        this.parser = new RespParser();
    }

    async connect() {
        if (this.socket && !this.socket.destroyed) return;
        if (this.connecting) return this.connecting;

        this.connecting = new Promise((resolve, reject) => {
            const { host, port, connectTimeoutMs } = this.options;
            const onConnect = async () => {
                clearTimeout(timer);
                socket.setNoDelay(true);
                socket.setKeepAlive(true, 30000);
                this.socket = socket;
                try {
                    if (this.options.password) {
                        const authArgs = this.options.username
                            ? ["AUTH", this.options.username, this.options.password]
                            : ["AUTH", this.options.password];
                        await this.sendRaw(authArgs);
                    }
                    if (this.options.db) {
                        await this.sendRaw(["SELECT", this.options.db]);
                    }
                    resolve();
                } catch (error) {
                    socket.destroy();
                    reject(error);
                }
            };

            const socket = this.options.tls
                ? tls.connect({ host, port, servername: host, ...this.options.tlsOptions }, onConnect)
                : net.createConnection({ host, port }, onConnect);

            const timer = setTimeout(() => {
                socket.destroy(new Error(`Redis connect timeout after ${connectTimeoutMs}ms (${host}:${port})`));
            }, connectTimeoutMs);

            socket.on("data", (chunk) => this.onData(chunk));
            socket.on("error", (error) => {
                clearTimeout(timer);
                this.failAll(error);
                reject(error);
            });
            socket.on("close", () => {
                this.socket = null;
                this.failAll(new Error("Redis connection closed"));
            });
        }).finally(() => {
            this.connecting = null;
        });

        return this.connecting;
    }

    onData(chunk) {
        let replies;
        try {
            replies = this.parser.push(chunk);
        } catch (error) {
            this.socket?.destroy(error);
            return;
        }
        for (const reply of replies) {
            const waiter = this.pending.shift();
            if (!waiter) continue;
            clearTimeout(waiter.timer);
            if (reply instanceof RedisReplyError) waiter.reject(reply);
            else waiter.resolve(reply);
        }
    }

    failAll(error) {
        const waiting = this.pending;
        this.pending = [];
        this.parser = new RespParser();
        for (const waiter of waiting) {
            clearTimeout(waiter.timer);
            waiter.reject(error);
        }
    }

    sendRaw(args) {
        return new Promise((resolve, reject) => {
            if (!this.socket || this.socket.destroyed) {
                reject(new Error("Redis socket is not connected"));
                return;
            }
            const timer = setTimeout(() => {
                // A timed-out reply would desync the pipeline, so drop the connection.
                this.socket?.destroy(new Error(`Redis command timeout after ${this.options.commandTimeoutMs}ms`));
            }, this.options.commandTimeoutMs);
            this.pending.push({ resolve, reject, timer });
            this.socket.write(encodeCommand(args));
        });
    }

    /** Send any Redis command, connecting (or reconnecting) first if needed. */
    async command(...args) {
        await this.connect();
        return this.sendRaw(args);
    }

    async quit() {
        if (!this.socket) return;
        try {
            await this.sendRaw(["QUIT"]);
        } catch {
            // ignore
        }
        this.socket?.destroy();
        this.socket = null;
    }
}

export default RespClient;
