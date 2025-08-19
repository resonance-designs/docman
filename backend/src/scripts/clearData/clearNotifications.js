/*
 * @name clearNotifications
 * @file /docman/backend/src/scripts/clearData/clearNotifications.js
 * @description Script to clear all notifications from the database
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Notification from '../../models/Notification.js';

/**
 * Clear all notifications from the database
 * @async
 * @function clearNotifications
 * @returns {Promise<void>}
 */
const clearNotifications = async () => {
    try {
        await connectDB();
        
        const result = await Notification.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} notifications from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing notifications:', error);
        process.exit(1);
    }
};

clearNotifications();