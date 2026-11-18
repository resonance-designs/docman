/*
 * @name documentUpload
 * @file /docman/backend/src/middleware/documentUpload.js
 * @description Upload middleware for document files. Applies the superadmin-configured maximum upload size and
 *              encryption-at-rest setting on every request, and streams through the encrypting storage engine.
 *              Profile images keep using uploadMid (they are not documents and are never encrypted).
 * @version 2.3.0
 * @license UNLICENSED
 */
import multer from "multer";
import { fileFilter, handleUploadError } from "./uploadMid.js";
import { encryptingStorage } from "../lib/encryptingStorage.js";
import { getStorageSettings } from "../services/storageSettingsService.js";

const uploaders = new Map();

function uploaderFor(field, maxUploadMB, encrypt) {
    const cacheKey = `${field}:${maxUploadMB}:${encrypt}`;
    if (!uploaders.has(cacheKey)) {
        uploaders.set(cacheKey, multer({
            storage: encryptingStorage({ encrypt }),
            fileFilter,
            limits: {
                fileSize: maxUploadMB * 1024 * 1024,
                files: 1,
                fields: 32,
                fieldNameSize: 100,
                fieldSize: 1024 * 1024,
            },
        }).single(field));
    }
    return uploaders.get(cacheKey);
}

/**
 * @param {string} field - multipart field holding the file
 */
export function documentUpload(field = "file") {
    return async (req, res, next) => {
        let settings;
        try {
            settings = await getStorageSettings();
        } catch (error) {
            console.error("Could not load storage settings:", error);
            return res.status(503).json({ message: "Uploads are temporarily unavailable. Try again shortly." });
        }
        if (settings.encryptAtRest && !settings.encryptionReady) {
            // Fail closed: never silently store plaintext when encryption at rest is required.
            return res.status(503).json({
                message: "Encryption at rest is required but the server's encryption key is not configured. Contact an administrator.",
            });
        }
        req.uploadLimitMB = settings.maxUploadMB;
        return uploaderFor(field, settings.maxUploadMB, settings.encryptAtRest)(req, res, (error) => (
            error ? handleUploadError(error, req, res, next) : next()
        ));
    };
}

export default documentUpload;
