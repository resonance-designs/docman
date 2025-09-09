/*
 * @name createDummyDocs
 * @file /docman/backend/src/scripts/dummyData/createDummyDocs.js
 * @description Script to create dummy documents in the database
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Doc from '../../models/Doc.js';
import User from '../../models/User.js';
import Category from '../../models/Category.js';
import Team from '../../models/Team.js';
import Project from '../../models/Project.js';

/**
 * Create dummy documents in the database
 * @async
 * @function createDummyDocs
 * @returns {Promise<void>}
 */
const createDummyDocs = async () => {
    try {
        await connectDB();
        
        // Get existing data to reference
        const users = await User.find({}).limit(5);
        const categories = await Category.find({ type: 'Document' }).limit(5);
        const teams = await Team.find({}).limit(3);
        const projects = await Project.find({}).limit(3);
        
        if (users.length === 0 || categories.length === 0) {
            console.log('⚠️  No users or categories found. Please create users and categories first.');
            process.exit(1);
        }
        
        const dummyDocs = [
            {
                title: 'API Integration Guide',
                description: 'Comprehensive guide for integrating with our REST API',
                category: categories[0]._id,
                authors: [users[0]._id],
                contributors: [users[1]._id],
                stakeholders: [users[2]._id],
                teams: teams.length > 0 ? [teams[0]._id] : [],
                projects: projects.length > 0 ? [projects[0]._id] : [],
                reviewDate: new Date('2024-06-01'),
                status: 'active',
                priority: 'high',
                lastUpdatedBy: users[0]._id
            },
            {
                title: 'User Authentication Setup',
                description: 'Step-by-step guide for setting up user authentication',
                category: categories[1]._id,
                authors: [users[1]._id],
                contributors: [users[0]._id, users[2]._id],
                stakeholders: [users[3]._id],
                teams: teams.length > 1 ? [teams[1]._id] : [],
                projects: projects.length > 1 ? [projects[1]._id] : [],
                reviewDate: new Date('2024-07-15'),
                status: 'active',
                priority: 'medium',
                lastUpdatedBy: users[1]._id
            },
            {
                title: 'Database Schema Documentation',
                description: 'Complete documentation of the database schema and relationships',
                category: categories[2] ? categories[2]._id : categories[0]._id,
                authors: [users[2]._id],
                contributors: [users[0]._id],
                stakeholders: [users[1]._id, users[4]._id],
                teams: teams.length > 2 ? [teams[2]._id] : [],
                projects: projects.length > 2 ? [projects[2]._id] : [],
                reviewDate: new Date('2024-05-20'),
                status: 'review',
                priority: 'high',
                lastUpdatedBy: users[2]._id
            },
            {
                title: 'Deployment Procedures',
                description: 'Standard operating procedures for application deployment',
                category: categories[3] ? categories[3]._id : categories[0]._id,
                authors: [users[3]._id],
                contributors: [users[0]._id, users[4]._id],
                stakeholders: [users[1]._id],
                teams: teams.length > 0 ? [teams[0]._id] : [],
                projects: projects.length > 0 ? [projects[0]._id] : [],
                reviewDate: new Date('2024-08-10'),
                status: 'draft',
                priority: 'medium',
                lastUpdatedBy: users[3]._id
            },
            {
                title: 'Security Best Practices',
                description: 'Guidelines and best practices for application security',
                category: categories[4] ? categories[4]._id : categories[0]._id,
                authors: [users[4]._id],
                contributors: [users[0]._id, users[1]._id],
                stakeholders: [users[2]._id, users[3]._id],
                teams: teams.length > 1 ? [teams[1]._id] : [],
                projects: projects.length > 1 ? [projects[1]._id] : [],
                reviewDate: new Date('2024-09-05'),
                status: 'active',
                priority: 'high',
                lastUpdatedBy: users[4]._id
            }
        ];
        
        const createdDocs = await Doc.insertMany(dummyDocs);
        console.log(`✅ Successfully created ${createdDocs.length} dummy documents`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy documents:', error);
        process.exit(1);
    }
};

createDummyDocs();