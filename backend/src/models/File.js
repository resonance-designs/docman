/*
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalname: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Doc", required: true },
    version: { type: Number, default: 1 }, // Version number for this file
    versionLabel: { type: String, default: "Initial Version" }, // Label for this version
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who uploaded this version
    changelog: { type: String, default: "" }, // Description of changes in this version
});

fileSchema.index({ documentId: 1, version: 1 });

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

