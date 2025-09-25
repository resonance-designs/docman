/*
 * @name createDummyCustomCharts
 * @file /docman/backend/src/scripts/dummyData/createDummyCustomCharts.js
 * @description Script to create dummy custom charts in the database
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import CustomChart from '../../models/CustomChart.js';
import User from '../../models/User.js';

/**
 * Create dummy custom charts in the database
 * @async
 * @function createDummyCustomCharts
 * @returns {Promise<void>}
 */
const createDummyCustomCharts = async () => {
    try {
        await connectDB();
        
        // Get existing users to reference
        const users = await User.find({}).limit(3);
        
        if (users.length === 0) {
            console.log('⚠️  No users found. Please create users first.');
            process.exit(1);
        }
        
        const dummyCustomCharts = [
            {
                title: 'Document Status Overview',
                description: 'Chart showing the distribution of document statuses',
                chartType: 'pie',
                chartData: {
                    labels: ['Active', 'Draft', 'Review', 'Archived'],
                    datasets: [{
                        data: [45, 20, 15, 20],
                        backgroundColor: ['#4CAF50', '#FFC107', '#FF9800', '#9E9E9E']
                    }]
                },
                createdBy: users[0]._id,
                isPublic: true
            },
            {
                title: 'Monthly Document Creation',
                description: 'Line chart showing document creation trends over time',
                chartType: 'line',
                chartData: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Documents Created',
                        data: [12, 19, 15, 25, 22, 30],
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                    }]
                },
                createdBy: users[1]._id,
                isPublic: true
            },
            {
                title: 'Team Document Distribution',
                description: 'Bar chart showing document distribution across teams',
                chartType: 'bar',
                chartData: {
                    labels: ['Frontend Team', 'Backend Team', 'QA Team', 'DevOps Team'],
                    datasets: [{
                        label: 'Number of Documents',
                        data: [25, 30, 15, 10],
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
                    }]
                },
                createdBy: users[2]._id,
                isPublic: false
            },
            {
                title: 'Review Completion Rate',
                description: 'Doughnut chart showing review completion statistics',
                chartType: 'doughnut',
                chartData: {
                    labels: ['Completed', 'In Progress', 'Overdue'],
                    datasets: [{
                        data: [65, 25, 10],
                        backgroundColor: ['#4CAF50', '#FF9800', '#F44336']
                    }]
                },
                createdBy: users[0]._id,
                isPublic: true
            },
            {
                title: 'User Activity Heatmap',
                description: 'Radar chart showing user activity across different areas',
                chartType: 'radar',
                chartData: {
                    labels: ['Documents Created', 'Reviews Completed', 'Comments Added', 'Files Uploaded', 'Team Participation'],
                    datasets: [{
                        label: 'Activity Level',
                        data: [80, 65, 90, 70, 85],
                        borderColor: '#9C27B0',
                        backgroundColor: 'rgba(156, 39, 176, 0.2)'
                    }]
                },
                createdBy: users[1]._id,
                isPublic: false
            }
        ];
        
        const createdCustomCharts = await CustomChart.insertMany(dummyCustomCharts);
        console.log(`✅ Successfully created ${createdCustomCharts.length} dummy custom charts`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dummy custom charts:', error);
        process.exit(1);
    }
};

createDummyCustomCharts();