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
 * @param {number} [options.ttlMs=15000]
 */
export async function withSettingLock(key, fn, { ttlMs = 15000 } = {}) {
    const holder = crypto.randomUUID();
    const now = new Date();
    try {
        await SystemSetting.findOneAndUpdate(
            { key, $or: [{ "value.holder": { $exists: false } }, { "value.expiresAt": { $lt: now } }] },
            { $set: { value: { holder, expiresAt: new Date(now.getTime() + ttlMs) } } },
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
        await SystemSetting.updateOne({ key, "value.holder": holder }, { $set: { value: {} } }).catch(() => {});
    }
}

export default withSettingLock;
