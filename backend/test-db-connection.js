/*
 * @name test-db-connection
 * @file /docman/backend/test-db-connection.js
 * @script test-db-connection
 * @description Test database connection and index creation
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { createDatabaseIndexes } from './src/config/database-indexes.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDatabaseConnection() {
    try {
        console.log('🔌 Testing database connection...');
        
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/docman';
        await mongoose.connect(mongoUri);
        
        console.log('✅ Database connected successfully');
        console.log(`📍 Connected to: ${mongoUri}`);
        
        // Test index creation
        console.log('\n🔍 Testing index creation...');
        await createDatabaseIndexes();
        
        console.log('\n📊 Database connection and indexes test completed successfully!');
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        process.exit(1);
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the test
testDatabaseConnection();
