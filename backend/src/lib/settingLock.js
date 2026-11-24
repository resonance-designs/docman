/*
 * @name settingLock
 * @file /docman/backend/src/lib/settingLock.js
 * @description Short-lived cross-process lock stored in the SystemSetting collection (unique `key`).
 *              Works on a standalone MongoDB (no transactions or replica set required). Used to serialize
 *              operations whose safety depends on a count, such as "at least one active superadmin remains".
 * @version 3.0.0
 * @license UNLICENSED
 */
import crypto from "crypto";
import SystemSetting from "../models/SystemSetting.js";

export class LockBusyError extends Error {
    constructor(message = "Another administrator is making a related change. Try again in a moment.") {
        super(message);
        this.name = "LockBusyError";
        this.statusCode = 409;
    }
}

/**
 * Run fn while holding the named lock. A crashed holder's lock expires after ttlMs.
 * @param {string} key - SystemSetting key used as the lock name
 * @param {Function} fn - async work to run under the lock
 * @param {Object} [options]
 * @param {number|null} [options.ttlMs=15000] null disables expiry; crashed holders require manual recovery.
 */
export async function withSettingLock(key, fn, { ttlMs = 15000 } = {}) {
    const holder = crypto.randomUUID();
    const now = new Date();
    try {
        await SystemSetting.findOneAndUpdate(
            { key, $or: [{ "value.holder": { $exists: false } }, ...(ttlMs === null ? [] : [{ "value.expiresAt": { $lt: now } }])] },
            { $set: { value: { holder, ...(ttlMs === null ? {} : { expiresAt: new Date(now.getTime() + ttlMs) }) } } },
            { upsert: true, new: true }
        );
    } catch (error) {
        // The lock row exists and is held: the upsert collides with the unique key.
        if (error?.code === 11000) throw new LockBusyError();
        throw error;
    }
    try {
        return await fn();
    } finally {
        let released = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await SystemSetting.updateOne({ key, "value.holder": holder }, { $set: { value: {} } });
                released = true;
                break;
            } catch {
                if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
            }
        }
        // Do not misreport a committed mutation as failed, or take over a slow writer.
        if (!released) console.error('Setting lock release failed; guard may remain retained:', key,
            'Stop and verify ALL writers are inactive before holder-matched recovery.', holder);
    }
}

export default withSettingLock;
