/*
 * @name createDummyTeams
 * @file /docman/backend/src/scripts/dummyData/createDummyTeams.js
 * @description Script to create dummy teams in the database
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import Team from '../../models/Team.js';
import User from '../../models/User.js';

/**
 * Create dummy teams in the database
 * @async
 * @function createDummyTeams
 * @returns {Promise<void>}
 */
const createDummyTeams = async () => {
    try {
        await connectDB();
        
        // Get existing users to assign to teams
        const users = await User.find({}).limit(5);
        
        if (users.length === 0) {
            console.log('⚠️  No users found. Please create users first.');
            process.exit(1);
        }
        
        const dummyTeams = [
            {
                name: 'Frontend Development Team',
                description: 'Team responsible for frontend development and UI/UX',
                members: [users[0]._id, users[1]._id, users[3]._id]
            },
            {
                name: 'Backend Development Team',
                description: 'Team handling server-side development and APIs',
                members: [users[0]._id, users[2]._id]
            },
            {
                name: 'Documentation Team',
                description: 'Team focused on creating and maintaining documentation',
                members: [users[1]._id, users[4]._id]
            },
            {
                name: 'Quality Assurance Team',
                description: 'Team responsible for testing and quality control',
                members: [users[4]._id, users[2]._id]
            },
            {
                name: 'DevOps Team',
                description: 'Team managing deployment and infrastructure',
                members: [users[0]._id]
            }
        ];
        
        const createdTeams = await Team.insertMany(dummyTeams);
        console.log(`✅ Successfully created ${createdTeams.length} dummy teams`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy teams:', error);
        process.exit(1);
    }
};

createDummyTeams();