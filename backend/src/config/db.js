import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_SOURCE}`);
        console.log('MongoDB established connection with host:', process.env.MONGO_HOST);
        console.log('MongoDB is running on port:', process.env.MONGO_PORT);
        console.log('MongoDB connected successfully to database:', process.env.MONGO_DB);
        console.log("Server is ready to accept requests.");
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1); // Exit the process with failure
    }
}