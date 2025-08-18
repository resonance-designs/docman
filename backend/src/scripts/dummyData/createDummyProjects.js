/*
 * @name createDummyProjects
 * @file /docman/backend/src/scripts/dummyData/createDummyProjects.js
 * @description Script to create dummy projects in the database
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Project from '../../models/Project.js';
import User from '../../models/User.js';

/**
 * Create dummy projects in the database
 * @async
 * @function createDummyProjects
 * @returns {Promise<void>}
 */
const createDummyProjects = async () => {
    try {
        await connectDB();
        
        // Get existing users to assign to projects
        const users = await User.find({}).limit(5);
        
        if (users.length === 0) {
            console.log('⚠️  No users found. Please create users first.');
            process.exit(1);
        }
        
        const dummyProjects = [
            {
                name: 'DocMan Application',
                description: 'Document management system for organizing and tracking documentation',
                collaborators: [users[0]._id, users[1]._id, users[2]._id],
                status: 'active',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-12-31')
            },
            {
                name: 'API Documentation Portal',
                description: 'Centralized portal for all API documentation and developer resources',
                collaborators: [users[1]._id, users[3]._id],
                status: 'active',
                startDate: new Date('2024-02-15'),
                endDate: new Date('2024-08-15')
            },
            {
                name: 'User Training Platform',
                description: 'Platform for delivering training materials and user guides',
                collaborators: [users[2]._id, users[4]._id],
                status: 'planning',
                startDate: new Date('2024-06-01'),
                endDate: new Date('2024-11-30')
            },
            {
                name: 'Mobile App Documentation',
                description: 'Documentation suite for mobile application development',
                collaborators: [users[0]._id, users[3]._id, users[4]._id],
                status: 'active',
                startDate: new Date('2024-03-01'),
                endDate: new Date('2024-09-30')
            },
            {
                name: 'Legacy System Migration',
                description: 'Documentation for migrating from legacy systems',
                collaborators: [users[1]._id, users[2]._id],
                status: 'completed',
                startDate: new Date('2023-10-01'),
                endDate: new Date('2024-01-31')
            }
        ];
        
        const createdProjects = await Project.insertMany(dummyProjects);
        console.log(`✅ Successfully created ${createdProjects.length} dummy projects`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy projects:', error);
        process.exit(1);
    }
};

createDummyProjects();