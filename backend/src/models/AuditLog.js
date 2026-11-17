/*
 * @name AuditLog
 * @file /docman/backend/src/models/AuditLog.js
 * @model AuditLog
 * @description Append-only, hash-chained audit trail. Entries can be inserted but never updated or deleted
 *              through the application. Each entry stores the SHA-256 hash of the previous entry so tampering
 *              (edits, deletions, re-ordering) is detectable with auditService.verifyChain().
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import mongoose from "mongoose";

const changeSchema = new mongoose.Schema(
    {
        field: { type: String, required: true },
        from: { type: mongoose.Schema.Types.Mixed },
        to: { type: mongoose.Schema.Types.Mixed },
    },
    { _id: false }
);

const auditLogSchema = new mongoose.Schema(
    {
        sequence: { type: Number, required: true, unique: true },
        timestamp: { type: Date, required: true, default: Date.now },
        action: { type: String, required: true },
        outcome: { type: String, enum: ["success", "denied", "failure"], default: "success" },
        actor: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
            email: { type: String, default: null },
            role: { type: String, default: null },
            authType: { type: String, default: null },
        },
        resourceType: { type: String, default: null },
        resourceId: { type: String, default: null },
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", default: null },
        summary: { type: String, default: "" },
        changes: { type: [changeSchema], default: [] },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        request: {
            ip: { type: String, default: null },
            userAgent: { type: String, default: null },
            method: { type: String, default: null },
            path: { type: String, default: null },
        },
        prevHash: { type: String, required: true },
        hash: { type: String, required: true },
    },
    { versionKey: false, minimize: false }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ "actor.id": 1, timestamp: -1 });
auditLogSchema.index({ documentId: 1, timestamp: -1 });

const IMMUTABLE_MESSAGE = "Audit log entries are append-only and cannot be modified or deleted.";

function rejectMutation(next) {
    next(new Error(IMMUTABLE_MESSAGE));
}

[
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
].forEach((operation) => {
    auditLogSchema.pre(operation, { document: false, query: true }, rejectMutation);
});

auditLogSchema.pre("deleteOne", { document: true, query: false }, rejectMutation);

auditLogSchema.pre("save", function (next) {
    if (!this.isNew) {
        return next(new Error(IMMUTABLE_MESSAGE));
    }
    return next();
});

auditLogSchema.statics.IMMUTABLE_MESSAGE = IMMUTABLE_MESSAGE;

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
