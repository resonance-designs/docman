import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import uploadMid from "../middleware/uploadMid.js";
import {
    getAllDocs,
    getDocById,
    createDoc,
    updateDoc,
    deleteDoc,
    getDocFiles,
    markDocAsReviewed,
} from "../controllers/docsController.js";
import { uploadFileVersion } from "../controllers/uploadFileController.js";

const router = express.Router();

// Public: Everyone can view documents
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllDocs);
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getDocById);
router.get("/:id/files", verifyAccessToken, requireRole("viewer", "editor", "admin"), getDocFiles);

// Restricted: Only editors & admins can create/upload
router.post("/", verifyAccessToken, requireRole("editor", "admin"), uploadMid.single("file"), createDoc);
router.post("/:id/upload", verifyAccessToken, requireRole("editor", "admin"), uploadMid.single("file"), uploadFileVersion);

// Restricted: Only editors & admins can update
router.put("/:id", verifyAccessToken, requireRole("editor", "admin"), uploadMid.none(), updateDoc);
router.put("/:id/review", verifyAccessToken, requireRole("editor", "admin"), markDocAsReviewed);

// Restricted: Only admins can delete
router.delete("/:id", verifyAccessToken, requireRole("admin"), deleteDoc);

export default router;
