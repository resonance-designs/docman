/*
 * @name auditService
 * @file /docman/backend/src/services/auditService.js
 * @service auditService
 * @description Writes and verifies the append-only, hash-chained audit trail.
 *
 * Design notes:
 *  - Every entry hashes (canonical JSON of the entry + previous entry hash) with SHA-256.
 *  - Appends are serialized inside the process so the chain stays linear. If another process wins a
 *    sequence number, the append retries against the new chain head.
 *  - Recording never throws into the caller by default (fail-open) so a logging hiccup cannot block a
 *    business operation; failures are written to stderr as structured JSON for journald/SIEM pickup.
 *    Set AUDIT_FAIL_CLOSED=true to make record() throw instead.
 *  - Set AUDIT_STDOUT=true to also emit each entry as a JSON line on stdout (for log forwarding).
 *  - Successful file-publication events use a unique database key for cross-process deduplication.
 *    Replays return the original entry; historical records without keys are left unchanged.
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import crypto from "crypto";
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";

export const GENESIS_HASH = "GENESIS";
const MAX_STRING_LENGTH = 2000;
const MAX_APPEND_ATTEMPTS = 5;

export const AUDIT_ACTIONS = Object.freeze({
    AUTH_LOGIN: "auth.login",
    AUTH_LOGIN_FAILED: "auth.login_failed",
    AUTH_LOGOUT: "auth.logout",
    AUTH_REGISTER: "auth.register",
    AUTH_PASSWORD_RESET: "auth.password_reset",
    AUTH_JIT_PROVISION: "auth.jit_provision",
    ACCESS_DENIED: "access.denied",
    DOCUMENT_CREATE: "document.create",
    DOCUMENT_VIEW: "document.view",
    DOCUMENT_UPDATE: "document.update",
    DOCUMENT_DELETE: "document.delete",
    DOCUMENT_RESTORE: "document.restore",
    DOCUMENT_MARK_REVIEWED: "document.mark_reviewed",
    FILE_UPLOAD: "file.upload",
    FILE_DOWNLOAD: "file.download",
    FILE_INTEGRITY_FAILURE: "file.integrity_failure",
    VERSION_SUBMIT: "version.submit",
    VERSION_APPROVE: "version.approve",
    VERSION_REJECT: "version.reject",
    VERSION_WITHDRAW: "version.withdraw",
    VERSION_PUBLISH: "version.publish",
    REVIEW_ASSIGN: "review.assign",
    REVIEW_UPDATE: "review.update",
    USER_CREATE: "user.create",
    USER_PASSWORD_RESET: "user.password_reset",
    USER_UPDATE: "user.update",
    USER_ROLE_CHANGE: "user.role_change",
    USER_DELETE: "user.delete",
    SYSTEM_SETTING_CHANGE: "system.setting_change",
    SYSTEM_MIGRATION: "system.migration",
    AUDIT_EXPORT: "audit.export",
    AUDIT_VERIFY: "audit.verify",
});

let chainHead = null; // { sequence, hash }
let appendQueue = Promise.resolve();

function envFlag(name, fallback = false) {
    const value = process.env[name];
    if (value === undefined || value === "") return fallback;
    return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

/**
 * Convert any value to plain, JSON-safe data so the stored form and the hashed form are identical.
 * ObjectIds become strings, Dates become ISO strings, long strings are truncated.
 */
