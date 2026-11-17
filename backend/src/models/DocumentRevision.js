/*
 * @name DocumentRevision
 * @file /docman/backend/src/models/DocumentRevision.js
 * @model DocumentRevision
 * @description Immutable metadata revision history for documents. Every create/update/delete/restore/publish of a
 *              document stores a full metadata snapshot plus the field-level diff from the previous revision.
 *              File content versions are tracked separately in the File model.
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import mongoose from "mongoose";

const documentRevisionSchema = new mongoose.Schema(
    {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
        revision: { type: Number, required: true },
        action: {
            type: String,
            enum: ["create", "update", "delete", "restore", "publish", "review"],
            required: true,
        },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String, default: "" },
        changes: [
            {
                _id: false,
                field: String,
                from: mongoose.Schema.Types.Mixed,
                to: mongoose.Schema.Types.Mixed,
            },
        ],
        snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    },
    { versionKey: false, minimize: false }
);

documentRevisionSchema.index({ documentId: 1, revision: 1 }, { unique: true });

const IMMUTABLE_MESSAGE = "Document revisions are immutable.";
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
    documentRevisionSchema.pre(operation, { document: false, query: true }, (next) => next(new Error(IMMUTABLE_MESSAGE)));
});
documentRevisionSchema.pre("save", function (next) {
    if (!this.isNew) return next(new Error(IMMUTABLE_MESSAGE));
    return next();
});

const DocumentRevision = mongoose.model("DocumentRevision", documentRevisionSchema);

export default DocumentRevision;
