/*
 * @name clearCategories
 * @file /docman/backend/src/scripts/clearData/clearCategories.js
 * @description Script to clear all categories from the database
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Category from '../../models/Category.js';

/**
 * Clear all categories from the database
 * @async
 * @function clearCategories
 * @returns {Promise<void>}
 */
const clearCategories = async () => {
    try {
        await connectDB();
        
        const result = await Category.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} categories from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing categories:', error);
        process.exit(1);
    }
};

clearCategories();