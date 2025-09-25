/*
 * @name booksRoutes
 * @file /docman/backend/src/routes/booksRoutes.js
 * @routes booksRoutes
 * @description Book management routes for organizing documents into collections
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import express from "express";
import { verifyAccessToken } from "../lib/secretToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
    getAllBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook,
    addDocumentToBook,
    removeDocumentFromBook
} from "../controllers/booksController.js";

/**
 * Express router for book management endpoints
 * Handles book CRUD operations and document organization
 * All routes require authentication with role-based access control
 * @type {express.Router}
 */
const router = express.Router();

// GET /api/books - Get all books (all authenticated users can view books)
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getAllBooks);

// GET /api/books/:id - Get a specific book by ID (all authenticated users can view)
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"), getBookById);

// POST /api/books - Create a new book (editors, admins, and superadmins can create books)
router.post("/", verifyAccessToken, requireRole("editor", "admin", "superadmin"), createBook);

// PUT /api/books/:id - Update a book (editors, admins, and superadmins can update, owners can update their books)
router.put("/:id", verifyAccessToken, requireRole("editor", "admin", "superadmin"), updateBook);

// DELETE /api/books/:id - Delete a book (only admins, superadmins, and owners can delete books)
router.delete("/:id", verifyAccessToken, requireRole("editor", "admin", "superadmin"), deleteBook);

// POST /api/books/:id/documents - Add document to book (editors, admins, and superadmins can modify)
router.post("/:id/documents", verifyAccessToken, requireRole("editor", "admin", "superadmin"), addDocumentToBook);

// DELETE /api/books/:id/documents/:documentId - Remove document from book (editors, admins, and superadmins can modify)
router.delete("/:id/documents/:documentId", verifyAccessToken, requireRole("editor", "admin", "superadmin"), removeDocumentFromBook);

export default router;