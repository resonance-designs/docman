/*
 * @name createDummyFiles
 * @file /docman/backend/src/scripts/dummyData/createDummyFiles.js
 * @description Script to create dummy file records in the database
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import File from '../../models/File.js';
import User from '../../models/User.js';
import Doc from '../../models/Doc.js';

/**
 * Create dummy file records in the database
 * @async
 * @function createDummyFiles
 * @returns {Promise<void>}
 */
const createDummyFiles = async () => {
    try {
        await connectDB();
        
        // Get existing data to reference
        const users = await User.find({}).limit(5);
        const docs = await Doc.find({}).limit(3);
        
        if (users.length === 0) {
            console.log('⚠️  No users found. Please create users first.');
            process.exit(1);
        }
        
        const dummyFiles = [
            {
                filename: 'api-integration-guide-v1.pdf',
                originalName: 'API Integration Guide v1.0.pdf',
                mimetype: 'application/pdf',
                size: 2048576,
                path: '/uploads/api-integration-guide-v1.pdf',
                uploadedBy: users[0]._id,
                relatedDocument: docs.length > 0 ? docs[0]._id : null,
                version: '1.0',
                description: 'Initial version of the API integration guide'
            },
            {
                filename: 'user-auth-setup-v2.docx',
                originalName: 'User Authentication Setup v2.1.docx',
                mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                size: 1536000,
                path: '/uploads/user-auth-setup-v2.docx',
                uploadedBy: users[1]._id,
                relatedDocument: docs.length > 1 ? docs[1]._id : null,
                version: '2.1',
                description: 'Updated authentication setup guide with new features'
            },
            {
                filename: 'database-schema-diagram.png',
                originalName: 'Database Schema Diagram.png',
                mimetype: 'image/png',
                size: 512000,
                path: '/uploads/database-schema-diagram.png',
                uploadedBy: users[2]._id,
                relatedDocument: docs.length > 2 ? docs[2]._id : null,
                version: '1.0',
                description: 'Visual representation of the database schema'
            },
            {
                filename: 'deployment-checklist.xlsx',
                originalName: 'Deployment Checklist.xlsx',
                mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: 256000,
                path: '/uploads/deployment-checklist.xlsx',
                uploadedBy: users[3]._id,
                relatedDocument: docs.length > 0 ? docs[0]._id : null,
                version: '1.2',
                description: 'Comprehensive deployment checklist'
            },
            {
                filename: 'security-audit-report.pdf',
                originalName: 'Security Audit Report Q1 2024.pdf',
                mimetype: 'application/pdf',
                size: 3072000,
                path: '/uploads/security-audit-report.pdf',
                uploadedBy: users[4]._id,
                relatedDocument: docs.length > 1 ? docs[1]._id : null,
                version: '1.0',
                description: 'Q1 2024 security audit findings and recommendations'
            }
        ];
        
        const createdFiles = await File.insertMany(dummyFiles);
        console.log(`✅ Successfully created ${createdFiles.length} dummy file records`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy file records:', error);
        process.exit(1);
    }
};

createDummyFiles();