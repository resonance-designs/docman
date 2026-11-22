import { withCategoryWriteLock } from '../lib/categoryWriteLock.js';
import Team from '../models/Team.js';
import Project from '../models/Project.js';
import Doc from '../models/Doc.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
/*
 * @name booksController
 * @file /docman/backend/src/controllers/booksController.js
 * @controller booksController
 * @description Book management controller for organizing documents into collections
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import { documentReadFilter } from "../middleware/documentAccess.js";
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
        const {
            limit = 50,
            page = 1,
            category,
            owner,
            search,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Parse pagination
        const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 100)); // Max 100 books per page
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * limitNum;

        // Build filter query
        const filter = {};

        if ([category, owner].some(value => value !== undefined && (typeof value !== 'string' || !mongoose.isValidObjectId(value)))) return res.status(400).json({message:'Invalid category or owner filter.'});
        if ([startDate,endDate].some(value => value && (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())))) return res.status(400).json({message:'Invalid date filter.'});

        // Category filter
        if (category) filter.category = category;

        // Owner filter
        if (owner) filter.owners = { $in: [owner] };

        // Text search filter (search in title and description)
        if (search) {
            filter.$or = [
                { title: { $regex: String(search).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
                { description: { $regex: String(search).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
            ];
        }

        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        // Build sort object
        const sortObj = {};
        const validSortFields = ['title', 'createdAt', 'updatedAt'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        sortObj[sortField] = sortDirection;

        // Execute query with pagination
        const [books, totalCount] = await Promise.all([
            Book.find(filter)
                .populate({ path: 'documents', select: '_id', match: documentReadFilter(req.user) })
                .populate('category', 'name type')
                .populate('owners', 'firstname lastname email')
                .populate('lastUpdatedBy', 'firstname lastname email')
                .sort(sortObj)
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
            .populate('category', 'name type')
            .populate({ path: 'documents', select: 'title description reviewDate reviewCompleted', match: documentReadFilter(req.user) })
            .populate('owners', 'firstname lastname email')
            .populate('lastUpdatedBy', 'firstname lastname email');

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
async function createBookLocked(req, res) {
    try {
        if (!await validateBookInput(req,res,true)) return;
        const { title, description, category, documents, owners } = req.body;

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

        const userId = req.user.id || req.user._id;
        const newBook = new Book({
            title,
            description,
            category,
            documents: documents || [],
            owners: owners || [userId], // Default to creator as owner
            lastUpdatedBy: userId
        });

        await newBook.save();

        // Populate the created book for response
        const populatedBook = await Book.findById(newBook._id)
            .populate('category', 'name type')
            .populate('owners', 'firstname lastname email')
            .populate('lastUpdatedBy', 'firstname lastname email');

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
async function updateBookLocked(req, res) {
    try {
        if (!await validateBookInput(req,res,false)) return;

        const { title, description, category, documents, owners } = req.body;

        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        // Check if user has permission to update (owner or admin)

        const userId = req.user.id || req.user._id;

        if (!book.isOwner(userId) && req.user.role !== 'superadmin') {
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
        if (title) {
            book.title = title;
        }
        if (description !== undefined) {
            book.description = description;
        }
        if (category) {
            book.category = category;
        }
        if (documents) {
            book.documents = documents;
        }
        if (owners) {
            book.owners = owners;
        }
        book.lastUpdatedBy = userId;

        await book.save();

        // Populate the updated book for response
        const populatedBook = await Book.findById(book._id)
            .populate('category', 'name type')
            .populate({ path: 'documents', select: 'title description', match: documentReadFilter(req.user) })
            .populate('owners', 'firstname lastname email')
            .populate('lastUpdatedBy', 'firstname lastname email');

        res.status(200).json({
            message: "Book updated successfully",
            book: populatedBook
        });
    } catch (error) {
        console.error("📚 UpdateBook: Error updating book:", error);
        console.error("📚 UpdateBook: Error stack:", error.stack);
        res.status(500).json({ message: "Internal Server Error",  });
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
        const userId = req.user.id || req.user._id;
        if (!book.isOwner(userId) && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: "Not authorized to delete this book" });
        }

        await Team.updateMany({books:book._id},{$pull:{books:book._id}});
        await Project.updateMany({books:book._id},{$pull:{books:book._id}});
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
        const userId = req.user.id || req.user._id;
        if (!book.isOwner(userId) && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: "Not authorized to modify this book" });
        }

        if (typeof documentId !== 'string' || !mongoose.isValidObjectId(documentId) || !await Doc.exists({$and:[documentReadFilter(req.user),{_id:documentId}]})) return res.status(404).json({message:'Document unavailable.'});
        book.addDocument(documentId);
        book.lastUpdatedBy = userId;
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
        const userId = req.user.id || req.user._id;
        if (!book.isOwner(userId) && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: "Not authorized to modify this book" });
        }

        book.removeDocument(documentId);
        book.lastUpdatedBy = userId;
        await book.save();

        res.status(200).json({ message: "Document removed from book successfully" });
    } catch (error) {
        console.error("Error removing document from book:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
async function validateBookInput(req, res, creating = false) {
    const b = req.body || {};
    if ((creating || b.title !== undefined) && (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 254)) { res.status(400).json({message:'Enter a book title up to 254 characters.'}); return false; }
    if (b.description !== undefined && (typeof b.description !== 'string' || b.description.length > 5000)) { res.status(400).json({message:'Description must be text up to 5000 characters.'}); return false; }
    if (b.category !== undefined && !mongoose.isValidObjectId(b.category)) {res.status(400).json({message:'Select a valid book category.'});return false;}
    for (const field of ['documents','owners']) {
        if(b[field] === undefined) continue;
        if(!Array.isArray(b[field]) || b[field].some(id => typeof id !== 'string' || !mongoose.isValidObjectId(id)) || (field==='owners' && !b[field].length)) {res.status(400).json({message:`Select valid ${field}.`});return false;}
        const ids=[...new Set(b[field])];
        const count = field==='documents' ? await Doc.countDocuments({$and:[documentReadFilter(req.user),{_id:{$in:ids}}]}) : await User.countDocuments({_id:{$in:ids},isActive:{$ne:false}});
        if(count!==ids.length) {res.status(400).json({message:`One or more ${field} are unavailable.`});return false;}
        b[field]=ids;
    }
    return true;
}

export async function createBook(req, res) {
    try {
        return await withCategoryWriteLock(() => createBookLocked(req, res));
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.statusCode === 409
            ? 'Another category or book change is in progress. Try again.'
            : 'Could not coordinate category/book changes.' });
    }
}

export async function updateBook(req, res) {
    try {
        return await withCategoryWriteLock(() => updateBookLocked(req, res));
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.statusCode === 409
            ? 'Another category or book change is in progress. Try again.'
            : 'Could not coordinate category/book changes.' });
    }
}
