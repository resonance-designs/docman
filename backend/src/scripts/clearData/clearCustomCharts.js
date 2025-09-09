/*
 * @name clearCustomCharts
 * @file /docman/backend/src/scripts/clearData/clearCustomCharts.js
 * @description Script to clear all custom charts from the database
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import CustomChart from '../../models/CustomChart.js';

/**
 * Clear all custom charts from the database
 * @async
 * @function clearCustomCharts
 * @returns {Promise<void>}
 */
const clearCustomCharts = async () => {
    try {
        await connectDB();
        
        const result = await CustomChart.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} custom charts from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing custom charts:', error);
        process.exit(1);
    }
};

clearCustomCharts();