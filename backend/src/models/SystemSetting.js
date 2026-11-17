/*
 * @name SystemSetting
 * @file /docman/backend/src/models/SystemSetting.js
 * @model SystemSetting
 * @description Runtime-switchable application settings (no secrets are stored here — credentials stay in env).
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true },
        value: { type: mongoose.Schema.Types.Mixed, default: null },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true, minimize: false }
);

const SystemSetting = mongoose.model("SystemSetting", systemSettingSchema);

export default SystemSetting;
