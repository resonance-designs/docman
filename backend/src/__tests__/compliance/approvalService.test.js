/*
 * @name approvalService Tests
 * @file /docman/backend/src/__tests__/compliance/approvalService.test.js
 * @description Change-approval workflow: separation of duties, approver checks, thresholds, publishing.
 * @version 2.3.0
 * @license UNLICENSED
 */
import { jest } from "@jest/globals";

const mockFiles = [];

function mockMatches(file, filter) {
    return Object.entries(filter).every(([key, value]) => {
        if (key === "_id") return String(file._id) === String(value?.$ne ? "__never__" : value) || (value?.$ne && String(file._id) !== String(value.$ne));
        if (key === "approvals.user") return !(file.approvals || []).some((a) => String(a.user) === String(value.$ne));
        if (key === "documentId") return String(file.documentId) === String(value);
        if (value?.$in) return value.$in.includes(file[key]);
        return file[key] === value;
    });
}

function mockFileDoc(data) {
    const file = { approvals: [], ...data };
    file.save = jest.fn(async () => file);
    return file;
}

jest.mock("../../models/File.js", () => {
    function File(data) {
        Object.assign(this, { approvals: [], ...data });
        this._id = `file${mockFiles.length + 1}`;
        this.version = mockFiles.filter((f) => f.documentId === data.documentId).length + 1;
        this.save = jest.fn(async () => {
            if (!mockFiles.includes(this)) mockFiles.push(this);
            return this;
        });
    }
    File.findOne = jest.fn((filter) => {
        const found = mockFiles.find((f) => mockMatches(f, filter)) || null;
        const result = Promise.resolve(found);
        result.lean = () => Promise.resolve(found);
        return result;
    });
    File.findOneAndUpdate = jest.fn(async (filter, update) => {
        const found = mockFiles.find((f) => mockMatches(f, filter));
        if (!found) return null;
        if (update.$push) for (const [k, v] of Object.entries(update.$push)) found[k] = [...(found[k] || []), v];
        if (update.$set) Object.assign(found, update.$set);
        return found;
    });
    File.updateMany = jest.fn(async (filter, update) => {
        mockFiles
            .filter((f) => String(f.documentId) === String(filter.documentId) && f.status === filter.status && String(f._id) !== String(filter._id.$ne))
            .forEach((f) => Object.assign(f, update.$set));
    });
    return { __esModule: true, default: File };
});
jest.mock("../../models/Doc.js", () => ({ __esModule: true, default: {
    find: jest.fn(), findOneAndUpdate: jest.fn(), findById: jest.fn(), updateOne: jest.fn(),
} }));
const mockAudit = [];
jest.mock("../../services/auditService.js", () => ({
    __esModule: true,
    record: jest.fn(async (_req, event) => {
        // Contract of auditService.record; its actual database arbitration is tested separately.
        if (event.action === "version_publish" && mockAudit.some(e => e.action === event.action && e.resourceId === event.resourceId)) return null;
        mockAudit.push({ outcome: "success", ...event }); return null;
    }),
    AUDIT_ACTIONS: new Proxy({}, { get: (_, key) => String(key).toLowerCase() }),
}));
jest.mock("../../services/revisionService.js", () => ({
    __esModule: true,
    recordRevision: jest.fn(async () => ({ revision: null, changes: [] })),
    snapshotDocument: jest.fn((doc) => ({ currentVersion: doc.currentVersion })),
}));
jest.mock("../../lib/fileIntegrity.js", () => ({ __esModule: true, sha256File: jest.fn(async () => "a".repeat(64)) }));
jest.mock("fs", () => ({ __esModule: true, default: { promises: { unlink: jest.fn(async () => {}) } } }));

import Doc from "../../models/Doc.js";
import File from "../../models/File.js";
import { record } from "../../services/auditService.js";
import {
    submitVersion,
    approveVersion,
    rejectVersion,
    withdrawVersion,
    canAccessFileVersion,
    WorkflowError,
} from "../../services/approvalService.js";

