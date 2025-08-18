/*
 * @name clearFiles
 * @file /docman/backend/src/scripts/clearData/clearFiles.js
 * @description Script to clear all files from the database
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import File from '../../models/File.js';

/**
 * Clear all files from the database
 * @async
 * @function clearFiles
 * @returns {Promise<void>}
 */
const clearFiles = async () => {
    try {
        await connectDB();
        
        const result = await File.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} files from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing files:', error);
        process.exit(1);
    }
};

clearFiles();