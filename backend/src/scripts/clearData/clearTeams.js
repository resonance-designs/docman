/*
 * @name clearTeams
 * @file /docman/backend/src/scripts/clearData/clearTeams.js
 * @description Script to clear all teams from the database
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Team from '../../models/Team.js';

/**
 * Clear all teams from the database
 * @async
 * @function clearTeams
 * @returns {Promise<void>}
 */
const clearTeams = async () => {
    try {
        await connectDB();
        
        const result = await Team.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} teams from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing teams:', error);
        process.exit(1);
    }
};

clearTeams();