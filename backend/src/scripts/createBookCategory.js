/*
 * @name createBookCategory
 * @file /docman/backend/src/scripts/createBookCategory.js
 * @script createBookCategory
 * @description Script to create a sample Book category for testing
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */

import mongoose from 'mongoose';
import Category from '../models/Category.js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend root directory
config({ path: path.join(__dirname, '../../.env.dev') });

/**
 * Script to create sample Book categories
 */
async function createBookCategories() {
    try {
        // Determine which database to connect to based on ATLAS environment variable
        let mongoUri;
        
        if (process.env.ATLAS === 'no') {
            // Connect to local MongoDB
            mongoUri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_SOURCE}`;
            console.log('🔗 Connecting to LOCAL MongoDB...');
            console.log('Host:', process.env.MONGO_HOST);
            console.log('Port:', process.env.MONGO_PORT);
            console.log('Database:', process.env.MONGO_DB);
        } else if (process.env.ATLAS === 'yes') {
            // Connect to MongoDB Atlas
            mongoUri = process.env.MONGO_ATLAS_URI;
            console.log('🔗 Connecting to MongoDB ATLAS...');
        } else {
            console.error('❌ ATLAS environment variable must be set to "yes" or "no"');
            console.log('Current ATLAS value:', process.env.ATLAS);
            process.exit(1);
        }

        if (!mongoUri) {
            console.error('❌ Could not build MongoDB connection string');
            console.log('ATLAS:', process.env.ATLAS);
            console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('MONGO')));
            process.exit(1);
        }

        // Connect to MongoDB
        await mongoose.connect(mongoUri);
        console.log('📦 Connected to MongoDB');

        // Sample Book categories to create
        const bookCategories = [
            {
                name: 'Technical Manuals',
                description: 'Technical documentation and user manuals',
                type: 'Book'
            },
            {
                name: 'Reference Books',
                description: 'Reference materials and handbooks',
                type: 'Book'
            },
            {
                name: 'Training Materials',
                description: 'Training guides and educational content',
                type: 'Book'
            }
        ];

        console.log('📚 Creating Book categories...');

        for (const categoryData of bookCategories) {
            try {
                // Check if category already exists
                const existingCategory = await Category.findOne({ name: categoryData.name });
                
                if (existingCategory) {
                    // Update existing category to Book type
                    existingCategory.type = 'Book';
                    existingCategory.description = categoryData.description;
                    await existingCategory.save();
                    console.log(`✅ Updated existing category: ${categoryData.name} -> Book`);
                } else {
                    // Create new category
                    const newCategory = new Category(categoryData);
                    await newCategory.save();
                    console.log(`✅ Created new Book category: ${categoryData.name}`);
                }
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`⚠️  Category "${categoryData.name}" already exists`);
                } else {
                    console.error(`❌ Error creating category "${categoryData.name}":`, error.message);
                }
            }
        }

        // Show all categories
        const allCategories = await Category.find({}, 'name type description');
        console.log('\n📚 All categories in database:');
        allCategories.forEach(cat => {
            console.log(`  - ${cat.name} (${cat.type || 'No type'}): ${cat.description || 'No description'}`);
        });

        console.log('\n✅ Book categories creation completed!');

    } catch (error) {
        console.error('❌ Script failed:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('📦 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the script
createBookCategories();