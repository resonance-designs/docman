/*
 * @name migrateCategoryTypes
 * @file /docman/backend/src/scripts/migrateCategoryTypes.js
 * @script migrateCategoryTypes
 * @description Migration script to add type field to existing categories
 * @author Richard Bakos
 * @version 2.1.10
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
 * Migration script to add type field to existing categories
 * Sets all existing categories without a type field to 'Document'
 */
async function migrateCategoryTypes() {
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

        // Find all categories without a type field or with null/undefined type
        const categoriesWithoutType = await Category.find({
            $or: [
                { type: { $exists: false } },
                { type: null },
                { type: undefined }
            ]
        });

        console.log(`📚 Found ${categoriesWithoutType.length} categories without type field`);

        if (categoriesWithoutType.length === 0) {
            console.log('✅ All categories already have type field set');
            return;
        }

        // Update all categories without type to have type 'Document'
        const updateResult = await Category.updateMany(
            {
                $or: [
                    { type: { $exists: false } },
                    { type: null },
                    { type: undefined }
                ]
            },
            {
                $set: { type: 'Document' }
            }
        );

        console.log(`✅ Updated ${updateResult.modifiedCount} categories to have type 'Document'`);

        // Verify the update
        const allCategories = await Category.find({}, 'name type');
        console.log('📚 All categories after migration:');
        allCategories.forEach(cat => {
            console.log(`  - ${cat.name}: ${cat.type}`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('📦 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the migration
migrateCategoryTypes();