/*
 * @name Security fixes Tests
 * @file /docman/backend/src/__tests__/compliance/securityFixes.test.js
 * @description Field allow-listing, audit filter injection safety, and the public media route lock-down.
 * @version 3.0.0
 * @license UNLICENSED
 */
import { jest } from "@jest/globals";

jest.mock("../../models/User.js", () => ({ __esModule: true, default: { exists: jest.fn() } }));

jest.mock("../../models/File.js", () => ({ __esModule: true, default: { exists: jest.fn(async () => null) } }));
import File from "../../models/File.js";
import express from "express";
import request from "supertest";
import User from "../../models/User.js";
import { pickUpdatableFields } from "../../services/documentService.js";
import { buildAuditFilter } from "../../controllers/auditController.js";
import mediaRoutes from "../../routes/mediaRoutes.js";

describe("document update allow-list", () => {
    test("server-controlled fields are dropped", () => {
        const picked = pickUpdatableFields({
            title: "New title",
            currentVersion: 99,
            versionHistory: "[]",
            reviewCompleted: true,
            deletedAt: null,
            createdBy: "x",
            author: "507f1f77bcf86cd799439011",
        }, { role: "editor" });
        expect(picked).toEqual({ title: "New title" });
    });

    test("admins may reassign the author", () => {
        expect(pickUpdatableFields({ author: "507f1f77bcf86cd799439011" }, { role: "admin" }))
            .toEqual({ author: "507f1f77bcf86cd799439011" });
    });

    test("operator objects are rejected (NoSQL injection)", () => {
        expect(() => pickUpdatableFields({ title: { $set: "x" } }, { role: "admin" })).toThrow(/Invalid value for title/);
    });
});

describe("audit search filter", () => {
    test("ignores non-string and malformed inputs", () => {
        expect(buildAuditFilter({ action: { $ne: null }, actorId: "nope", documentId: { $gt: "" }, outcome: "everything" })).toEqual({});
    });

    test("supports prefix search with escaped regex", () => {
        expect(buildAuditFilter({ action: "version." }).action).toEqual({ $regex: "^version\\." });
    });

    test("date range", () => {
        const filter = buildAuditFilter({ from: "2026-01-01", to: "not-a-date" });
        expect(filter.timestamp.$gte).toBeInstanceOf(Date);
        expect(filter.timestamp.$lte).toBeUndefined();
    });
});

describe("/uploads no longer serves document files", () => {
    const app = express();
    app.use("/uploads", mediaRoutes);

    test("document-type files are never served", async () => {
        User.exists.mockResolvedValue(null);
        await request(app).get("/uploads/1700000000000-abc.pdf").expect(404);
        expect(User.exists).not.toHaveBeenCalled();
    });

    test("images not referenced by a user profile are not served", async () => {
        User.exists.mockResolvedValue(null);
        await request(app).get("/uploads/1700000000000-abc.png").expect(404);
        expect(User.exists).toHaveBeenCalled();
    });

    test("path traversal is rejected", async () => {
        await request(app).get("/uploads/..%2F..%2F.env.prod").expect(404);
    });
});

test('document images cannot bypass protection by being referenced as profile media', async () => {
    File.exists.mockResolvedValueOnce({ _id: 'document-file' }); User.exists.mockResolvedValue({ _id: 'user' });
    const app = express(); app.use('/uploads', mediaRoutes);
    await request(app).get('/uploads/private-document.png').expect(404);
    expect(User.exists).not.toHaveBeenCalled();
});
