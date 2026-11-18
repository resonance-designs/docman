/*
 * @name mediaRoutes
 * @file /docman/backend/src/routes/mediaRoutes.js
 * @routes mediaRoutes
 * @description Replaces the old public static /uploads folder. Only profile pictures and background images
 *              (referenced from a user record) are served here, because <img> tags cannot send auth headers.
 *              Document files are NEVER served from this route; they are downloaded through
 *              GET /api/docs/:id/files/:fileId/download, which checks access, verifies the checksum, and audits.
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import express from "express";
import fs from "fs";
import path from "path";
import File from '../models/File.js';
import User from "../models/User.js";
import { resolveStoredFile } from "../lib/fileIntegrity.js";

const router = express.Router();
const SAFE_NAME = /^[A-Za-z0-9._-]{1,200}$/;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

router.get("/:filename", async (req, res) => {
    try {
        const { filename } = req.params;
        if (!SAFE_NAME.test(filename) || !IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase())) {
            return res.status(404).end();
        }
        if (await File.exists({ filename })) return res.status(404).end();
        const isProfileMedia = await User.exists({
            $or: [{ profilePicture: filename }, { backgroundImage: filename }],
        });
        if (!isProfileMedia) {
            return res.status(404).end();
        }
        const absolutePath = resolveStoredFile(filename);
        if (!absolutePath || !fs.existsSync(absolutePath)) {
            return res.status(404).end();
        }
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, max-age=300");
        return res.sendFile(absolutePath);
    } catch (error) {
        console.error("Error serving profile media:", error);
        return res.status(500).end();
    }
});

export default router;
