/*
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
// backend/src/models/Category.js
import mongoose from "mongoose";

/**
 * Category schema for organizing documents and books into logical groups
 * @typedef {Object} CategorySchema
 * @property {string} name - Category name (required, unique)
 * @property {string} description - Category description (optional)
 * @property {string} type - Category type: 'Document' or 'Book' (required, default: 'Document')
 * @property {Date} createdAt - Timestamp when category was created (auto-generated)
 * @property {Date} updatedAt - Timestamp when category was last updated (auto-generated)
 */
const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        description: {
            type: String,
            required: false
        },
        type: {
            type: String,
            enum: ['Document', 'Book'],
            required: true,
            default: 'Document'
        }
    },
    { timestamps: true }
);

/**
 * Category model for managing document categories
 * @type {mongoose.Model}
 */
const Category = mongoose.model("Category", categorySchema);

export default Category;