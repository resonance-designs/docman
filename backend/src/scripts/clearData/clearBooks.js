/*
 * @name clearBooks
 * @file /docman/backend/src/scripts/clearData/clearBooks.js
 * @description Script to clear all books from the database
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Book from '../../models/Book.js';

/**
 * Clear all books from the database
 * @async
 * @function clearBooks
 * @returns {Promise<void>}
 */
const clearBooks = async () => {
    try {
        await connectDB();
        
        const result = await Book.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} books from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing books:', error);
        process.exit(1);
    }
};

clearBooks();