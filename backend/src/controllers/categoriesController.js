/*
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import Category from "../models/Category.js";

/**
 * Get all categories with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with categories and pagination metadata
 */
export async function getAllCategories(req, res) {
    try {
        const { limit = 50, page = 1, type } = req.query;
        
        // Build filter object
        const filter = {};
        if (type && ['Document', 'Book'].includes(type)) {
            filter.type = type;
        }
        
        // Parse pagination
        const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 categories per page
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * limitNum;

        // Execute query with pagination
        const [categories, totalCount] = await Promise.all([
            Category.find(filter, "_id name description type createdAt").sort({ name: 1 }).skip(skip).limit(limitNum),
            Category.countDocuments(filter)
        ]);

        res.status(200).json({
            categories,
            pagination: {
                total: totalCount,
                page: Math.max(parseInt(page) || 1, 1),
                limit: limitNum,
                pages: Math.ceil(totalCount / limitNum)
            }
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Create a new category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created category data or error message
 */
export async function createCategory(req, res) {
    try {
        const { name, description, type } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: "Category name is required" });
        }

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(409).json({ message: "Category already exists" });
        }

        const newCategory = new Category({ 
            name, 
            description, 
            type: type || 'Document' 
        });
        await newCategory.save();

        res.status(201).json({ message: "Category created successfully", category: newCategory });
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Update a category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated category data or error message
 */
export async function updateCategory(req, res) {
    try {
        const { name, description, type } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: "Category name is required" });
        }

        // Check if another category with the same name exists (excluding current category)
        const existingCategory = await Category.findOne({ 
            name, 
            _id: { $ne: req.params.id } 
        });
        if (existingCategory) {
            return res.status(409).json({ message: "Category name already exists" });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { 
                name, 
                description, 
                type: type || 'Document' 
            },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.status(200).json({ 
            message: "Category updated successfully", 
            category: updatedCategory 
        });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Delete a category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function deleteCategory(req, res) {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            return res.status(404).json({ message: "Category not found." });
        }
        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}