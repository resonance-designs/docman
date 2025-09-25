/*
 * @name clearReviewAssignments
 * @file /docman/backend/src/scripts/clearData/clearReviewAssignments.js
 * @description Script to clear all review assignments from the database
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import ReviewAssignment from '../../models/ReviewAssignment.js';

/**
 * Clear all review assignments from the database
 * @async
 * @function clearReviewAssignments
 * @returns {Promise<void>}
 */
const clearReviewAssignments = async () => {
    try {
        await connectDB();
        
        const result = await ReviewAssignment.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} review assignments from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing review assignments:', error);
        process.exit(1);
    }
};

clearReviewAssignments();