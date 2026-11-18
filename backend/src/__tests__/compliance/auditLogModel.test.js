/*
 * @name AuditLog model immutability Tests
 * @file /docman/backend/src/__tests__/compliance/auditLogModel.test.js
 * @description Query middleware must reject updates/deletes before anything reaches MongoDB.
 * @version 3.0.0
 * @license UNLICENSED
 */
import mongoose from "mongoose";
import AuditLog from "../../models/AuditLog.js";
import DocumentRevision from "../../models/DocumentRevision.js";

mongoose.set("bufferTimeoutMS", 300);

const operations = {
    updateOne: (m) => m.updateOne({}, { $set: { summary: "x" } }),
    updateMany: (m) => m.updateMany({}, { $set: { summary: "x" } }),
    deleteOne: (m) => m.deleteOne({}),
    deleteMany: (m) => m.deleteMany({}),
    findOneAndUpdate: (m) => m.findOneAndUpdate({}, { $set: { summary: "x" } }),
    findOneAndDelete: (m) => m.findOneAndDelete({}),
    replaceOne: (m) => m.replaceOne({}, { summary: "x" }),
};

describe("append-only models", () => {
    test.each(Object.keys(operations))("AuditLog.%s is rejected by middleware", async (op) => {
        await expect(operations[op](AuditLog).exec()).rejects.toThrow(/append-only/);
    });

    test.each(["updateOne", "deleteMany", "findOneAndUpdate"])("DocumentRevision.%s is rejected by middleware", async (op) => {
        await expect(operations[op](DocumentRevision).exec()).rejects.toThrow(/immutable/);
    });
});

import { computeEntryHash, toPlain, GENESIS_HASH } from "../../services/auditService.js";

describe("hash survives MongoDB casting + BSON round trip", () => {
    test("hash computed before insert equals hash recomputed from stored document", () => {
        const entry = {
            sequence: 7,
            timestamp: new Date("2026-11-17T03:00:00.123Z"),
            action: "document.update",
            outcome: "success",
            actor: toPlain({ id: "507f1f77bcf86cd799439011", email: "a@nmdoh.test", role: "editor", authType: "local-jwt" }),
            resourceType: "document",
            resourceId: "507f1f77bcf86cd799439012",
            documentId: "507f1f77bcf86cd799439012",
            summary: "Updated title",
            changes: toPlain([{ field: "title", from: "A", to: "B" }, { field: "owners", from: ["507f1f77bcf86cd799439011"], to: [] }, { field: "reviewNotes", from: null, to: "x" }]),
            metadata: toPlain({ nested: { ok: true, n: 3 }, list: [1, "two"] }),
            request: { ip: "10.0.0.1", userAgent: "jest", method: "PUT", path: "/api/docs/x" },
            prevHash: GENESIS_HASH,
        };
        entry.hash = computeEntryHash(entry);

        const doc = new AuditLog(entry);
        const { BSON } = mongoose.mongo;
        const stored = BSON.deserialize(BSON.serialize(doc.toBSON()));
        expect(stored.actor.id).toBeInstanceOf(mongoose.mongo.ObjectId);
        expect(computeEntryHash(stored)).toBe(entry.hash);
    });

    test("empty metadata is kept (minimize disabled) so hashes stay stable", () => {
        const doc = new AuditLog({ sequence: 1, action: "x", prevHash: GENESIS_HASH, hash: "h", metadata: {} });
        expect(doc.toObject().metadata).toEqual({});
    });
});
