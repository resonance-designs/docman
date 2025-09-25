/*
 * @name externalContactsRoutes
 * @file /docman/backend/src/routes/externalContactsRoutes.js
 * @routes externalContactsRoutes
 * @description External contact management routes for stakeholder organization
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
    getAllExternalContactTypes,
    createExternalContactType,
    updateExternalContactType,
    deleteExternalContactType,
    getAllExternalContacts,
    createExternalContact,
    getExternalContactsByDocument,
    updateExternalContact,
    deleteExternalContact
} from "../controllers/externalContactsController.js";

/**
 * Express router for external contact management endpoints
 * Handles external contact CRUD operations and contact type management
 * All routes require authentication with role-based access control
 * @type {express.Router}
 */
const router = express.Router();

// GET /api/external-contacts/types - Get all external contact types (all authenticated users can view types)
router.get("/types", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getAllExternalContactTypes);

// POST /api/external-contacts/types - Create a new external contact type (only admins and superadmins can create types)
router.post("/types", verifyAccessToken, requireRole("admin", "superadmin"), createExternalContactType);

// PUT /api/external-contacts/types/:id - Update an external contact type (only admins and superadmins can update types)
router.put("/types/:id", verifyAccessToken, requireRole("admin", "superadmin"), updateExternalContactType);

// DELETE /api/external-contacts/types/:id - Delete an external contact type (only admins and superadmins can delete types)
router.delete("/types/:id", verifyAccessToken, requireRole("admin", "superadmin"), deleteExternalContactType);

// GET /api/external-contacts - Get all external contacts (only admins and superadmins can view all contacts)
router.get("/", verifyAccessToken, requireRole("admin", "superadmin"), getAllExternalContacts);

// POST /api/external-contacts - Create a new external contact (only admins and superadmins can create contacts)
router.post("/", verifyAccessToken, requireRole("admin", "superadmin"), createExternalContact);

// GET /api/external-contacts/document/:id - Get external contacts for a specific document (all authenticated users can view)
router.get("/document/:id", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getExternalContactsByDocument);

// PUT /api/external-contacts/:id - Update an external contact (only admins and superadmins can update contacts)
router.put("/:id", verifyAccessToken, requireRole("admin", "superadmin"), updateExternalContact);

// DELETE /api/external-contacts/:id - Delete an external contact (only admins and superadmins can delete contacts)
router.delete("/:id", verifyAccessToken, requireRole("admin", "superadmin"), deleteExternalContact);

export default router;