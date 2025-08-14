/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
    getAllExternalContactTypes,
    createExternalContactType,
    getAllExternalContacts,
    createExternalContact,
    getExternalContactsByDocument,
    updateExternalContact,
    deleteExternalContact
} from "../controllers/externalContactsController.js";

const router = express.Router();

// Public: Everyone can view external contact types
router.get("/types", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllExternalContactTypes);

// Restricted: Only admins can manage external contact types
router.post("/types", verifyAccessToken, requireRole("admin"), createExternalContactType);

// Restricted: Only admins can manage external contacts
router.get("/", verifyAccessToken, requireRole("admin"), getAllExternalContacts);
router.post("/", verifyAccessToken, requireRole("admin"), createExternalContact);
router.get("/document/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getExternalContactsByDocument);
router.put("/:id", verifyAccessToken, requireRole("admin"), updateExternalContact);
router.delete("/:id", verifyAccessToken, requireRole("admin"), deleteExternalContact);

export default router;