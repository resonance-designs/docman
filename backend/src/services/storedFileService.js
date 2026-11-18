/*
 * @name storedFileService
 * @file /docman/backend/src/services/storedFileService.js
 * @description Links stored (possibly encrypted) upload bytes to File records and opens them for download.
 *              Encryption is transparent: there are no user-held keys or document passwords. Who may download a
 *              file is decided by document permissions and the approval workflow; every download is audited.
 * @version 2.3.0
 * @license UNLICENSED
 */
import fs from "node:fs";
import FileProtection from "../models/FileProtection.js";
import { createDecryptStream } from "../lib/storageEncryption.js";

/** Persist encryption metadata for an uploaded file before its File record is created. */
export async function saveProtection(uploaded, documentId) {
    if (!uploaded?.encrypted) return null;
    return FileProtection.create({ _id: uploaded.fileId, documentId, ...uploaded.protection });
}

export async function removeProtection(fileId) {
    await FileProtection.deleteOne({ _id: fileId }).catch(() => {});
}

/**
 * Open a stored file for reading as plaintext.
 * @returns {Promise<import('stream').Readable>} plaintext stream (decrypting when the file is encrypted)
 */
export async function openStoredFile(file, absolutePath) {
    const source = fs.createReadStream(absolutePath);
    if (!file.encrypted) return source;
    const protection = await FileProtection.findById(file._id).lean();
    if (!protection) {
        source.destroy();
        throw Object.assign(new Error("Encryption metadata for this file is missing."), { statusCode: 409, integrity: true });
    }
    let decrypt;
    try {
        decrypt = createDecryptStream(file._id, protection);
    } catch (error) {
        source.destroy();
        throw error;
    }
    source.on("error", (error) => decrypt.destroy(error));
    return source.pipe(decrypt);
}