const ids = {
    uploader: "507f1f77bcf86cd799439001",
    approverA: "507f1f77bcf86cd799439002",
    approverB: "507f1f77bcf86cd799439003",
    outsider: "507f1f77bcf86cd799439004",
    admin: "507f1f77bcf86cd799439005",
};
const reqFor = (key, role = "editor") => ({ user: { id: ids[key], _id: ids[key], role }, headers: {} });

let doc;
const upload = { filename: "f.pdf", originalname: "Policy.pdf", path: "/tmp/f.pdf", mimetype: "application/pdf", size: 10 };

beforeEach(() => {
    mockFiles.length = 0;
    mockAudit.length = 0;
    record.mockClear();
    delete process.env.APPROVAL_REQUIRED;
    delete process.env.APPROVAL_MIN_APPROVALS;
    delete process.env.APPROVAL_ALLOW_SELF_APPROVAL;
    doc = {
        _id: "doc1",
        author: ids.uploader,
        owners: [ids.uploader],
        approvers: [ids.approverA, ids.approverB],
        currentVersion: 0,
        latestVersion: 0,
        versionHistory: [],
        save: jest.fn(async () => doc),
    };
    Doc.findOneAndUpdate.mockImplementation(async (filter, update) => {
        if (doc.versionHistory.some((entry) => entry.version === filter["versionHistory.version"].$ne)) return null;
        Object.assign(doc, update.$set);
        doc.versionHistory.push(update.$push.versionHistory);
        return doc;
    });
    Doc.findById.mockImplementation(async () => doc);
    Doc.updateOne.mockResolvedValue({ matchedCount: 1 });
});

describe("submitVersion", () => {
    test("new uploads wait for approval and do not change the published version", async () => {
        const file = await submitVersion(reqFor("uploader"), doc, upload, { changelog: "first" });
        expect(file.status).toBe("pending_approval");
        expect(file.sha256).toHaveLength(64);
        expect(doc.currentVersion).toBe(0);
        expect(doc.latestVersion).toBe(1);
    });

    test("only one pending version at a time", async () => {
        await submitVersion(reqFor("uploader"), doc, upload);
        await expect(submitVersion(reqFor("uploader"), doc, upload)).rejects.toMatchObject({ statusCode: 409 });
    });

    test("APPROVAL_REQUIRED=false publishes immediately", async () => {
        process.env.APPROVAL_REQUIRED = "false";
        const file = await submitVersion(reqFor("uploader"), doc, upload);
        expect(file.status).toBe("approved");
        expect(doc.currentVersion).toBe(1);
        expect(doc.versionHistory).toHaveLength(1);
    });
});

