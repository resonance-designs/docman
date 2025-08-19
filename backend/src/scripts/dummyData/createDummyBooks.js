/*
 * @name createDummyBooks
 * @file /docman/backend/src/scripts/dummyData/createDummyBooks.js
 * @description Script to create dummy books in the database
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Book from '../../models/Book.js';
import User from '../../models/User.js';
import Category from '../../models/Category.js';
import Doc from '../../models/Doc.js';

/**
 * Create dummy books in the database
 * @async
 * @function createDummyBooks
 * @returns {Promise<void>}
 */
const createDummyBooks = async () => {
    try {
        await connectDB();
        
        // Get existing data to reference
        const users = await User.find({}).limit(5);
        const categories = await Category.find({ type: 'Book' }).limit(3);
        const docs = await Doc.find({}).limit(10);
        
        if (users.length === 0 || categories.length === 0) {
            console.log('⚠️  No users or book categories found. Please create users and categories first.');
            process.exit(1);
        }
        
        const dummyBooks = [
            {
                title: 'Complete Developer Handbook',
                description: 'Comprehensive collection of development guides and best practices',
                category: categories[0]._id,
                documents: docs.slice(0, 3).map(doc => doc._id),
                owners: [users[0]._id, users[1]._id],
                lastUpdatedBy: users[0]._id
            },
            {
                title: 'API Documentation Suite',
                description: 'Complete API documentation and integration guides',
                category: categories[1] ? categories[1]._id : categories[0]._id,
                documents: docs.slice(3, 6).map(doc => doc._id),
                owners: [users[1]._id, users[2]._id],
                lastUpdatedBy: users[1]._id
            },
            {
                title: 'User Training Manual',
                description: 'Comprehensive training materials for end users',
                category: categories[2] ? categories[2]._id : categories[0]._id,
                documents: docs.slice(6, 9).map(doc => doc._id),
                owners: [users[2]._id, users[3]._id],
                lastUpdatedBy: users[2]._id
            },
            {
                title: 'Security Guidelines Collection',
                description: 'Collection of security policies and procedures',
                category: categories[0]._id,
                documents: docs.slice(0, 2).map(doc => doc._id),
                owners: [users[3]._id, users[4]._id],
                lastUpdatedBy: users[3]._id
            },
            {
                title: 'Project Management Resources',
                description: 'Collection of project management templates and guides',
                category: categories[1] ? categories[1]._id : categories[0]._id,
                documents: docs.slice(2, 5).map(doc => doc._id),
                owners: [users[4]._id, users[0]._id],
                lastUpdatedBy: users[4]._id
            }
        ];
        
        const createdBooks = await Book.insertMany(dummyBooks);
        console.log(`✅ Successfully created ${createdBooks.length} dummy books`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy books:', error);
        process.exit(1);
    }
};

createDummyBooks();