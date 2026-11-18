/*
 * @name FileProtection
 * @file /docman/backend/src/models/FileProtection.js
 * @model FileProtection
 * @description Encryption-at-rest metadata for one stored file version (same _id as the File record).
 *              Kept out of the File collection so wrapped keys never appear in file listings.
 * @version 3.0.0
 * @license UNLICENSED
 */
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    format: { type: String, required: true },
    chunkSize: { type: Number, required: true },
    noncePrefix: { type: String, required: true },
    wrappedKey: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('FileProtection', schema);
