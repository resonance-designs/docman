/*
 * @name auditController
 * @file /docman/backend/src/controllers/auditController.js
 * @controller auditController
 * @description Admin access to the audit log: search, export (CSV/JSON), and chain verification.
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import { record, verifyChain, AUDIT_ACTIONS } from "../services/auditService.js";

const MAX_EXPORT_ROWS = 100000;

function asString(value) {
    return typeof value === "string" ? value.trim() : "";
}

/** Build a safe Mongo filter from query params (strings only — no operator injection). */
export function buildAuditFilter(query = {}) {
    const filter = {};
    const action = asString(query.action);
    const actorId = asString(query.actorId);
    const actorEmail = asString(query.actorEmail);
    const documentId = asString(query.documentId);
    const outcome = asString(query.outcome);
    const resourceType = asString(query.resourceType);
    const from = asString(query.from);
    const to = asString(query.to);

    if (action) {
        // Allow prefix searches such as "document." or "version."
        filter.action = action.endsWith(".")
            ? { $regex: `^${action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` }
            : action;
    }
    if (actorId && mongoose.Types.ObjectId.isValid(actorId)) filter["actor.id"] = new mongoose.Types.ObjectId(actorId);
    if (actorEmail) filter["actor.email"] = actorEmail.toLowerCase();
    if (documentId && mongoose.Types.ObjectId.isValid(documentId)) filter.documentId = new mongoose.Types.ObjectId(documentId);
    if (["success", "denied", "failure"].includes(outcome)) filter.outcome = outcome;
    if (resourceType) filter.resourceType = resourceType;
    if (from || to) {
        filter.timestamp = {};
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;
        if (fromDate && !Number.isNaN(fromDate.getTime())) filter.timestamp.$gte = fromDate;
        if (toDate && !Number.isNaN(toDate.getTime())) filter.timestamp.$lte = toDate;
        if (Object.keys(filter.timestamp).length === 0) delete filter.timestamp;
    }
    return filter;
}

/** GET /api/audit */
export async function listAuditEntries(req, res) {
    try {
        const filter = buildAuditFilter(req.query);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
        const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
        const [items, total] = await Promise.all([
            AuditLog.find(filter).sort({ sequence: -1 }).skip(skip).limit(limit).lean(),
            AuditLog.countDocuments(filter),
        ]);
        return res.status(200).json({ items, total, limit, skip, actions: Object.values(AUDIT_ACTIONS) });
    } catch (error) {
        console.error("Error listing audit entries:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

function csvCell(value) {
    if (value === null || value === undefined) return "";
    const text = typeof value === "string" ? value : JSON.stringify(value);
    // Neutralize spreadsheet formula injection and quote everything
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
}

/** GET /api/audit/export?format=csv|json */
export async function exportAuditEntries(req, res) {
    try {
        const format = req.query.format === "json" ? "json" : "csv";
        const filter = buildAuditFilter(req.query);
        const total = await AuditLog.countDocuments(filter);
        if (total > MAX_EXPORT_ROWS) {
            return res.status(413).json({ message: `Export too large (${total} rows). Narrow the date range (max ${MAX_EXPORT_ROWS}).` });
        }

        await record(req, {
            action: AUDIT_ACTIONS.AUDIT_EXPORT,
            resourceType: "audit",
            summary: `Exported ${total} audit entries as ${format.toUpperCase()}`,
            metadata: { format, filter: req.query },
        });

        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const cursor = AuditLog.find(filter).sort({ sequence: 1 }).lean().cursor();

        if (format === "json") {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", `attachment; filename="docman-audit-${stamp}.json"`);
            res.write("[");
            let first = true;
            for await (const entry of cursor) {
                res.write(`${first ? "" : ","}\n${JSON.stringify(entry)}`);
                first = false;
            }
            res.write("\n]\n");
            return res.end();
        }

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="docman-audit-${stamp}.csv"`);
        const header = ["sequence", "timestamp", "action", "outcome", "actor_email", "actor_role", "actor_id",
            "resource_type", "resource_id", "document_id", "summary", "changes", "metadata", "ip", "user_agent",
            "method", "path", "prev_hash", "hash"];
        res.write(`${header.join(",")}\n`);
        for await (const entry of cursor) {
            res.write(`${[
                entry.sequence,
                entry.timestamp?.toISOString?.() || entry.timestamp,
                entry.action,
                entry.outcome,
                entry.actor?.email,
                entry.actor?.role,
                entry.actor?.id ? String(entry.actor.id) : "",
                entry.resourceType,
                entry.resourceId,
                entry.documentId ? String(entry.documentId) : "",
                entry.summary,
                entry.changes,
                entry.metadata,
                entry.request?.ip,
                entry.request?.userAgent,
                entry.request?.method,
                entry.request?.path,
                entry.prevHash,
                entry.hash,
            ].map(csvCell).join(",")}\n`);
        }
        return res.end();
    } catch (error) {
        console.error("Error exporting audit entries:", error);
        if (!res.headersSent) return res.status(500).json({ message: "Internal Server Error" });
        return res.end();
    }
}

/** GET /api/audit/verify — recompute the whole hash chain. */
export async function verifyAuditChain(req, res) {
    try {
        const result = await verifyChain();
        await record(req, {
            action: AUDIT_ACTIONS.AUDIT_VERIFY,
            outcome: result.valid ? "success" : "failure",
            resourceType: "audit",
            summary: result.valid
                ? `Audit chain verified (${result.checked} entries)`
                : `Audit chain verification FAILED at sequence ${result.firstInvalidSequence} (${result.reason})`,
            metadata: result,
        });
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error verifying audit chain:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
