/*
 * @name storageSettingsController
 * @file /docman/backend/src/controllers/storageSettingsController.js
 * @description GET/PUT /api/system/storage — encryption at rest and maximum upload size (superadmin to change).
 * @version 2.3.0
 * @license UNLICENSED
 */
import { getStorageSettings, saveStorageSettings, validateStorageInput } from "../services/storageSettingsService.js";
import { record, AUDIT_ACTIONS } from "../services/auditService.js";

function publicView(settings, user) {
    const view = { maxUploadMB: settings.maxUploadMB, encryptAtRest: settings.encryptAtRest };
    if (user?.role === "superadmin") {
        Object.assign(view, {
            encryptionReady: settings.encryptionReady,
            maxUploadCeilingMB: settings.maxUploadCeilingMB,
            saved: settings.saved,
            updatedAt: settings.updatedAt,
        });
    }
    return view;
}

export async function getStorageSettingsHandler(req, res) {
    try {
        res.setHeader("Cache-Control", "no-store");
        return res.json(publicView(await getStorageSettings(), req.user));
    } catch (error) {
        console.error("Could not load storage settings:", error);
        return res.status(503).json({ message: "Could not load storage settings." });
    }
}

export async function updateStorageSettingsHandler(req, res) {
    let input;
    try {
        input = validateStorageInput(req.body);
    } catch (error) {
        return res.status(error.statusCode || 400).json({ message: error.message });
    }
    try {
        const before = await getStorageSettings({ fresh: true });
        const after = await saveStorageSettings(input, req.user?._id || req.user?.id || null);
        await record(req, {
            action: AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE,
            resourceType: "systemSetting",
            resourceId: "documents.storage",
            summary: "Changed document storage settings",
            changes: ["encryptAtRest", "maxUploadMB"]
                .filter((field) => before[field] !== after[field])
                .map((field) => ({ field, from: before[field], to: after[field] })),
        });
        return res.json(publicView(after, req.user));
    } catch (error) {
        console.error("Could not save storage settings:", error);
        return res.status(error.statusCode || 503).json({ message: error.statusCode ? error.message : "Could not save storage settings." });
    }
}
