/*
 * @name createDummyExternalContactTypes
 * @file /docman/backend/src/scripts/dummyData/createDummyExternalContactTypes.js
 * @description Script to create dummy external contact types in the database
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import ExternalContactType from '../../models/ExternalContactType.js';

/**
 * Create dummy external contact types in the database
 * @async
 * @function createDummyExternalContactTypes
 * @returns {Promise<void>}
 */
const createDummyExternalContactTypes = async () => {
    try {
        await connectDB();
        
        const dummyExternalContactTypes = [
            {
                name: 'Client',
                description: 'External clients and customers'
            },
            {
                name: 'Vendor',
                description: 'Third-party vendors and service providers'
            },
            {
                name: 'Partner',
                description: 'Business partners and collaborators'
            },
            {
                name: 'Consultant',
                description: 'External consultants and advisors'
            },
            {
                name: 'Regulatory',
                description: 'Regulatory bodies and compliance contacts'
            },
            {
                name: 'Stakeholder',
                description: 'External stakeholders and decision makers'
            },
            {
                name: 'Reviewer',
                description: 'External reviewers and subject matter experts'
            }
        ];
        
        const createdExternalContactTypes = await ExternalContactType.insertMany(dummyExternalContactTypes);
        console.log(`✅ Successfully created ${createdExternalContactTypes.length} dummy external contact types`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy external contact types:', error);
        process.exit(1);
    }
};

createDummyExternalContactTypes();