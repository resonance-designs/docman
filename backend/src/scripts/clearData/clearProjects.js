/*
 * @name clearProjects
 * @file /docman/backend/src/scripts/clearData/clearProjects.js
 * @description Script to clear all projects from the database
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Project from '../../models/Project.js';

/**
 * Clear all projects from the database
 * @async
 * @function clearProjects
 * @returns {Promise<void>}
 */
const clearProjects = async () => {
    try {
        await connectDB();
        
        const result = await Project.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} projects from the database`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing projects:', error);
        process.exit(1);
    }
};

clearProjects();