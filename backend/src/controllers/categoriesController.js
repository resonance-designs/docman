/*
 * @name Categories Controller
 * @file /docman/backend/src/controllers/categoriesController.js
 * @module categoriesController
 * @description Controller functions for category management including viewing, creating, and deleting categories.
 * @author Richard Bakos
 * @version 1.1.8
 * @license UNLICENSED
 */

import Category from "../models/Category.js";

/**
 * Get all categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of categories or error message
 */
export async function getAllCategories(req, res) {
    try {
        const categories = await Category.find({}, "_id name description createdAt").sort({ name: 1 });
        res.status(200).json(categories);
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
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: "Category name is required" });
        }

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(409).json({ message: "Category already exists" });
        }

        const newCategory = new Category({ name, description });
        await newCategory.save();

        res.status(201).json({ message: "Category created successfully", category: newCategory });
    } catch (error) {
        console.error("Error creating category:", error);
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