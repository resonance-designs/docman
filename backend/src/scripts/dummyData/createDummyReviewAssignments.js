/*
 * @name createDummyReviewAssignments
 * @file /docman/backend/src/scripts/dummyData/createDummyReviewAssignments.js
 * @description Script to create dummy review assignments in the database
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import ReviewAssignment from '../../models/ReviewAssignment.js';
import User from '../../models/User.js';
import Doc from '../../models/Doc.js';

/**
 * Create dummy review assignments in the database
 * @async
 * @function createDummyReviewAssignments
 * @returns {Promise<void>}
 */
const createDummyReviewAssignments = async () => {
    try {
        await connectDB();
        
        // Get existing data to reference
        const users = await User.find({}).limit(5);
        const docs = await Doc.find({}).limit(3);
        
        if (users.length === 0 || docs.length === 0) {
            console.log('⚠️  No users or documents found. Please create users and documents first.');
            process.exit(1);
        }
        
        const dummyReviewAssignments = [
            {
                document: docs[0]._id,
                reviewer: users[1]._id,
                assignedBy: users[0]._id,
                dueDate: new Date('2024-06-15'),
                status: 'pending',
                priority: 'high',
                instructions: 'Please review the API integration guide for technical accuracy and completeness.',
                assignedAt: new Date()
            },
            {
                document: docs[1]._id,
                reviewer: users[2]._id,
                assignedBy: users[1]._id,
                dueDate: new Date('2024-07-20'),
                status: 'in_progress',
                priority: 'medium',
                instructions: 'Review the authentication setup guide and verify all steps are current.',
                assignedAt: new Date(Date.now() - 86400000), // 1 day ago
                startedAt: new Date(Date.now() - 43200000) // 12 hours ago
            },
            {
                document: docs[2]._id,
                reviewer: users[3]._id,
                assignedBy: users[2]._id,
                dueDate: new Date('2024-05-25'),
                status: 'completed',
                priority: 'high',
                instructions: 'Review database schema documentation for accuracy and update any outdated information.',
                assignedAt: new Date(Date.now() - 172800000), // 2 days ago
                startedAt: new Date(Date.now() - 129600000), // 1.5 days ago
                completedAt: new Date(Date.now() - 86400000), // 1 day ago
                feedback: 'Documentation is comprehensive and accurate. Minor formatting suggestions included in comments.'
            },
            {
                document: docs[0]._id,
                reviewer: users[4]._id,
                assignedBy: users[0]._id,
                dueDate: new Date('2024-06-10'),
                status: 'overdue',
                priority: 'medium',
                instructions: 'Security review of the API integration guide.',
                assignedAt: new Date(Date.now() - 259200000) // 3 days ago
            },
            {
                document: docs[1]._id,
                reviewer: users[0]._id,
                assignedBy: users[3]._id,
                dueDate: new Date('2024-08-01'),
                status: 'pending',
                priority: 'low',
                instructions: 'Final review before publication. Check for consistency with company standards.',
                assignedAt: new Date()
            }
        ];
        
        const createdReviewAssignments = await ReviewAssignment.insertMany(dummyReviewAssignments);
        console.log(`✅ Successfully created ${createdReviewAssignments.length} dummy review assignments`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy review assignments:', error);
        process.exit(1);
    }
};

createDummyReviewAssignments();