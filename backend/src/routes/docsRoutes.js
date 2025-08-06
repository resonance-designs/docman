import express from 'express';
import { getAllDocs, getDocById, createDoc, updateDoc, deleteDoc } from '../controllers/docsController.js';

const router = express.Router();

router.get("/", getAllDocs);
router.get("/:id", getDocById);
router.post("/", createDoc);
router.put("/:id", updateDoc);
router.delete("/:id", deleteDoc);

export default router;