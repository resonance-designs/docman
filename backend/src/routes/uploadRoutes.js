/*
 * @name uploadRoutes
 * @file /docman/backend/src/routes/uploadRoutes.js
 * @routes uploadRoutes
 * @description File upload routes for handling document uploads and file management
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import express from "express";
import uploadMid, { handleUploadError } from "../middleware/uploadMid.js";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * POST /upload - Upload a file (authenticated users only)
 * Requires authentication and appropriate role permissions
 */
router.post("/",
    verifyAccessToken, // Require authentication
    requireRole("editor", "admin", "superadmin"), // Only editors, admins, and superadmins can upload files
    (req, res, next) => {
        uploadMid.single("file")(req, res, (err) => {
            if (err) {
                return handleUploadError(err, req, res, next);
            }

            // Check if file was actually uploaded
            if (!req.file) {
                return res.status(400).json({
                    message: "No file uploaded."
                });
            }

            // Log successful upload for security monitoring
            console.log(`File uploaded by user ${req.user.id}: ${req.file.originalname} -> ${req.file.filename}`);

            res.status(201).json({
                message: "File uploaded successfully",
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                url: `/uploads/${req.file.filename}`,
            });
        });
    }
);

export default router;
