/*
 * @name clearBlacklistedTokens
 * @file /docman/backend/src/scripts/clearData/clearBlacklistedTokens.js
 * @description Script to clear all blacklisted tokens from the database
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import BlacklistedToken from '../../models/BlacklistedToken.js';

/**
 * Clear all blacklisted tokens from the database
 * @async
 * @function clearBlacklistedTokens
 * @returns {Promise<void>}
 */
const clearBlacklistedTokens = async () => {
    try {
        await connectDB();
        
        const result = await BlacklistedToken.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} blacklisted tokens from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing blacklisted tokens:', error);
        process.exit(1);
    }
};

clearBlacklistedTokens();