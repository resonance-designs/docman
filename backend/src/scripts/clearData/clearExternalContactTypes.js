/*
 * @name clearExternalContactTypes
 * @file /docman/backend/src/scripts/clearData/clearExternalContactTypes.js
 * @description Script to clear all external contact types from the database
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import ExternalContactType from '../../models/ExternalContactType.js';

/**
 * Clear all external contact types from the database
 * @async
 * @function clearExternalContactTypes
 * @returns {Promise<void>}
 */
const clearExternalContactTypes = async () => {
    try {
        await connectDB();
        
        const result = await ExternalContactType.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} external contact types from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing external contact types:', error);
        process.exit(1);
    }
};

clearExternalContactTypes();