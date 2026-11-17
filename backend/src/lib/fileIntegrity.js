/*
 * @name fileIntegrity
 * @file /docman/backend/src/lib/fileIntegrity.js
 * @description SHA-256 helpers for recording and verifying stored document files.
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";

/** Absolute directory where uploaded files are stored (matches uploadMid). */
export function getUploadDir() {
    return path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
}

/**
 * Resolve a stored filename to an absolute path inside the upload directory.
 * Refuses anything that would escape the directory.
 */
export function resolveStoredFile(filename) {
    if (!filename || typeof filename !== "string") return null;
    const base = getUploadDir();
    const resolved = path.resolve(base, path.basename(filename));
    if (!resolved.startsWith(base + path.sep)) return null;
    return resolved;
}

/** Stream a file through SHA-256. */
export function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);
        stream.on("error", reject);
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
    });
}
