/*
 * @name createDummyExternalContacts
 * @file /docman/backend/src/scripts/dummyData/createDummyExternalContacts.js
 * @description Script to create dummy external contacts in the database
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import ExternalContact from '../../models/ExternalContact.js';
import ExternalContactType from '../../models/ExternalContactType.js';
import User from '../../models/User.js';

/**
 * Create dummy external contacts in the database
 * @async
 * @function createDummyExternalContacts
 * @returns {Promise<void>}
 */
const createDummyExternalContacts = async () => {
    try {
        await connectDB();
        
        // Get existing data to reference
        const users = await User.find({}).limit(3);
        const contactTypes = await ExternalContactType.find({}).limit(3);
        
        if (users.length === 0) {
            console.log('⚠️  No users found. Please create users first.');
            process.exit(1);
        }
        
        if (contactTypes.length === 0) {
            console.log('⚠️  No external contact types found. Please create external contact types first.');
            process.exit(1);
        }
        
        const dummyExternalContacts = [
            {
                name: 'Alice Johnson',
                email: 'alice.johnson@clientcorp.com',
                phone: '+1-555-0201',
                company: 'Client Corp',
                position: 'Technical Lead',
                type: contactTypes[0]._id,
                notes: 'Primary technical contact for Client Corp integration project',
                createdBy: users[0]._id
            },
            {
                name: 'Bob Martinez',
                email: 'bob.martinez@vendor.com',
                phone: '+1-555-0202',
                company: 'Vendor Solutions',
                position: 'Account Manager',
                type: contactTypes[1] ? contactTypes[1]._id : contactTypes[0]._id,
                notes: 'Main point of contact for vendor services and support',
                createdBy: users[1]._id
            },
            {
                name: 'Carol Chen',
                email: 'carol.chen@partner.org',
                phone: '+1-555-0203',
                company: 'Partner Organization',
                position: 'Project Coordinator',
                type: contactTypes[2] ? contactTypes[2]._id : contactTypes[0]._id,
                notes: 'Coordinates joint projects and documentation reviews',
                createdBy: users[2]._id
            },
            {
                name: 'David Kim',
                email: 'david.kim@consultant.com',
                phone: '+1-555-0204',
                company: 'Kim Consulting',
                position: 'Senior Consultant',
                type: contactTypes[0]._id,
                notes: 'External consultant for system architecture reviews',
                createdBy: users[0]._id
            },
            {
                name: 'Emma Thompson',
                email: 'emma.thompson@regulatory.gov',
                phone: '+1-555-0205',
                company: 'Regulatory Agency',
                position: 'Compliance Officer',
                type: contactTypes[1] ? contactTypes[1]._id : contactTypes[0]._id,
                notes: 'Handles compliance documentation and regulatory reviews',
                createdBy: users[1]._id
            }
        ];
        
        const createdExternalContacts = await ExternalContact.insertMany(dummyExternalContacts);
        console.log(`✅ Successfully created ${createdExternalContacts.length} dummy external contacts`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy external contacts:', error);
        process.exit(1);
    }
};

createDummyExternalContacts();