/*
 * @name documentAccess Tests
 * @file /docman/backend/src/__tests__/compliance/documentAccess.test.js
 * @description Per-document read/edit/approve rules and the middleware's 400/404/403 handling.
 * @version 2.3.0
 * @license UNLICENSED
 */
import { jest } from "@jest/globals";

jest.mock("../../models/Doc.js", () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock("../../services/auditService.js", () => ({
    __esModule: true,
    record: jest.fn(async () => null),
    AUDIT_ACTIONS: { ACCESS_DENIED: "access.denied" },
}));

import Doc from "../../models/Doc.js";
import { record } from "../../services/auditService.js";
import {
    canReadDocument,
    canEditDocument,
    canApproveDocument,
    canViewDocumentAudit,
    requireDocumentAccess,
} from "../../middleware/documentAccess.js";

const ids = {
    author: "507f1f77bcf86cd799439001",
    owner: "507f1f77bcf86cd799439002",
    stakeholder: "507f1f77bcf86cd799439003",
    approver: "507f1f77bcf86cd799439004",
    reviewer: "507f1f77bcf86cd799439005",
    outsider: "507f1f77bcf86cd799439006",
    doc: "507f1f77bcf86cd7994390aa",
};

const doc = {
    _id: ids.doc,
    author: ids.author,
    owners: [{ _id: ids.owner }],
    stakeholders: [ids.stakeholder],
    approvers: [ids.approver],
    reviewAssignees: [ids.reviewer],
};

const user = (key, role = "editor") => ({ id: ids[key], role });

describe("access rules", () => {
    test("read: involved users and admins only", () => {
        for (const key of ["author", "owner", "stakeholder", "approver", "reviewer"]) {
            expect(canReadDocument(doc, user(key, "viewer"))).toBe(true);
        }
        expect(canReadDocument(doc, user("outsider", "editor"))).toBe(false);
        expect(canReadDocument(doc, user("outsider", "admin"))).toBe(true);
    });

    test("edit: editor-role author/owner or admin; stakeholders and viewers cannot edit", () => {
        expect(canEditDocument(doc, user("author", "editor"))).toBe(true);
        expect(canEditDocument(doc, user("owner", "editor"))).toBe(true);
        expect(canEditDocument(doc, user("owner", "viewer"))).toBe(false);
        expect(canEditDocument(doc, user("stakeholder", "editor"))).toBe(false);
        expect(canEditDocument(doc, user("outsider", "editor"))).toBe(false);
        expect(canEditDocument(doc, user("outsider", "superadmin"))).toBe(true);
    });

    test("approve: designated approvers (owners only when none designated) and admins", () => {
        expect(canApproveDocument(doc, user("approver", "viewer"))).toBe(true);
        expect(canApproveDocument(doc, user("owner", "editor"))).toBe(false);
        expect(canApproveDocument({ ...doc, approvers: [] }, user("owner", "editor"))).toBe(true);
        expect(canApproveDocument(doc, user("outsider", "admin"))).toBe(true);
    });

    test("audit view: author, owners, approvers, admins", () => {
        expect(canViewDocumentAudit(doc, user("stakeholder"))).toBe(false);
        expect(canViewDocumentAudit(doc, user("approver"))).toBe(true);
    });
});

describe("requireDocumentAccess middleware", () => {
    function run(level, reqUser, params = { id: ids.doc }) {
        const req = { params, user: reqUser };
        const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
        const next = jest.fn();
        return requireDocumentAccess(level)(req, res, next).then(() => ({ req, res, next }));
    }

    beforeEach(() => {
        Doc.findById.mockImplementation(() => {
            const query = Promise.resolve(doc);
            query.setOptions = jest.fn(() => query);
            return query;
        });
        record.mockClear();
    });

    test("400 for malformed ids (no DB query)", async () => {
        const { res, next } = await run("read", user("author"), { id: "not-an-id" });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });

    test("404 when the document does not exist (or is soft-deleted)", async () => {
        Doc.findById.mockImplementation(() => Promise.resolve(null));
        const { res } = await run("read", user("author"));
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test("403 and an access.denied audit entry for outsiders", async () => {
        const { res, next } = await run("read", user("outsider"));
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
        expect(record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "access.denied", outcome: "denied" }));
    });

    test("stakeholder can read but not edit", async () => {
        const read = await run("read", user("stakeholder"));
        expect(read.next).toHaveBeenCalled();
        expect(read.req.document).toBe(doc);
        const edit = await run("edit", user("stakeholder"));
        expect(edit.res.status).toHaveBeenCalledWith(403);
    });
});
