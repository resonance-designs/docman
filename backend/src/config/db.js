/*
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { createDatabaseIndexes } from './database-indexes.js';

/**
 * Establish connection to MongoDB database
 * Supports both local MongoDB instances and MongoDB Atlas cloud service
 * Connection method is determined by the ATLAS environment variable
 * @async
 * @function connectDB
 * @returns {Promise<void>} Promise that resolves when connection is established
 * @throws {Error} Throws error if ATLAS environment variable is invalid or connection fails
 * @example
 * // For local MongoDB (ATLAS=no)
 * // Requires: MONGO_USER, MONGO_PASSWORD, MONGO_HOST, MONGO_PORT, MONGO_DB, MONGO_AUTH_SOURCE
 *
 * // For MongoDB Atlas (ATLAS=yes)
 * // Requires: MONGO_ATLAS_URI
 */
export const connectDB = async () => {
    try {
        if (process.env.ATLAS === 'no') {
            // Connect to MongoDB using the provided credentials and host
            await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_SOURCE}`);
            console.log('MongoDB established connection with host:', process.env.MONGO_HOST);
            console.log('MongoDB is running on port:', process.env.MONGO_PORT);
            console.log('MongoDB connected successfully to database:', process.env.MONGO_DB);
            console.log("Server is ready to accept requests.");
        } else if (process.env.ATLAS === 'yes') {
            // Connect to MongoDB Atlas using the connection string
            await mongoose.connect(process.env.MONGO_ATLAS_URI);
            console.log('MongoDB is connected via atlas server');
        } else {
            throw new Error('Invalid ATLAS environment variable. Set it to "yes" or "no".');
        }

        // Create database indexes for optimal performance
        if (process.env.NODE_ENV !== 'test') {
            await createDatabaseIndexes();
        }
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1); // Exit the process with failure
    }
}