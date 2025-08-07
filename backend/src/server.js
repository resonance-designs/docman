/*
 * @file /docman/backend/src/server.js
 * @module server
 * @description Main entry point for the DocMan backend application.
 * @author Richard Bakos
 * @version 0.1.1
 * @license UNLICENSED
 */
// Import necessary modules
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import docsRoutes from "./routes/docsRoutes.js";
import { connectDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";

// Choose environment configuration based on NODE_ENV
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.dev' });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.prod' });
} else {
    dotenv.config(); // Loads .env by default
}
const activeEnv = process.env.ENV;
const nodePort = process.env.NODE_PORT;
// Initialize Express app
const app = express();
// Middleware
app.use(
    cors({
    origin:"http://localhost:5173", // Enable CORS for all routes to allow requests from the frontend development server
    })
);
app.use(express.json()); // Parse JSON request bodies
app.use(rateLimiter); // Apply rate limiting middleware
// Declare endpoints
app.use("/api/docs", docsRoutes);
// Start the server
app.listen(5001, () => {
    console.log("Active environment is:", activeEnv);
    console.log("Node server is running on port:", nodePort);
    console.log("Connecting to MongoDB...");
    connectDB(); // Connect to MongoDB
});

