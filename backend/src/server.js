/*
 * @name DocMan Backend Server
 * @file /docman/backend/src/server.js
 * @module server
 * @description Main entry point for the DocMan backend application.
 * @author Richard Bakos
 * @version 1.0.0
 * @license UNLICENSED
 */

/* * Import Modules
 * - Express: Web framework for Node.js
 * - CORS: Middleware to enable Cross-Origin Resource Sharing
 * - dotenv: Module to load environment variables from .env files
 * - path: Node.js module for handling file and directory paths
 * - docsRoutes: Routes for document management API
 * - connectDB: Function to connect to MongoDB
 * - rateLimiter: Middleware to limit the rate of requests to the API
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import docsRoutes from "./routes/docsRoutes.js";
import { connectDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";
import authRoutes from "./routes/authRoutes.js";

/* * Environment Configuration
 * - Load environment variables based on the NODE_ENV variable.
 * - Default to loading .env if NODE_ENV is not set.
 * - Use different .env files for development and production environments.
 */
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.dev' });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.prod' });
} else {
    dotenv.config(); // Loads .env by default
}
const activeEnv = process.env.ENV;
const nodePort = process.env.NODE_PORT;

/* * Express Application Setup
 * - Get the current directory name using path.resolve.
 * - Initialize the Express application.
 */
const __dirname = path.resolve(); // Get the current directory name
const app = express(); // Initialize Express app

/* * Middleware Configuration
 * - CORS: Enable Cross-Origin Resource Sharing for development
 * - JSON Parsing: Parse incoming JSON request bodies
 * - Rate Limiting: Apply rate limiting to prevent abuse
 * - Static File Serving: Serve static files in production
 */
// Enable CORS for all routes to allow requests from the frontend development server
if (process.env.NODE_ENV !== 'production') {
app.use(
    cors({
    origin:"http://localhost:5173",
    })
);
}
app.use(express.json()); // Parse JSON request bodies
app.use(rateLimiter); // Apply rate limiting middleware
app.use("/api/docs", docsRoutes); // Declare endpoints
app.use("/api/auth", authRoutes); // Declare authentication endpoints
// Static file serving for production
if(process.env.NODE_ENV === 'production') {
    // Serve static files from the React frontend app in production
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    // Handle any requests that don't match the API routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
}

/* * Starting the Server
 * - The server listens on the specified port and connects to MongoDB.
 * - Logs the active environment and port number.
 */
app.listen(5001, () => {
    console.log("Active environment is:", activeEnv);
    console.log("Node server is running on port:", nodePort);
    console.log("Connecting to MongoDB...");
    connectDB(); // Connect to MongoDB
});

