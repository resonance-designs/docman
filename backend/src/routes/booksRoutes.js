/*
 * @name booksRoutes
 * @file /docman/backend/src/routes/booksRoutes.js
 * @routes booksRoutes
 * @description Book management routes for organizing documents into collections
 * @author Richard Bakos
 * @version 2.1.10
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
router.get("/", verifyAccessToken, requireRole("viewer", "editor", "admin"), getAllBooks);

// GET /api/books/:id - Get a specific book by ID (all authenticated users can view)
router.get("/:id", verifyAccessToken, requireRole("viewer", "editor", "admin"), getBookById);

// POST /api/books - Create a new book (editors and admins can create books)
router.post("/", verifyAccessToken, requireRole("editor", "admin"), createBook);

// PUT /api/books/:id - Update a book (editors and admins can update, owners can update their books)
router.put("/:id", verifyAccessToken, requireRole("editor", "admin"), updateBook);

// DELETE /api/books/:id - Delete a book (only admins and owners can delete books)
router.delete("/:id", verifyAccessToken, requireRole("editor", "admin"), deleteBook);

// POST /api/books/:id/documents - Add document to book (editors and admins can modify)
router.post("/:id/documents", verifyAccessToken, requireRole("editor", "admin"), addDocumentToBook);

// DELETE /api/books/:id/documents/:documentId - Remove document from book (editors and admins can modify)
router.delete("/:id/documents/:documentId", verifyAccessToken, requireRole("editor", "admin"), removeDocumentFromBook);

export default router;