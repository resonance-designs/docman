/*
 * @name clearUsers
 * @file /docman/backend/src/scripts/clearData/clearUsers.js
 * @description Script to clear all users from the database
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import User from '../../models/User.js';

/**
 * Clear all users from the database
 * @async
 * @function clearUsers
 * @returns {Promise<void>}
 */
const clearUsers = async () => {
    try {
        await connectDB();
        
        const result = await User.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} users from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing users:', error);
        process.exit(1);
    }
};

clearUsers();