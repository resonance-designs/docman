/*
 * @name externalContactsRoutes
 * @file /docman/backend/src/routes/externalContactsRoutes.js
 * @routes externalContactsRoutes
 * @description External contact management routes for stakeholder organization
 * @author Richard Bakos
 * @version 2.0.0
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

/**
 * Express router for external contact management endpoints
 * Handles external contact CRUD operations and contact type management
 * All routes require authentication with role-based access control
 * @type {express.Router}
 */
const router = express.Router();

// GET /api/external-contacts/types - Get all external contact types (all authenticated users can view types)
router.get("/types", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllExternalContactTypes);

// POST /api/external-contacts/types - Create a new external contact type (only admins can create types)
router.post("/types", verifyAccessToken, requireRole("admin"), createExternalContactType);

// GET /api/external-contacts - Get all external contacts (only admins can view all contacts)
router.get("/", verifyAccessToken, requireRole("admin"), getAllExternalContacts);

// POST /api/external-contacts - Create a new external contact (only admins can create contacts)
router.post("/", verifyAccessToken, requireRole("admin"), createExternalContact);

// GET /api/external-contacts/document/:id - Get external contacts for a specific document (all authenticated users can view)
router.get("/document/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getExternalContactsByDocument);

// PUT /api/external-contacts/:id - Update an external contact (only admins can update contacts)
router.put("/:id", verifyAccessToken, requireRole("admin"), updateExternalContact);

// DELETE /api/external-contacts/:id - Delete an external contact (only admins can delete contacts)
router.delete("/:id", verifyAccessToken, requireRole("admin"), deleteExternalContact);

export default router;