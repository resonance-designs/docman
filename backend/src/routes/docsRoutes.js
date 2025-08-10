import express from "express";
import uploadMid from "../middleware/uploadMid.js"; // your multer middleware
import {
    getAllDocs,
    getDocById,
    createDoc,
    updateDoc,
    deleteDoc,
} from "../controllers/docsController.js";
import { uploadFileVersion } from "../controllers/uploadFileController.js";

const router = express.Router();

router.get("/", getAllDocs);
router.get("/:id", getDocById);
router.post("/", uploadMid.single("file"), createDoc);  // Add multer middleware here
router.post("/:id/upload", uploadMid.single("file"), uploadFileVersion);
router.put("/:id", updateDoc);
router.delete("/:id", deleteDoc);

export default router;
