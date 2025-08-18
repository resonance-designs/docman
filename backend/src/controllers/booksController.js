/*
 * @name booksController
 * @file /docman/backend/src/controllers/booksController.js
 * @controller booksController
 * @description Book management controller for organizing documents into collections
 * @author Richard Bakos
 * @version 2.1.6
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
        const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 books per page
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * limitNum;

        // Build filter query
        const filter = {};
        
        // Category filter
        if (category) filter.category = category;
        
        // Owner filter
        if (owner) filter.owners = { $in: [owner] };
        
        // Text search filter (search in title and description)
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
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
            .populate('documents', 'title description reviewDate reviewCompleted')
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
export async function createBook(req, res) {
    try {
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
export async function updateBook(req, res) {
    try {
        console.log("📚 UpdateBook: Request body:", req.body);
        console.log("📚 UpdateBook: Book ID:", req.params.id);
        console.log("📚 UpdateBook: User:", req.user);
        
        const { title, description, category, documents, owners } = req.body;
        
        const book = await Book.findById(req.params.id);
        console.log("📚 UpdateBook: Found book:", book ? "Yes" : "No");
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        // Check if user has permission to update (owner or admin)
        console.log("📚 UpdateBook: Checking permissions...");
        console.log("📚 UpdateBook: Book owners:", book.owners);
        console.log("📚 UpdateBook: User ID:", req.user.id);
        console.log("📚 UpdateBook: User _id:", req.user._id);
        console.log("📚 UpdateBook: User role:", req.user.role);
        
        const userId = req.user.id || req.user._id;
        console.log("📚 UpdateBook: Using user ID:", userId);
        console.log("📚 UpdateBook: Is owner?", book.isOwner(userId));
        
        if (!book.isOwner(userId) && req.user.role !== 'admin') {
            console.log("📚 UpdateBook: Permission denied");
            return res.status(403).json({ message: "Not authorized to update this book" });
        }

        // If category is being updated, verify it's of type 'Book'
        console.log("📚 UpdateBook: Checking category...");
        console.log("📚 UpdateBook: New category:", category);
        console.log("📚 UpdateBook: Current category:", book.category.toString());
        
        if (category && category !== book.category.toString()) {
            console.log("📚 UpdateBook: Category is being changed, validating...");
            const categoryDoc = await Category.findById(category);
            if (!categoryDoc) {
                console.log("📚 UpdateBook: Category not found");
                return res.status(400).json({ message: "Category not found" });
            }
            if (categoryDoc.type !== 'Book') {
                console.log("📚 UpdateBook: Category is not of type 'Book':", categoryDoc.type);
                return res.status(400).json({ message: "Category must be of type 'Book'" });
            }
            console.log("📚 UpdateBook: Category validation passed");
        }

        // Update fields
        console.log("📚 UpdateBook: Updating fields...");
        if (title) {
            console.log("📚 UpdateBook: Updating title:", title);
            book.title = title;
        }
        if (description !== undefined) {
            console.log("📚 UpdateBook: Updating description:", description);
            book.description = description;
        }
        if (category) {
            console.log("📚 UpdateBook: Updating category:", category);
            book.category = category;
        }
        if (documents) {
            console.log("📚 UpdateBook: Updating documents:", documents);
            book.documents = documents;
        }
        if (owners) {
            console.log("📚 UpdateBook: Updating owners:", owners);
            book.owners = owners;
        }
        book.lastUpdatedBy = userId;

        console.log("📚 UpdateBook: Saving book...");
        await book.save();
        console.log("📚 UpdateBook: Book saved successfully");

        // Populate the updated book for response
        console.log("📚 UpdateBook: Populating book for response...");
        const populatedBook = await Book.findById(book._id)
            .populate('category', 'name type')
            .populate('documents', 'title description')
            .populate('owners', 'firstname lastname email')
            .populate('lastUpdatedBy', 'firstname lastname email');
        console.log("📚 UpdateBook: Book populated successfully");

        res.status(200).json({ 
            message: "Book updated successfully", 
            book: populatedBook 
        });
    } catch (error) {
        console.error("📚 UpdateBook: Error updating book:", error);
        console.error("📚 UpdateBook: Error stack:", error.stack);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
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
        if (!book.isOwner(userId) && req.user.role !== 'admin') {
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
        const userId = req.user.id || req.user._id;
        if (!book.isOwner(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized to modify this book" });
        }

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
        if (!book.isOwner(userId) && req.user.role !== 'admin') {
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