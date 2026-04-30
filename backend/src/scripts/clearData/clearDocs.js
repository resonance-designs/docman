/*
 * @name clearDocs
 * @file /docman/backend/src/scripts/clearData/clearDocs.js
 * @description Script to clear all documents from the database
 * @author Richard Bakos
 * @version 2.2.7
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Doc from '../../models/Doc.js';
import { assertSafeClear } from '../lib/assertSafeClear.js';

/**
 * Clear all documents from the database
 * @async
 * @function clearDocs
 * @returns {Promise<void>}
 */
const clearDocs = async () => {
    try {
        assertSafeClear('clearDocs');
        await connectDB();
        
        const result = await Doc.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} documents from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing documents:', error);
        process.exit(1);
    }
};

clearDocs();