export function toPlain(value, depth = 0) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (depth > 8) return "[depth-limit]";
    if (value instanceof Date) return value.toISOString();
    if (value instanceof mongoose.Types.ObjectId) return value.toString();
    if (typeof value === "string") {
        return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]` : value;
    }
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value === "bigint") return value.toString();
    if (Buffer.isBuffer(value)) return `[buffer:${value.length}]`;
    if (Array.isArray(value)) return value.map((item) => {
        const plain = toPlain(item, depth + 1);
        return plain === undefined ? null : plain;
    });
    if (typeof value === "object") {
        if (typeof value.toObject === "function") value = value.toObject({ depopulate: true });
        if (value._bsontype === "ObjectId" || value._bsontype === "ObjectID") return value.toString();
        const result = {};
        for (const key of Object.keys(value)) {
            if (key === "password" || key === "refreshTokenHash" || key.startsWith("$")) continue;
            const plain = toPlain(value[key], depth + 1);
            if (plain !== undefined) result[key] = plain;
        }
        return result;
    }
    return String(value);
}

/**
 * Deterministic JSON serialization (sorted keys) used for hashing.
 */
export function canonicalStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
    const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
}

function hashableView(entry) {
    return {
        ...(entry.idempotencyKey ? { idempotencyKey: entry.idempotencyKey } : {}),
        sequence: entry.sequence,
        timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
        action: entry.action,
        outcome: entry.outcome,
        actor: toPlain(entry.actor) || {},
        resourceType: entry.resourceType ?? null,
        resourceId: entry.resourceId ?? null,
        documentId: entry.documentId ? String(entry.documentId) : null,
        summary: entry.summary || "",
        changes: toPlain(entry.changes) || [],
        metadata: toPlain(entry.metadata) || {},
        request: toPlain(entry.request) || {},
        prevHash: entry.prevHash,
    };
}

export function computeEntryHash(entry) {
    return crypto.createHash("sha256").update(canonicalStringify(hashableView(entry))).digest("hex");
}

function buildActor(context) {
    const user = context?.user || context?.actor || null;
    return {
        id: user?._id || user?.id || null,
        email: user?.email || null,
        role: user?.role || null,
        authType: context?.identity?.authType || context?.authType || null,
    };
}

function buildRequestInfo(context) {
    if (!context || typeof context !== "object") return { ip: null, userAgent: null, method: null, path: null };
    const forwarded = context.headers?.["x-forwarded-for"];
    const ip = context.ip || (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null)
        || context.socket?.remoteAddress || null;
    const rawPath = context.originalUrl || context.url || null;
    return {
        ip,
        userAgent: context.headers?.["user-agent"] || null,
        method: context.method || null,
        path: rawPath ? rawPath.split("?")[0] : null,
    };
}

async function loadChainHead() {
    const last = await AuditLog.findOne({}, { sequence: 1, hash: 1 }).sort({ sequence: -1 }).lean();
    chainHead = last ? { sequence: last.sequence, hash: last.hash } : { sequence: 0, hash: GENESIS_HASH };
    return chainHead;
}

async function appendEntry(fields) {
    const publicationFilter = fields.idempotencyKey ? {
        action: fields.action, resourceType: fields.resourceType,
        resourceId: fields.resourceId, outcome: fields.outcome,
    } : null;
    for (let attempt = 1; attempt <= MAX_APPEND_ATTEMPTS; attempt += 1) {
        // This also recognizes legacy publication events without an idempotency key.
        if (publicationFilter) {
            const existing = await AuditLog.findOne(publicationFilter);
            if (existing) return { entry: existing, inserted: false };
        }
        const head = chainHead || (await loadChainHead());
        const entry = {
            ...fields,
            sequence: head.sequence + 1,
            prevHash: head.hash,
        };
        entry.hash = computeEntryHash(entry);
        try {
            const created = await AuditLog.create(entry);
            chainHead = { sequence: entry.sequence, hash: entry.hash };
            return { entry: created, inserted: true };
        } catch (error) {
            if (error?.code === 11000 && publicationFilter) {
                // Another process may have inserted the same publication. The unique
                // index, not the preceding lookup, arbitrates concurrent writers.
                const existing = await AuditLog.findOne(publicationFilter);
                if (existing) {
                    chainHead = null;
                    return { entry: existing, inserted: false };
                }
            }
            if (error?.code === 11000 && attempt < MAX_APPEND_ATTEMPTS) {
                await loadChainHead();
                continue;
            }
            throw error;
        }
    }
    throw new Error("Unable to append audit entry after retries.");
}

/**
 * Record an audit event.
 * @param {Object|null} context - Express request (preferred) or { user, identity } object; null for system events
 * @param {Object} event
 * @param {string} event.action - One of AUDIT_ACTIONS
 * @param {string} [event.outcome] - success | denied | failure
 * @param {string} [event.resourceType]
 * @param {string} [event.resourceId]
 * @param {string} [event.documentId]
 * @param {string} [event.summary]
 * @param {Array} [event.changes] - [{ field, from, to }]
 * @param {Object} [event.metadata]
 * @param {Object} [event.actorUser] - Override the actor (e.g. at login, before req.user exists)
 * @param {string} [event.authType] - Auth type to record with actorUser
 * @returns {Promise<Object|null>} The created entry, or null if recording failed (fail-open mode)
 */
export function record(context, event) {
    const fields = {
        timestamp: new Date(),
        action: event.action,
        outcome: event.outcome || "success",
        actor: toPlain(buildActor(event.actorUser
            ? { user: event.actorUser, authType: event.authType || context?.identity?.authType || null }
            : context)),
        resourceType: event.resourceType || null,
        resourceId: event.resourceId ? String(event.resourceId) : null,
        documentId: event.documentId ? String(event.documentId) : null,
        summary: event.summary || "",
        changes: toPlain(event.changes || []),
        metadata: toPlain(event.metadata || {}),
        request: buildRequestInfo(context),
    };
    if (fields.action === AUDIT_ACTIONS.VERSION_PUBLISH && fields.resourceType === "file"
        && fields.resourceId && fields.outcome === "success") {
        fields.idempotencyKey = `version.publish:file:${fields.resourceId}`;
    }

    const run = async () => {
        try {
            const { entry: created, inserted } = await appendEntry(fields);
            if (inserted && envFlag("AUDIT_STDOUT")) {
                process.stdout.write(`${JSON.stringify({ type: "audit", ...hashableView(created.toObject()), hash: created.hash })}\n`);
            }
            return created;
        } catch (error) {
            chainHead = null;
            process.stderr.write(`${JSON.stringify({ type: "audit_write_failure", error: error.message, event: fields })}\n`);
            if (envFlag("AUDIT_FAIL_CLOSED")) throw error;
            return null;
        }
    };

    const result = appendQueue.then(run, run);
    appendQueue = result.catch(() => null);
    return result;
}

/**
 * Convenience helper to compute field-level changes between two plain objects.
 * @param {Object} before
 * @param {Object} after
 * @param {string[]} fields - Fields to compare
 * @returns {Array<{field: string, from: any, to: any}>}
 */
export function diffFields(before = {}, after = {}, fields = []) {
    const changes = [];
    for (const field of fields) {
        const from = toPlain(before?.[field]);
        const to = toPlain(after?.[field]);
        if (canonicalStringify(from ?? null) !== canonicalStringify(to ?? null)) {
            changes.push({ field, from: from ?? null, to: to ?? null });
        }
    }
    return changes;
}

/**
 * Walk the full chain and confirm every hash and back-link.
 * @param {Object} [options]
 * @param {number} [options.batchSize=1000]
 * @returns {Promise<{valid: boolean, checked: number, firstInvalidSequence: number|null, reason: string|null}>}
 */
export async function verifyChain({ batchSize = 1000 } = {}) {
    let expectedPrev = GENESIS_HASH;
    let expectedSequence = 1;
    let checked = 0;
    let lastSequence = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const batch = await AuditLog.find({ sequence: { $gt: lastSequence } })
            .sort({ sequence: 1 })
            .limit(batchSize)
            .lean();
        if (batch.length === 0) break;

        for (const entry of batch) {
            if (entry.sequence !== expectedSequence) {
                return { valid: false, checked, firstInvalidSequence: expectedSequence, reason: "missing-entry" };
            }
            if (entry.prevHash !== expectedPrev) {
                return { valid: false, checked, firstInvalidSequence: entry.sequence, reason: "broken-link" };
            }
            if (computeEntryHash(entry) !== entry.hash) {
                return { valid: false, checked, firstInvalidSequence: entry.sequence, reason: "hash-mismatch" };
            }
            expectedPrev = entry.hash;
            expectedSequence += 1;
            lastSequence = entry.sequence;
            checked += 1;
        }
    }

    return { valid: true, checked, firstInvalidSequence: null, reason: null };
}

/** Test helper: forget the cached chain head. */
export function resetAuditStateForTests() {
    chainHead = null;
    appendQueue = Promise.resolve();
}

export default { record, verifyChain, diffFields, AUDIT_ACTIONS };
