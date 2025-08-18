/*
 * @name createDummyUsers
 * @file /docman/backend/src/scripts/dummyData/createDummyUsers.js
 * @description Script to create dummy users in the database
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import User from '../../models/User.js';

/**
 * Create dummy users in the database
 * @async
 * @function createDummyUsers
 * @returns {Promise<void>}
 */
const createDummyUsers = async () => {
    try {
        await connectDB();
        
        const dummyUsers = [
            {
                firstname: 'John',
                lastname: 'Doe',
                email: 'john.doe@example.com',
                username: 'johndoe',
                password: 'password123',
                role: 'admin',
                telephone: '+1-555-0101',
                title: 'Senior Developer',
                department: 'Engineering',
                theme: 'current',
                bio: 'Experienced full-stack developer with expertise in MERN stack.'
            },
            {
                firstname: 'Jane',
                lastname: 'Smith',
                email: 'jane.smith@example.com',
                username: 'janesmith',
                password: 'password123',
                role: 'editor',
                telephone: '+1-555-0102',
                title: 'Technical Writer',
                department: 'Documentation',
                theme: 'business',
                bio: 'Technical writer specializing in API documentation and user guides.'
            },
            {
                firstname: 'Mike',
                lastname: 'Johnson',
                email: 'mike.johnson@example.com',
                username: 'mikejohnson',
                password: 'password123',
                role: 'viewer',
                telephone: '+1-555-0103',
                title: 'Project Manager',
                department: 'Management',
                theme: 'retro',
                bio: 'Project manager with 10+ years of experience in software development.'
            },
            {
                firstname: 'Sarah',
                lastname: 'Wilson',
                email: 'sarah.wilson@example.com',
                username: 'sarahwilson',
                password: 'password123',
                role: 'editor',
                telephone: '+1-555-0104',
                title: 'UX Designer',
                department: 'Design',
                theme: 'current',
                bio: 'UX designer focused on creating intuitive user experiences.'
            },
            {
                firstname: 'David',
                lastname: 'Brown',
                email: 'david.brown@example.com',
                username: 'davidbrown',
                password: 'password123',
                role: 'viewer',
                telephone: '+1-555-0105',
                title: 'Quality Assurance',
                department: 'Testing',
                theme: 'business',
                bio: 'QA engineer ensuring software quality and reliability.'
            }
        ];
        
        const createdUsers = await User.insertMany(dummyUsers);
        console.log(`✅ Successfully created ${createdUsers.length} dummy users`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy users:', error);
        process.exit(1);
    }
};

createDummyUsers();