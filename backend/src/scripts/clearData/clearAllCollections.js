/*
 * @name clearAllCollections
 * @file /docman/backend/src/scripts/clearData/clearAllCollections.js
 * @description Script to clear all collections from the database
 * @author Richard Bakos
 * @version 2.2.2
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import User from '../../models/User.js';
import Book from '../../models/Book.js';
import Doc from '../../models/Doc.js';
import Category from '../../models/Category.js';
import Team from '../../models/Team.js';
import Project from '../../models/Project.js';
import Notification from '../../models/Notification.js';
import File from '../../models/File.js';
import ExternalContact from '../../models/ExternalContact.js';
import ExternalContactType from '../../models/ExternalContactType.js';
import CustomChart from '../../models/CustomChart.js';
import ReviewAssignment from '../../models/ReviewAssignment.js';
import BlacklistedToken from '../../models/BlacklistedToken.js';
import { assertSafeClear } from '../lib/assertSafeClear.js';

/**
 * Clear all collections from the database
 * @async
 * @function clearAllCollections
 * @returns {Promise<void>}
 */
const clearAllCollections = async () => {
    try {
        assertSafeClear('clearAllCollections');
        await connectDB();
        
        console.log('🧹 Starting to clear all collections...\n');
        
        const collections = [
            { model: User, name: 'Users' },
            { model: Book, name: 'Books' },
            { model: Doc, name: 'Documents' },
            { model: Category, name: 'Categories' },
            { model: Team, name: 'Teams' },
            { model: Project, name: 'Projects' },
            { model: Notification, name: 'Notifications' },
            { model: File, name: 'Files' },
            { model: ExternalContact, name: 'External Contacts' },
            { model: ExternalContactType, name: 'External Contact Types' },
            { model: CustomChart, name: 'Custom Charts' },
            { model: ReviewAssignment, name: 'Review Assignments' },
            { model: BlacklistedToken, name: 'Blacklisted Tokens' }
        ];
        
        let totalDeleted = 0;
        
        for (const collection of collections) {
            try {
                const result = await collection.model.deleteMany({});
                console.log(`✅ Cleared ${result.deletedCount} ${collection.name}`);
                totalDeleted += result.deletedCount;
            } catch (error) {
                console.error(`❌ Error clearing ${collection.name}:`, error.message);
            }
        }
        
        console.log(`\n🎉 Successfully cleared ${totalDeleted} total documents from all collections`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing all collections:', error);
        process.exit(1);
    }
};

clearAllCollections();
