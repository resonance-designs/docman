/*
 * @name auditService Tests
 * @file /docman/backend/src/__tests__/compliance/auditService.test.js
 * @description Hash-chain audit log: canonical hashing, chaining, tamper detection, immutability hooks.
 * @version 2.3.0
 * @license UNLICENSED
 */
import { jest } from "@jest/globals";

const mockStore = [];

function mockChain(result) {
    const api = {
        sort: () => api,
        limit: (n) => { api._limit = n; return api; },
        lean: () => Promise.resolve(typeof result === "function" ? result(api) : result),
    };
    return api;
}

jest.mock("../../models/AuditLog.js", () => ({
    __esModule: true,
    default: {
        findOne: jest.fn(() => mockChain(() => {
            const sorted = [...mockStore].sort((a, b) => b.sequence - a.sequence);
            return sorted[0] ? { sequence: sorted[0].sequence, hash: sorted[0].hash } : null;
        })),
        find: jest.fn((filter) => mockChain((api) => mockStore
            .filter((entry) => entry.sequence > (filter?.sequence?.$gt ?? 0))
            .sort((a, b) => a.sequence - b.sequence)
            .slice(0, api._limit || 1000)
            .map((entry) => JSON.parse(JSON.stringify(entry))))),
        create: jest.fn(async (entry) => {
            if (mockStore.some((existing) => existing.sequence === entry.sequence)) {
                throw Object.assign(new Error("duplicate"), { code: 11000 });
            }
            const saved = JSON.parse(JSON.stringify(entry));
            saved.timestamp = new Date(entry.timestamp);
            mockStore.push(saved);
            return { ...saved, toObject: () => saved };
        }),
    },
}));

import {
    record,
    verifyChain,
    canonicalStringify,
    toPlain,
    diffFields,
    computeEntryHash,
    resetAuditStateForTests,
    AUDIT_ACTIONS,
    GENESIS_HASH,
} from "../../services/auditService.js";

const req = {
    user: { _id: "507f1f77bcf86cd799439011", email: "a@nmdoh.test", role: "editor" },
    identity: { authType: "local-jwt" },
    ip: "10.1.2.3",
    method: "PUT",
    originalUrl: "/api/docs/abc?x=1",
    headers: { "user-agent": "jest" },
};

beforeEach(() => {
    mockStore.length = 0;
    resetAuditStateForTests();
});

describe("canonical hashing helpers", () => {
    test("canonicalStringify sorts keys deterministically", () => {
        expect(canonicalStringify({ b: 1, a: { d: 2, c: [3, { f: 1, e: 0 }] } }))
            .toBe('{"a":{"c":[3,{"e":0,"f":1}],"d":2},"b":1}');
    });

    test("toPlain strips secrets and converts dates", () => {
        const plain = toPlain({ password: "x", refreshTokenHash: "y", when: new Date("2026-01-01T00:00:00Z"), keep: 1 });
        expect(plain).toEqual({ when: "2026-01-01T00:00:00.000Z", keep: 1 });
    });

    test("diffFields reports only changed fields", () => {
        expect(diffFields({ a: 1, b: [1, 2] }, { a: 1, b: [1, 3] }, ["a", "b", "c"]))
            .toEqual([{ field: "b", from: [1, 2], to: [1, 3] }]);
    });
});

describe("record + verifyChain", () => {
    test("entries are sequenced and linked to the previous hash", async () => {
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_UPDATE, documentId: "507f1f77bcf86cd799439012", changes: [{ field: "title", from: "A", to: "B" }] });
        await record(req, { action: AUDIT_ACTIONS.FILE_DOWNLOAD });
        await record(null, { action: AUDIT_ACTIONS.SYSTEM_MIGRATION });

        expect(mockStore.map((e) => e.sequence)).toEqual([1, 2, 3]);
        expect(mockStore[0].prevHash).toBe(GENESIS_HASH);
        expect(mockStore[1].prevHash).toBe(mockStore[0].hash);
        expect(mockStore[2].prevHash).toBe(mockStore[1].hash);
        expect(mockStore[0].actor.email).toBe("a@nmdoh.test");
        expect(mockStore[0].request).toEqual({ ip: "10.1.2.3", userAgent: "jest", method: "PUT", path: "/api/docs/abc" });
        expect(mockStore[2].actor.id).toBeNull();

        await expect(verifyChain()).resolves.toEqual({ valid: true, checked: 3, firstInvalidSequence: null, reason: null });
    });

    test("concurrent records keep a linear chain", async () => {
        await Promise.all(Array.from({ length: 10 }, (_, i) => record(req, { action: AUDIT_ACTIONS.DOCUMENT_VIEW, metadata: { i } })));
        expect(mockStore.map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect((await verifyChain()).valid).toBe(true);
    });

    test("actorUser overrides the request user (login events)", async () => {
        await record({ ip: "1.1.1.1", headers: {} }, {
            action: AUDIT_ACTIONS.AUTH_LOGIN,
            actorUser: { _id: "507f1f77bcf86cd799439099", email: "new@nmdoh.test", role: "viewer" },
        });
        expect(mockStore[0].actor).toMatchObject({ id: "507f1f77bcf86cd799439099", email: "new@nmdoh.test", role: "viewer" });
    });

    test("editing an entry is detected", async () => {
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_VIEW });
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_DELETE, summary: "Deleted" });
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_VIEW });
        mockStore[1].summary = "Nothing happened";
        await expect(verifyChain()).resolves.toMatchObject({ valid: false, firstInvalidSequence: 2, reason: "hash-mismatch" });
    });

    test("deleting an entry is detected", async () => {
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_VIEW });
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_DELETE });
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_VIEW });
        mockStore.splice(1, 1);
        await expect(verifyChain()).resolves.toMatchObject({ valid: false, firstInvalidSequence: 2, reason: "missing-entry" });
    });

    test("re-hashing a forged entry still breaks the next link", async () => {
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_VIEW });
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_DELETE });
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_VIEW });
        mockStore[1].summary = "forged";
        mockStore[1].hash = computeEntryHash(mockStore[1]);
        await expect(verifyChain()).resolves.toMatchObject({ valid: false, firstInvalidSequence: 3, reason: "broken-link" });
    });
});
