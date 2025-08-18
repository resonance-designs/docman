/*
 * @name createDummyBlacklistedTokens
 * @file /docman/backend/src/scripts/dummyData/createDummyBlacklistedTokens.js
 * @description Script to create dummy blacklisted tokens in the database
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import BlacklistedToken from '../../models/BlacklistedToken.js';

/**
 * Create dummy blacklisted tokens in the database
 * @async
 * @function createDummyBlacklistedTokens
 * @returns {Promise<void>}
 */
const createDummyBlacklistedTokens = async () => {
    try {
        await connectDB();
        
        const dummyBlacklistedTokens = [
            {
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                reason: 'User logout',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
            },
            {
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIiwibmFtZSI6IkphbmUgU21pdGgiLCJpYXQiOjE1MTYyMzkwMjJ9.kWp8VQj9Y0432wS1CZI-Dvd99LL94YQYywGRpuwzG_M',
                reason: 'Security breach - forced logout',
                expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours from now
            },
            {
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTU1NTU1NTU1IiwibmFtZSI6Ik1pa2UgSm9obnNvbiIsImlhdCI6MTUxNjIzOTAyMn0.J7FOK4rMqPgOuSHWRjRcT5Wk34fpdVKUOpbAyfAkABw',
                reason: 'Password change',
                expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours from now
            },
            {
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3Nzc3Nzc3Nzc3IiwibmFtZSI6IlNhcmFoIFdpbHNvbiIsImlhdCI6MTUxNjIzOTAyMn0.Gf8AO4uOWisjkiEIHGxNGtYyWC6aO4Q3zdfzbenAqUE',
                reason: 'Account deactivation',
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours from now
            },
            {
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ODg4ODg4ODg4IiwibmFtZSI6IkRhdmlkIEJyb3duIiwiaWF0IjoxNTE2MjM5MDIyfQ.4f1g23a12aa2f4f78b5ac61e22c5ff4a5e6ac5b6b5b4b3b2b1b0b9b8b7b6b5b4',
                reason: 'Suspicious activity detected',
                expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours from now
            }
        ];
        
        const createdBlacklistedTokens = await BlacklistedToken.insertMany(dummyBlacklistedTokens);
        console.log(`✅ Successfully created ${createdBlacklistedTokens.length} dummy blacklisted tokens`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy blacklisted tokens:', error);
        process.exit(1);
    }
};

createDummyBlacklistedTokens();