/*
 * @name storageSettingsService
 * @file /docman/backend/src/services/storageSettingsService.js
 * @description Superadmin-managed document storage settings: encryption at rest and maximum upload size.
 *              Stored in SystemSetting "documents.storage". Secrets (the master key) stay in the environment.
 * @version 3.0.0
 * @license UNLICENSED
 */
import SystemSetting from "../models/SystemSetting.js";
import { documentKeyReady } from "../lib/storageEncryption.js";

export const STORAGE_SETTING_KEY = "documents.storage";
export const DEFAULT_MAX_UPLOAD_MB = 50;
const CACHE_MS = 15000;
let cache = null;

/** Hard ceiling an administrator cannot exceed from the UI (also bounded by the reverse proxy body limit). */
export function maxUploadCeilingMB() {
    const value = Number.parseInt(process.env.MAX_UPLOAD_MB_CEILING || "250", 10);
    return Number.isFinite(value) ? Math.min(Math.max(value, 1), 2048) : 250;
}

export class StorageSettingsError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

/**
 * Effective storage settings.
 * When no setting has been saved, files are encrypted at rest whenever a master key is configured.
 */
export async function getStorageSettings({ fresh = false } = {}) {
    if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
    const row = await SystemSetting.findOne({ key: STORAGE_SETTING_KEY }).lean();
    const saved = row?.value || {};
    const ceiling = maxUploadCeilingMB();
    const encryptionReady = documentKeyReady();
    const value = {
        encryptAtRest: typeof saved.encryptAtRest === "boolean" ? saved.encryptAtRest : encryptionReady,
        encryptionReady,
        maxUploadMB: Math.min(Number.isInteger(saved.maxUploadMB) ? saved.maxUploadMB : DEFAULT_MAX_UPLOAD_MB, ceiling),
        maxUploadCeilingMB: ceiling,
        saved: Boolean(row),
        updatedAt: row?.updatedAt || null,
    };
    cache = { at: Date.now(), value };
    return value;
}

export function validateStorageInput(body = {}) {
    const { encryptAtRest, maxUploadMB } = body || {};
    if (typeof encryptAtRest !== "boolean") throw new StorageSettingsError("encryptAtRest must be true or false.");
    const ceiling = maxUploadCeilingMB();
    if (!Number.isInteger(maxUploadMB) || maxUploadMB < 1 || maxUploadMB > ceiling) {
        throw new StorageSettingsError(`Maximum upload size must be a whole number of megabytes between 1 and ${ceiling}.`);
    }
    if (encryptAtRest && !documentKeyReady()) {
        throw new StorageSettingsError("Encryption at rest needs DOCUMENT_ENCRYPTION_KEY configured on the server first.", 409);
    }
    return { encryptAtRest, maxUploadMB };
}

export async function saveStorageSettings(input, userId = null) {
    const value = validateStorageInput(input);
    await SystemSetting.findOneAndUpdate(
        { key: STORAGE_SETTING_KEY },
        { $set: { value, updatedBy: userId } },
        { upsert: true, runValidators: true }
    );
    cache = null;
    return getStorageSettings({ fresh: true });
}

/** Test helper. */
export function resetStorageSettingsCache() {
    cache = null;
}
