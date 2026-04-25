/*
 * Safe, idempotent production seed.
 *
 * This script never deletes, drops, or recreates collections. It seeds sample
 * data only when the database is empty. If app data exists but users are empty,
 * it creates only the default admin account so the deployment is recoverable.
 */
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Book from '../models/Book.js';
import Doc from '../models/Doc.js';
import Category from '../models/Category.js';
import Team from '../models/Team.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';
import File from '../models/File.js';
import ExternalContact from '../models/ExternalContact.js';
import ExternalContactType from '../models/ExternalContactType.js';
import CustomChart from '../models/CustomChart.js';
import ReviewAssignment from '../models/ReviewAssignment.js';

const defaultAccount = {
    email: process.env.DOCMAN_DEFAULT_EMAIL || 'admin@example.com',
    username: process.env.DOCMAN_DEFAULT_USERNAME || 'admin',
    password: process.env.DOCMAN_DEFAULT_PASSWORD || 'DocMan123!',
};
const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

const models = [
    User,
    Book,
    Doc,
    Category,
    Team,
    Project,
    Notification,
    File,
    ExternalContact,
    ExternalContactType,
    CustomChart,
    ReviewAssignment
];

async function getCounts() {
    const entries = await Promise.all(
        models.map(async (model) => [model.modelName, await model.countDocuments()])
    );

    return Object.fromEntries(entries);
}

function totalRecords(counts) {
    return Object.values(counts).reduce((total, count) => total + count, 0);
}

async function ensureDefaultUser() {
    const existing = await User.findOne({
        $or: [
            { email: defaultAccount.email },
            { username: defaultAccount.username }
        ]
    });

    if (existing) {
        return existing;
    }

    return User.create({
        firstname: process.env.DOCMAN_DEFAULT_FIRSTNAME || 'DocMan',
        lastname: process.env.DOCMAN_DEFAULT_LASTNAME || 'Admin',
        email: defaultAccount.email,
        username: defaultAccount.username,
        password: defaultAccount.password,
        role: 'superadmin'
    });
}

async function seedSampleData(admin) {
    const [documentCategory, bookCategory] = await Category.create([
        {
            name: 'Technical Documentation',
            description: 'Technical specifications, implementation notes, and runbooks',
            type: 'Document'
        },
        {
            name: 'Operations Handbook',
            description: 'Curated operational documents and procedures',
            type: 'Book'
        }
    ]);

    const team = await Team.create({
        name: 'Documentation Team',
        description: 'Maintains and reviews DocMan documentation',
        owner: admin._id,
        lastUpdatedBy: admin._id
    });

    const project = await Project.create({
        name: 'DocMan Launch',
        description: 'Sample project for validating a fresh deployment',
        owner: admin._id,
        teams: [team._id],
        priority: 'high',
        tags: ['sample', 'deployment']
    });

    const doc = await Doc.create({
        title: 'Deployment Checklist',
        description: 'Baseline checklist for validating a DocMan deployment',
        opensForReview: new Date(),
        reviewInterval: 'quarterly',
        reviewPeriod: '2weeks',
        author: admin._id,
        category: documentCategory._id,
        stakeholders: [admin._id],
        owners: [admin._id],
        projects: [project._id],
        reviewAssignees: [admin._id],
        reviewDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        lastUpdatedBy: admin._id
    });

    const book = await Book.create({
        title: 'Production Operations',
        description: 'Sample collection of production-readiness documents',
        category: bookCategory._id,
        documents: [doc._id],
        owners: [admin._id],
        lastUpdatedBy: admin._id
    });

    project.documents.push(doc._id);
    project.books.push(book._id);
    await project.save();

    team.documents.push(doc._id);
    team.books.push(book._id);
    team.projects.push(project._id);
    await team.save();

    const contactType = await ExternalContactType.create({
        name: 'Vendor',
        description: 'External vendor or service provider'
    });

    await ExternalContact.create({
        name: 'Example Vendor',
        email: 'vendor@example.com',
        phoneNumber: '+1-555-0100',
        type: contactType._id,
        documentId: doc._id
    });

    await File.create({
        filename: 'deployment-checklist.md',
        originalname: 'Deployment Checklist.md',
        path: 'uploads/deployment-checklist.md',
        mimetype: 'text/markdown',
        size: 1024,
        documentId: doc._id,
        uploadedBy: admin._id,
        changelog: 'Initial sample file metadata'
    });

    await ReviewAssignment.create({
        document: doc._id,
        assignee: admin._id,
        assignedBy: admin._id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        notes: 'Initial sample review assignment'
    });

    await Notification.create({
        recipient: admin._id,
        sender: admin._id,
        type: 'message',
        title: 'Welcome to DocMan',
        message: 'Safe seed completed for this deployment.',
        relatedDoc: doc._id,
        relatedTeam: team._id
    });

    await CustomChart.create({
        name: 'Documents by Category',
        description: 'Sample chart for deployment verification',
        chartType: 'bar',
        dataSource: 'documents',
        groupByField: 'category',
        colorPalette: ['#0f766e', '#f97316', '#2563eb'],
        createdBy: admin._id,
        isPublic: true
    });
}

export async function runSafeSeed({ manageConnection = true } = {}) {
    if (manageConnection) {
        await connectDB();
    }

    const counts = await getCounts();
    const total = totalRecords(counts);
    console.log('Safe seed current counts:', counts);

    if (total > 0) {
        if (counts.User === 0) {
            const admin = await ensureDefaultUser();
            console.log(`Created default superadmin user: ${admin.email}`);
        } else {
            console.log('Existing data found. Safe seed skipped without modifying records.');
        }
        return;
    }

    const admin = await ensureDefaultUser();
    await seedSampleData(admin);
    console.log(`Safe seed completed. Default login: ${defaultAccount.email} / ${defaultAccount.password}`);
}

if (isDirectRun) {
    runSafeSeed()
        .catch((error) => {
            console.error('Safe seed failed:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await mongoose.disconnect();
        });
}
