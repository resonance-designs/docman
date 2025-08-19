/*
 * @name clearExternalContacts
 * @file /docman/backend/src/scripts/clearData/clearExternalContacts.js
 * @description Script to clear all external contacts from the database
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import ExternalContact from '../../models/ExternalContact.js';

/**
 * Clear all external contacts from the database
 * @async
 * @function clearExternalContacts
 * @returns {Promise<void>}
 */
const clearExternalContacts = async () => {
    try {
        await connectDB();
        
        const result = await ExternalContact.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} external contacts from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing external contacts:', error);
        process.exit(1);
    }
};

clearExternalContacts();