describe("approve / reject / withdraw", () => {
    beforeEach(async () => {
        await submitVersion(reqFor("uploader"), doc, upload);
    });

    test("uploader cannot approve their own version (even as admin)", async () => {
        await expect(approveVersion(reqFor("uploader", "admin"), doc, 1)).rejects.toMatchObject({ statusCode: 403 });
        expect(record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ outcome: "denied" }));
    });

    test("non-approver cannot approve", async () => {
        await expect(approveVersion(reqFor("outsider"), doc, 1)).rejects.toBeInstanceOf(WorkflowError);
    });

    test("one approval publishes by default and supersedes the previous version", async () => {
        const result = await approveVersion(reqFor("approverA"), doc, 1, "Looks good");
        expect(result.published).toBe(true);
        expect(doc.currentVersion).toBe(1);

        await submitVersion(reqFor("uploader"), doc, upload);
        await approveVersion(reqFor("admin", "admin"), doc, 2);
        expect(doc.currentVersion).toBe(2);
        expect(mockFiles.find((f) => f.version === 1).status).toBe("superseded");
        expect(mockFiles.find((f) => f.version === 2).status).toBe("approved");
    });

    test("failed publication can be retried without duplicate history", async () => {
        Doc.findOneAndUpdate.mockRejectedValueOnce(new Error("database unavailable"));
        await expect(approveVersion(reqFor("approverA"), doc, 1)).rejects.toThrow("database unavailable");
        expect(mockFiles[0].status).toBe("publishing");
        expect(doc.currentVersion).toBe(0);
        const result = await approveVersion(reqFor("approverA"), doc, 1);
        expect(result.published).toBe(true);
        expect(doc.versionHistory).toHaveLength(1);
        expect(mockFiles[0].status).toBe("approved");
    });

    test("publication failure after pointer update resumes without appending history twice", async () => {
        File.updateMany.mockRejectedValueOnce(new Error("interrupted"));
        await expect(approveVersion(reqFor("approverA"), doc, 1)).rejects.toThrow("interrupted");
        expect(doc.versionHistory).toHaveLength(1);
        expect(mockFiles[0].status).toBe("publishing");
        await approveVersion(reqFor("approverA"), doc, 1);
        expect(doc.versionHistory).toHaveLength(1);
        expect(mockFiles[0].status).toBe("approved");
    });

    test("retrying an interrupted publication logs version_publish only once", async () => {
        File.updateMany.mockRejectedValueOnce(new Error("interrupted"));
        await expect(approveVersion(reqFor("approverA"), doc, 1)).rejects.toThrow("interrupted");
        await approveVersion(reqFor("approverA"), doc, 1);
        expect(mockAudit.filter((entry) => entry.action === "version_publish")).toHaveLength(1);
        expect(mockAudit.filter((entry) => entry.action === "version_approve")).toHaveLength(1);
    });

    test("recovering a version stuck in pending does not log a second approval", async () => {
        mockFiles[0].approvals.push({ user: ids.approverA, decision: "approved", comment: "", decidedAt: new Date() });
        const result = await approveVersion(reqFor("approverA"), doc, 1);
        expect(result.published).toBe(true);
        expect(mockAudit.filter((entry) => entry.action === "version_approve")).toHaveLength(0);
        expect(mockAudit.filter((entry) => entry.action === "version_publish")).toHaveLength(1);
    });

    test("APPROVAL_MIN_APPROVALS=2 needs two distinct approvers", async () => {
        process.env.APPROVAL_MIN_APPROVALS = "2";
        const first = await approveVersion(reqFor("approverA"), doc, 1);
        expect(first.published).toBe(false);
        await expect(approveVersion(reqFor("approverA"), doc, 1)).rejects.toMatchObject({ statusCode: 409 });
        const second = await approveVersion(reqFor("approverB"), doc, 1);
        expect(second.published).toBe(true);
        expect(doc.currentVersion).toBe(1);
    });

    test("reject requires a comment and blocks publishing", async () => {
        await expect(rejectVersion(reqFor("approverA"), doc, 1, "  ")).rejects.toMatchObject({ statusCode: 400 });
        const { file } = await rejectVersion(reqFor("approverA"), doc, 1, "Section 3 is outdated");
        expect(file.status).toBe("rejected");
        expect(file.rejectionReason).toBe("Section 3 is outdated");
        await expect(approveVersion(reqFor("approverB"), doc, 1)).rejects.toMatchObject({ statusCode: 409 });
        expect(doc.currentVersion).toBe(0);
    });

    test("only the uploader or an admin can withdraw", async () => {
        await expect(withdrawVersion(reqFor("approverA"), doc, 1)).rejects.toMatchObject({ statusCode: 403 });
        const { file } = await withdrawVersion(reqFor("uploader"), doc, 1);
        expect(file.status).toBe("withdrawn");
    });
});

describe("canAccessFileVersion", () => {
    const docForAccess = { author: ids.uploader, owners: [ids.uploader], approvers: [ids.approverA] };
    test("published versions are visible to any reader", () => {
        expect(canAccessFileVersion(docForAccess, { status: "approved" }, { id: ids.outsider, role: "viewer" })).toBe(true);
        expect(canAccessFileVersion(docForAccess, { status: undefined }, { id: ids.outsider, role: "viewer" })).toBe(true);
    });
    test("pending versions are visible only to editors, approvers and the uploader", () => {
        const pending = { status: "pending_approval", uploadedBy: ids.uploader };
        expect(canAccessFileVersion(docForAccess, pending, { id: ids.outsider, role: "viewer" })).toBe(false);
        expect(canAccessFileVersion(docForAccess, pending, { id: ids.approverA, role: "viewer" })).toBe(true);
        expect(canAccessFileVersion(docForAccess, pending, { id: ids.uploader, role: "viewer" })).toBe(true);
    });
});
