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
} from "../controllers/docsController.js";
import { uploadFileVersion } from "../controllers/uploadFileController.js";

const router = express.Router();

// Public: Everyone can view documents
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllDocs);
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getDocById);

// Restricted: Only editors & admins can create/upload
router.post("/", verifyAccessToken, requireRole("editor", "admin"), uploadMid.single("file"), createDoc);
router.post("/:id/upload", verifyAccessToken, requireRole("editor", "admin"), uploadMid.single("file"), uploadFileVersion);

// Restricted: Only editors & admins can update
router.put("/:id", verifyAccessToken, requireRole("editor", "admin"), updateDoc);

// Restricted: Only admins can delete
router.delete("/:id", verifyAccessToken, requireRole("admin"), deleteDoc);

export default router;
