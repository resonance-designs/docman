/*
 * @name createAllDummyData
 * @file /docman/backend/src/scripts/dummyData/createAllDummyData.js
 * @description Script to create dummy data for all collections in the database
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create dummy data for all collections in the database
 * @async
 * @function createAllDummyData
 * @returns {Promise<void>}
 */
const createAllDummyData = async () => {
    try {
        await connectDB();
        
        console.log('🚀 Starting to create dummy data for all collections...\n');
        
        // Order matters due to dependencies between collections
        const scripts = [
            'createDummyUsers.js',
            'createDummyCategories.js',
            'createDummyExternalContactTypes.js',
            'createDummyTeams.js',
            'createDummyProjects.js',
            'createDummyDocs.js',
            'createDummyBooks.js',
            'createDummyNotifications.js',
            'createDummyFiles.js',
            'createDummyExternalContacts.js',
            'createDummyCustomCharts.js',
            'createDummyReviewAssignments.js',
            'createDummyBlacklistedTokens.js'
        ];
        
        let totalCreated = 0;
        let successCount = 0;
        let failureCount = 0;
        
        for (const script of scripts) {
            try {
                console.log(`📝 Running ${script}...`);
                const scriptPath = path.join(__dirname, script);
                
                // Execute the script and capture output
                const output = execSync(`node "${scriptPath}"`, { 
                    encoding: 'utf8',
                    cwd: process.cwd()
                });
                
                console.log(output.trim());
                successCount++;
                
                // Extract number from success message if available
                const match = output.match(/Successfully created (\d+)/);
                if (match) {
                    totalCreated += parseInt(match[1]);
                }
                
            } catch (error) {
                console.error(`❌ Error running ${script}:`, error.message);
                failureCount++;
            }
            
            console.log(''); // Add spacing between scripts
        }
        
        console.log('📊 Summary:');
        console.log(`✅ Successful scripts: ${successCount}`);
        console.log(`❌ Failed scripts: ${failureCount}`);
        console.log(`📈 Total records created: ${totalCreated}`);
        console.log('\n🎉 Dummy data creation process completed!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating all dummy data:', error);
        process.exit(1);
    }
};

createAllDummyData();