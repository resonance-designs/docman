/*
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    // Encrypted at rest (see lib/storageEncryption.js). Transparent to users.
    encrypted: { type: Boolean, default: false },
    // SHA-256 of the file as uploaded/downloaded. `sha256` below is the SHA-256 of the bytes stored on disk
    // (identical for unencrypted files).
    contentSha256: { type: String, default: null },
    filename: { type: String, required: true },
    originalname: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    version: { type: Number, default: 1 }, // Version number for this file
    versionLabel: { type: String, default: "Initial Version" }, // Label for this version
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who uploaded this version
    changelog: { type: String, default: "" }, // Description of changes in this version
    // SHA-256 of the stored bytes, recorded at upload and verified on every download.
    sha256: { type: String, default: null },
    // Change-approval workflow. Legacy files (uploaded before 2.3.0) default to "approved".
    status: {
        type: String,
        enum: ["pending_approval", "publishing", "approved", "rejected", "withdrawn", "superseded"],
        default: "approved",
    },
    submittedAt: { type: Date, default: null },
    approvals: [{
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        decision: { type: String, enum: ["approved", "rejected"] },
        comment: { type: String, default: "" },
        decidedAt: { type: Date, default: Date.now },
    }],
    decidedAt: { type: Date, default: null },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, default: null },
    publishedAt: { type: Date, default: null },
    publicationBefore: { type: mongoose.Schema.Types.Mixed },
    approvalRequired: { type: Boolean, default: true },
});

fileSchema.index({ documentId: 1, status: 1 });

fileSchema.index({ documentId: 1, version: 1 }, { unique: true });
fileSchema.index({ documentId: 1 }, {
    unique: true,
    name: 'one_active_version_per_document',
    partialFilterExpression: { status: { $in: ['pending_approval', 'publishing'] } },
});

// Pre-save middleware to automatically set version numbers
fileSchema.pre('save', async function(next) {
    if (this.isNew) {
        // Find the latest version for this document
        const latestFile = await mongoose.model('File').findOne(
            { documentId: this.documentId },
            {},
            { sort: { version: -1 } }
        );
        
        // Set version number
        this.version = latestFile ? latestFile.version + 1 : 1;
        
        // Set default version label if none provided
        if (!this.versionLabel || this.versionLabel === "Initial Version") {
            this.versionLabel = `Version ${this.version}`;
        }
    }
    next();
});

export default mongoose.model("File", fileSchema);

