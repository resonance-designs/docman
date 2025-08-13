// backend/src/controllers/categoriesController.js
import Category from "../models/Category.js";

export async function getAllCategories(req, res) {
    try {
        const categories = await Category.find({}, "_id name description").sort({ name: 1 });
        res.status(200).json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

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