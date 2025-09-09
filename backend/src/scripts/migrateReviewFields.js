/*
 * @name migrateReviewFields
 * @file /docman/backend/src/scripts/migrateReviewFields.js
 * @script migrateReviewFields
 * @description Migration script to update documents from old reviewDate field to new review system
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Doc from "../models/Doc.js";
import { logError } from "../lib/utils.js";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables with absolute paths
const backendDir = path.resolve(__dirname, '../..');
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: path.join(backendDir, '.env.dev') });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.join(backendDir, '.env.prod') });
} else {
    dotenv.config({ path: path.join(backendDir, '.env') }); // Loads .env by default
}

/**
 * Connect to MongoDB using the same configuration as the main application
 */
async function connectDB() {
    try {
        if (process.env.ATLAS === 'no') {
            // Connect to MongoDB using the provided credentials and host
            await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_SOURCE}`);
            console.log('[migrateReviewFields] Connected to MongoDB host:', process.env.MONGO_HOST);
        } else if (process.env.ATLAS === 'yes') {
            // Connect to MongoDB Atlas using the connection string
            await mongoose.connect(process.env.MONGO_ATLAS_URI);
            console.log('[migrateReviewFields] Connected to MongoDB Atlas');
        } else {
            throw new Error(`Invalid ATLAS environment variable: "${process.env.ATLAS}". Set it to "yes" or "no".`);
        }
    } catch (error) {
        logError('migrateReviewFields', error, { step: 'database connection' });
        process.exit(1);
    }
}

/**
 * Migrate documents from old reviewDate to new review system
 */
async function migrateReviewFields() {
    try {
        console.log('[migrateReviewFields] Starting migration of review fields...');

        // Find all documents that have reviewDate but not opensForReview
        const documentsToMigrate = await Doc.find({
            reviewDate: { $exists: true },
            opensForReview: { $exists: false }
        });

        console.log(`[migrateReviewFields] Found ${documentsToMigrate.length} documents to migrate`);

        let migratedCount = 0;
        let errorCount = 0;

        for (const doc of documentsToMigrate) {
            try {
                const updateData = {
                    opensForReview: doc.reviewDate,
                    reviewInterval: 'quarterly', // Default value
                    reviewPeriod: '2weeks', // Default value
                    lastReviewedOn: null,
                    nextReviewDueOn: null
                };

                // Calculate next review date based on quarterly interval
                if (doc.reviewDate) {
                    const nextReviewDate = new Date(doc.reviewDate);
                    nextReviewDate.setMonth(nextReviewDate.getMonth() + 3); // Add 3 months for quarterly
                    updateData.nextReviewDueOn = nextReviewDate;
                }

                await Doc.findByIdAndUpdate(doc._id, updateData, { runValidators: true });
                migratedCount++;

                if (migratedCount % 10 === 0) {
                    console.log(`[migrateReviewFields] Migrated ${migratedCount} documents...`);
                }
            } catch (error) {
                logError('migrateReviewFields', error, { 
                    documentId: doc._id, 
                    title: doc.title 
                });
                errorCount++;
            }
        }

        console.log(`[migrateReviewFields] Migration completed. Migrated: ${migratedCount}, Errors: ${errorCount}`);

        // Optionally remove the old reviewDate field after successful migration
        if (errorCount === 0 && migratedCount > 0) {
            console.log('[migrateReviewFields] Removing old reviewDate field from migrated documents...');
            
            const removeResult = await Doc.updateMany(
                { opensForReview: { $exists: true } },
                { $unset: { reviewDate: "" } }
            );

            console.log(`[migrateReviewFields] Removed reviewDate field from ${removeResult.modifiedCount} documents`);
        }

    } catch (error) {
        logError('migrateReviewFields', error, { step: 'migration process' });
        throw error;
    }
}

/**
 * Main migration function
 */
async function main() {
    try {
        await connectDB();
        await migrateReviewFields();
        console.log('[migrateReviewFields] Migration completed successfully');
    } catch (error) {
        logError('migrateReviewFields', error, { step: 'main process' });
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('[migrateReviewFields] Database connection closed');
    }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { migrateReviewFields };