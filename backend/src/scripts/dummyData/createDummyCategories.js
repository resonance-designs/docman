/*
 * @name createDummyCategories
 * @file /docman/backend/src/scripts/dummyData/createDummyCategories.js
 * @description Script to create dummy categories in the database
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Category from '../../models/Category.js';

/**
 * Create dummy categories in the database
 * @async
 * @function createDummyCategories
 * @returns {Promise<void>}
 */
const createDummyCategories = async () => {
    try {
        await connectDB();
        
        const dummyCategories = [
            {
                name: 'Technical Documentation',
                description: 'Documentation related to technical specifications and implementation',
                type: 'Document'
            },
            {
                name: 'User Guides',
                description: 'End-user documentation and tutorials',
                type: 'Document'
            },
            {
                name: 'API Documentation',
                description: 'REST API and GraphQL documentation',
                type: 'Document'
            },
            {
                name: 'Project Plans',
                description: 'Project planning and management documents',
                type: 'Document'
            },
            {
                name: 'Policies & Procedures',
                description: 'Company policies and standard operating procedures',
                type: 'Document'
            },
            {
                name: 'Development Handbooks',
                description: 'Collections of development-related documentation',
                type: 'Book'
            },
            {
                name: 'User Manuals',
                description: 'Comprehensive user manual collections',
                type: 'Book'
            },
            {
                name: 'Training Materials',
                description: 'Educational and training content collections',
                type: 'Book'
            }
        ];
        
        const createdCategories = await Category.insertMany(dummyCategories);
        console.log(`✅ Successfully created ${createdCategories.length} dummy categories`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy categories:', error);
        process.exit(1);
    }
};

createDummyCategories();