/*
 * @author Richard Bakos
 * @version 2.2.4
 * @license UNLICENSED
 */
import mongoose from 'mongoose';
import { createDatabaseIndexes } from './database-indexes.js';

const isSet = (value) => value && value !== 'undefined' && value !== 'null';

const requireEnv = (names) => {
    const missing = names.filter((name) => !isSet(process.env[name]));

    if (missing.length > 0) {
        throw new Error(`Missing required MongoDB environment variable(s): ${missing.join(', ')}`);
    }
};

const encodeConnectionValue = (value) => encodeURIComponent(value);

const getMongoUriSummary = (uri) => {
    try {
        const parsedUri = new URL(uri);
        const database = parsedUri.pathname?.replace(/^\//, '') || '(none)';

        return `${parsedUri.protocol}//${parsedUri.hostname}/${database}`;
    } catch {
        return '(unable to parse MongoDB URI)';
    }
};

const buildLocalMongoUri = () => {
    requireEnv(['MONGO_USER', 'MONGO_PASSWORD', 'MONGO_HOST', 'MONGO_PORT', 'MONGO_DB', 'MONGO_AUTH_SOURCE']);

    const user = encodeConnectionValue(process.env.MONGO_USER);
    const password = encodeConnectionValue(process.env.MONGO_PASSWORD);
    const authSource = encodeConnectionValue(process.env.MONGO_AUTH_SOURCE);

    return `mongodb://${user}:${password}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${authSource}`;
};

const buildLocalMongoTlsUri = () => {
    requireEnv([
        'MONGO_USER',
        'MONGO_PASSWORD',
        'MONGO_HOST',
        'MONGO_PORT',
        'MONGO_DB',
        'MONGO_AUTH_SOURCE',
        'MONGO_TLS',
        'MONGO_CA_FILE',
        'MONGO_CERT_FILE'
    ]);

    const baseUri = buildLocalMongoUri();

    return `${baseUri}&tls=${process.env.MONGO_TLS}&tlsCAFile=${process.env.MONGO_CA_FILE}&tlsCertificateKeyFile=${process.env.MONGO_CERT_FILE}`;
};

const buildAtlasMongoUri = () => {
    const directUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (isSet(directUri)) {
        return directUri;
    }

    requireEnv(['MONGO_ATLAS_USER', 'MONGO_ATLAS_PASSWORD', 'MONGO_ATLAS_HOST', 'MONGO_ATLAS_DB']);

    const user = encodeConnectionValue(process.env.MONGO_ATLAS_USER);
    const password = encodeConnectionValue(process.env.MONGO_ATLAS_PASSWORD);
    const appName = isSet(process.env.MONGO_ATLAS_APP)
        ? `&appName=${encodeConnectionValue(process.env.MONGO_ATLAS_APP)}`
        : '';

    return `mongodb+srv://${user}:${password}@${process.env.MONGO_ATLAS_HOST}/${process.env.MONGO_ATLAS_DB}?retryWrites=true&w=majority${appName}`;
};

/**
 * Establish connection to MongoDB database
 * Supports both local MongoDB instances and MongoDB Atlas cloud service
 * Connection method is determined by the ATLAS environment variable
 * @async
 * @function connectDB
 * @returns {Promise<void>} Promise that resolves when connection is established
 * @throws {Error} Throws error if ATLAS environment variable is invalid or connection fails
 * @example
 */
export const connectDB = async () => {
    try {
        let mongoUri;

        if (process.env.ATLAS === 'no' && process.env.ENV === 'Development') {
            // Connect to MongoDB using the provided credentials and host
            mongoUri = buildLocalMongoUri();
            console.log('MongoDB connection target:', getMongoUriSummary(mongoUri));
            await mongoose.connect(mongoUri);
            console.log('MongoDB established connection with host:', process.env.MONGO_HOST);
            console.log('MongoDB is running on port:', process.env.MONGO_PORT);
            console.log('MongoDB connected successfully to database:', process.env.MONGO_DB);
            console.log("Server is ready to accept requests.");
        } else if (process.env.ATLAS === 'no' && process.env.ENV === 'Production') {
            if (process.env.MONGO_TLS === 'false') {
                mongoUri = buildLocalMongoUri();
                console.log('MongoDB connection target:', getMongoUriSummary(mongoUri));
                await mongoose.connect(mongoUri);
                console.log('MongoDB established connection with host:', process.env.MONGO_HOST);
                console.log('MongoDB is running on port:', process.env.MONGO_PORT);
                console.log('MongoDB connected successfully to database:', process.env.MONGO_DB);
                console.log("Server is ready to accept requests.");
            } else if (process.env.MONGO_TLS === 'true') {
                mongoUri = buildLocalMongoTlsUri();
                console.log('MongoDB connection target:', getMongoUriSummary(mongoUri));
                await mongoose.connect(mongoUri);
                console.log('MongoDB established connection with host:', process.env.MONGO_HOST);
                console.log('MongoDB is running on port:', process.env.MONGO_PORT);
                console.log('MongoDB connected successfully to database:', process.env.MONGO_DB);
                console.log("Server is ready to accept requests.");
            } else {
                throw new Error('Invalid MONGO_TLS environment variable. Set it to "true" or "false".');
            }
        } else if (process.env.ATLAS === 'yes') {
            // Connect to MongoDB Atlas using the connection string
            mongoUri = buildAtlasMongoUri();
            console.log('MongoDB connection target:', getMongoUriSummary(mongoUri));
            await mongoose.connect(mongoUri);
            console.log('MongoDB is connected via atlas server');
        } else {
            throw new Error('Invalid ATLAS environment variable. Set it to "yes" or "no".');
        }
        // Create database indexes for optimal performance
        if (process.env.NODE_ENV !== 'test') {
            await createDatabaseIndexes();
        }
    } catch (error) {
        console.error('MongoDB connection failed:', error?.name || 'Error', error?.message || error);
        if (error?.code) {
            console.error('MongoDB error code:', error.code);
        }
        throw error;
    }
}
