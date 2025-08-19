/*
 * @name createDummyNotifications
 * @file /docman/backend/src/scripts/dummyData/createDummyNotifications.js
 * @description Script to create dummy notifications in the database
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import Doc from '../../models/Doc.js';

/**
 * Create dummy notifications in the database
 * @async
 * @function createDummyNotifications
 * @returns {Promise<void>}
 */
const createDummyNotifications = async () => {
    try {
        await connectDB();
        
        // Get existing data to reference
        const users = await User.find({}).limit(5);
        const docs = await Doc.find({}).limit(3);
        
        if (users.length === 0) {
            console.log('⚠️  No users found. Please create users first.');
            process.exit(1);
        }
        
        const dummyNotifications = [
            {
                recipient: users[0]._id,
                sender: users[1]._id,
                type: 'document_review',
                title: 'Document Review Required',
                message: 'The API Integration Guide is ready for your review.',
                relatedDocument: docs.length > 0 ? docs[0]._id : null,
                isRead: false,
                priority: 'high'
            },
            {
                recipient: users[1]._id,
                sender: users[2]._id,
                type: 'document_updated',
                title: 'Document Updated',
                message: 'The User Authentication Setup document has been updated.',
                relatedDocument: docs.length > 1 ? docs[1]._id : null,
                isRead: true,
                priority: 'medium'
            },
            {
                recipient: users[2]._id,
                sender: users[0]._id,
                type: 'team_invitation',
                title: 'Team Invitation',
                message: 'You have been invited to join the Frontend Development Team.',
                isRead: false,
                priority: 'medium'
            },
            {
                recipient: users[3]._id,
                sender: users[4]._id,
                type: 'review_deadline',
                title: 'Review Deadline Approaching',
                message: 'The review deadline for Security Best Practices is in 3 days.',
                relatedDocument: docs.length > 2 ? docs[2]._id : null,
                isRead: false,
                priority: 'high'
            },
            {
                recipient: users[4]._id,
                sender: users[1]._id,
                type: 'document_approved',
                title: 'Document Approved',
                message: 'Your Database Schema Documentation has been approved.',
                relatedDocument: docs.length > 0 ? docs[0]._id : null,
                isRead: true,
                priority: 'low'
            },
            {
                recipient: users[0]._id,
                sender: users[3]._id,
                type: 'system_update',
                title: 'System Maintenance',
                message: 'Scheduled system maintenance will occur this weekend.',
                isRead: false,
                priority: 'medium'
            }
        ];
        
        const createdNotifications = await Notification.insertMany(dummyNotifications);
        console.log(`✅ Successfully created ${createdNotifications.length} dummy notifications`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy notifications:', error);
        process.exit(1);
    }
};

createDummyNotifications();