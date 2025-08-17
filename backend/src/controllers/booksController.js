/*
 * @name booksController
 * @file /docman/backend/src/controllers/booksController.js
 * @controller booksController
 * @description Book management controller for organizing documents into collections
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import Book from "../models/Book.js";
import Category from "../models/Category.js";

/**
 * Get all books with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with books and pagination metadata
 */
export async function getAllBooks(req, res) {
    try {
        const { limit = 50, page = 1, team, project, category } = req.query;
        
        // Parse pagination
        const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 books per page
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * limitNum;

        // Build filter query
        const filter = {};
        if (team) filter.teams = team;
        if (project) filter.projects = project;
        if (category) filter.category = category;

        // Execute query with pagination
        const [books, totalCount] = await Promise.all([
            Book.find(filter)
                .populate('author', 'name email')
                .populate('category', 'name type')
                .populate('owners', 'name email')
                .populate('stakeholders', 'name email')
                .populate('teams', 'name')
                .populate('projects', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Book.countDocuments(filter)
        ]);

        res.status(200).json({
            books,
            pagination: {
                total: totalCount,
                page: Math.max(parseInt(page) || 1, 1),
                limit: limitNum,
                pages: Math.ceil(totalCount / limitNum)
            }
        });
    } catch (error) {
        console.error("Error fetching books:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get a single book by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with book data or error message
 */
export async function getBookById(req, res) {
    try {
        const book = await Book.findById(req.params.id)
            .populate('author', 'name email')
            .populate('category', 'name type')
            .populate('documents', 'title description reviewDate reviewCompleted')
            .populate('owners', 'name email')
            .populate('stakeholders', 'name email')
            .populate('teams', 'name description')
            .populate('projects', 'name description status')
            .populate('lastUpdatedBy', 'name email');

        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        res.status(200).json({ book });
    } catch (error) {
        console.error("Error fetching book:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Create a new book
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created book data or error message
 */
export async function createBook(req, res) {
    try {
        const { title, description, category, documents, teams, projects, stakeholders, owners } = req.body;
        
        if (!title) {
            return res.status(400).json({ message: "Book title is required" });
        }

        if (!category) {
            return res.status(400).json({ message: "Book category is required" });
        }

        // Verify category exists and is of type 'Book'
        const categoryDoc = await Category.findById(category);
        if (!categoryDoc) {
            return res.status(400).json({ message: "Category not found" });
        }
        if (categoryDoc.type !== 'Book') {
            return res.status(400).json({ message: "Category must be of type 'Book'" });
        }

        const newBook = new Book({
            title,
            description,
            author: req.user.id,
            category,
            documents: documents || [],
            teams: teams || [],
            projects: projects || [],
            stakeholders: stakeholders || [],
            owners: owners || [req.user.id], // Default to creator as owner
            lastUpdatedBy: req.user.id
        });

        await newBook.save();

        // Populate the created book for response
        const populatedBook = await Book.findById(newBook._id)
            .populate('author', 'name email')
            .populate('category', 'name type')
            .populate('owners', 'name email')
            .populate('stakeholders', 'name email')
            .populate('teams', 'name')
            .populate('projects', 'name');

        res.status(201).json({ 
            message: "Book created successfully", 
            book: populatedBook 
        });
    } catch (error) {
        console.error("Error creating book:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Update a book
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated book data or error message
 */
export async function updateBook(req, res) {
    try {
        const { title, description, category, documents, teams, projects, stakeholders, owners } = req.body;
        
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        // Check if user has permission to update (owner or admin)
        if (!book.isOwner(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized to update this book" });
        }

        // If category is being updated, verify it's of type 'Book'
        if (category && category !== book.category.toString()) {
            const categoryDoc = await Category.findById(category);
            if (!categoryDoc) {
                return res.status(400).json({ message: "Category not found" });
            }
            if (categoryDoc.type !== 'Book') {
                return res.status(400).json({ message: "Category must be of type 'Book'" });
            }
        }

        // Update fields
        if (title) book.title = title;
        if (description !== undefined) book.description = description;
        if (category) book.category = category;
        if (documents) book.documents = documents;
        if (teams) book.teams = teams;
        if (projects) book.projects = projects;
        if (stakeholders) book.stakeholders = stakeholders;
        if (owners) book.owners = owners;
        book.lastUpdatedBy = req.user.id;

        await book.save();

        // Populate the updated book for response
        const populatedBook = await Book.findById(book._id)
            .populate('author', 'name email')
            .populate('category', 'name type')
            .populate('documents', 'title description')
            .populate('owners', 'name email')
            .populate('stakeholders', 'name email')
            .populate('teams', 'name')
            .populate('projects', 'name')
            .populate('lastUpdatedBy', 'name email');

        res.status(200).json({ 
            message: "Book updated successfully", 
            book: populatedBook 
        });
    } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Delete a book
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function deleteBook(req, res) {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        // Check if user has permission to delete (owner or admin)
        if (!book.isOwner(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized to delete this book" });
        }

        await Book.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Book deleted successfully" });
    } catch (error) {
        console.error("Error deleting book:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Add document to book
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function addDocumentToBook(req, res) {
    try {
        const { documentId } = req.body;
        
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        // Check if user has permission to modify (owner or admin)
        if (!book.isOwner(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized to modify this book" });
        }

        book.addDocument(documentId);
        book.lastUpdatedBy = req.user.id;
        await book.save();

        res.status(200).json({ message: "Document added to book successfully" });
    } catch (error) {
        console.error("Error adding document to book:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Remove document from book
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function removeDocumentFromBook(req, res) {
    try {
        const { documentId } = req.params;
        
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        // Check if user has permission to modify (owner or admin)
        if (!book.isOwner(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized to modify this book" });
        }

        book.removeDocument(documentId);
        book.lastUpdatedBy = req.user.id;
        await book.save();

        res.status(200).json({ message: "Document removed from book successfully" });
    } catch (error) {
        console.error("Error removing document from book:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}