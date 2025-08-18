/*
 * @name database-indexes
 * @file /docman/backend/src/config/database-indexes.js
 * @module database-indexes
 * @description Database index definitions for optimal query performance
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import mongoose from 'mongoose';

/**
 * Helper function to safely create an index, handling conflicts
 * @param {Object} collection - MongoDB collection
 * @param {Object} indexSpec - Index specification
 * @param {Object} options - Index options
 */
async function safeCreateIndex(collection, indexSpec, options) {
    try {
        await collection.createIndex(indexSpec, options);
        console.log(`✅ Created index: ${options.name}`);
    } catch (error) {
        if (error.code === 85) { // IndexOptionsConflict
            console.log(`⚠️ Index ${options.name} already exists with different options, skipping...`);
        } else if (error.code === 86) { // IndexKeySpecsConflict
            console.log(`⚠️ Index with same key pattern already exists, skipping ${options.name}...`);
        } else {
            console.error(`❌ Error creating index ${options.name}:`, error.message);
        }
    }
}

/**
 * Create database indexes for optimal performance
 * This should be run during application startup or deployment
 */
export async function createDatabaseIndexes() {
    try {
        console.log('🔍 Creating database indexes for optimal performance...');

        // Get database collections
        const db = mongoose.connection.db;

        // Document indexes for common queries
        await safeCreateIndex(db.collection('docs'), {
            title: 'text',
            description: 'text'
        }, {
            name: 'docs_text_search',
            background: true
        });

        await safeCreateIndex(db.collection('docs'), {
            author: 1,
            createdAt: -1
        }, {
            name: 'docs_author_created',
            background: true
        });

        await safeCreateIndex(db.collection('docs'), {
            category: 1,
            reviewDate: 1
        }, {
            name: 'docs_category_review',
            background: true
        });

        await safeCreateIndex(db.collection('docs'), {
            reviewDate: 1,
            reviewCompleted: 1
        }, {
            name: 'docs_review_status',
            background: true
        });

        await safeCreateIndex(db.collection('docs'), {
            stakeholders: 1
        }, {
            name: 'docs_stakeholders',
            background: true
        });

        await safeCreateIndex(db.collection('docs'), {
            owners: 1
        }, {
            name: 'docs_owners',
            background: true
        });

        // Compound index for common document queries
        await safeCreateIndex(db.collection('docs'), {
            author: 1,
            category: 1,
            reviewDate: 1
        }, {
            name: 'docs_author_category_review',
            background: true
        });

        // Individual indexes for user access control
        // Note: MongoDB doesn't support $or in index key patterns
        // These separate indexes will be used by the query optimizer
        await safeCreateIndex(db.collection('docs'), {
            author: 1
        }, {
            name: 'docs_author',
            background: true
        });

        // User indexes
        await safeCreateIndex(db.collection('users'), {
            email: 1
        }, {
            name: 'users_email',
            unique: true,
            background: true
        });

        await safeCreateIndex(db.collection('users'), {
            username: 1
        }, {
            name: 'users_username',
            unique: true,
            background: true
        });

        await safeCreateIndex(db.collection('users'), {
            role: 1,
            isActive: 1
        }, {
            name: 'users_role_active',
            background: true
        });

        // File indexes for version management
        await safeCreateIndex(db.collection('files'), {
            documentId: 1,
            version: -1
        }, {
            name: 'files_document_version',
            background: true
        });

        await safeCreateIndex(db.collection('files'), {
            uploadedAt: -1
        }, {
            name: 'files_uploaded_date',
            background: true
        });

        // Review indexes
        await safeCreateIndex(db.collection('reviews'), {
            documentId: 1,
            assignee: 1
        }, {
            name: 'reviews_document_assignee',
            background: true
        });

        await safeCreateIndex(db.collection('reviews'), {
            dueDate: 1,
            status: 1
        }, {
            name: 'reviews_due_status',
            background: true
        });

        await safeCreateIndex(db.collection('reviews'), {
            assignee: 1,
            status: 1,
            dueDate: 1
        }, {
            name: 'reviews_assignee_status_due',
            background: true
        });

        // Team indexes
        await safeCreateIndex(db.collection('teams'), {
            members: 1
        }, {
            name: 'teams_members',
            background: true
        });

        await safeCreateIndex(db.collection('teams'), {
            createdBy: 1
        }, {
            name: 'teams_created_by',
            background: true
        });

        // Project indexes
        await safeCreateIndex(db.collection('projects'), {
            collaborators: 1
        }, {
            name: 'projects_collaborators',
            background: true
        });

        await safeCreateIndex(db.collection('projects'), {
            documents: 1
        }, {
            name: 'projects_documents',
            background: true
        });

        // Notification indexes
        await safeCreateIndex(db.collection('notifications'), {
            recipient: 1,
            read: 1,
            createdAt: -1
        }, {
            name: 'notifications_recipient_read_date',
            background: true
        });

        // External contact type indexes
        await safeCreateIndex(db.collection('externalcontacttypes'), {
            name: 1
        }, {
            name: 'external_contact_types_name',
            background: true
        });

        // Category indexes
        await safeCreateIndex(db.collection('categories'), {
            name: 1
        }, {
            name: 'categories_name',
            unique: true,
            background: true
        });

        // Custom chart indexes
        await safeCreateIndex(db.collection('customcharts'), {
            createdBy: 1,
            isPublic: 1
        }, {
            name: 'custom_charts_creator_public',
            background: true
        });

        console.log('✅ Database indexes created successfully');
        
        // Log index information
        const collections = ['docs', 'users', 'files', 'reviews', 'teams', 'projects', 'notifications'];
        for (const collectionName of collections) {
            try {
                const indexes = await db.collection(collectionName).indexes();
                console.log(`📊 ${collectionName}: ${indexes.length} indexes`);
            } catch (error) {
                console.log(`⚠️ Could not get indexes for ${collectionName}: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Error creating database indexes:', error);
        throw error;
    }
}

/**
 * Drop all custom indexes (useful for development/testing)
 */
export async function dropCustomIndexes() {
    try {
        console.log('🗑️ Dropping custom database indexes...');
        
        const db = mongoose.connection.db;
        const collections = ['docs', 'users', 'files', 'reviews', 'teams', 'projects', 'notifications'];
        
        for (const collectionName of collections) {
            try {
                const indexes = await db.collection(collectionName).indexes();
                for (const index of indexes) {
                    // Don't drop the default _id index
                    if (index.name !== '_id_') {
                        await db.collection(collectionName).dropIndex(index.name);
                        console.log(`🗑️ Dropped index ${index.name} from ${collectionName}`);
                    }
                }
            } catch (error) {
                console.log(`⚠️ Could not drop indexes for ${collectionName}: ${error.message}`);
            }
        }
        
        console.log('✅ Custom indexes dropped successfully');
    } catch (error) {
        console.error('❌ Error dropping indexes:', error);
        throw error;
    }
}
