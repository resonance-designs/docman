/*
 * @name Server Application
 * @file /docman/backend/src/server.js
 * @description Main entry point of the DocMan backend application
 * @author Richard Bakos
 * @version 2.2.5
 * @license UNLICENSED
 */
import { connectDB } from "./config/db.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import rateLimiter from "./middleware/rateLimiter.js";
import { createSecurityMiddleware } from "./middleware/securityHeaders.js";
import { specs, swaggerUi, swaggerUiOptions } from "./config/swagger.js";
import authRoutes from "./routes/authRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import docsRoutes from "./routes/docsRoutes.js";
import categoriesRoutes from "./routes/categoriesRoutes.js";
import booksRoutes from "./routes/booksRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import teamsRoutes from "./routes/teamsRoutes.js";
import projectsRoutes from "./routes/projectsRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import customChartsRoutes from "./routes/customChartsRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import externalContactsRoutes from "./routes/externalContactsRoutes.js";
import notificationsRoutes from "./routes/notificationsRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(backendRoot, "..");
const uiDistFolders = {
    react: path.join(projectRoot, "frontend", "dist"),
    legacy: path.join(projectRoot, "frontend", "dist"),
    vue: path.join(projectRoot, "frontend-vue", "dist"),
    vuetify: path.join(projectRoot, "frontend-vue", "dist")
};

/* * Environment Configuration
 * - Load environment variables based on the NODE_ENV variable.
 * - Default to loading .env if NODE_ENV is not set.
 * - Use different .env files for development and production environments.
 */
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: path.join(backendRoot, '.env.dev') });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.join(backendRoot, '.env.prod') });
} else {
    dotenv.config({ path: path.join(backendRoot, '.env') }); // Loads .env by default
}
const activeEnv = process.env.ENV;
const nodePort = process.env.PORT || process.env.NODE_PORT || 5001;

/* * Express Application Setup
 * - Get the current directory name using path.resolve.
 * - Initialize the Express application.
 */

/**
 * Express application instance configured with middleware, routes, and static file serving
 * Handles API endpoints for authentication, users, documents, teams, projects, and more
 * Includes CORS, rate limiting, JSON parsing, and production static file serving
 * @type {express.Application}
 */
const app = express(); // Initialize Express app
const selectedUi = (process.env.DOCMAN_UI || process.env.UI_FLAVOR || "vue").toLowerCase();
const frontendDistPath = uiDistFolders[selectedUi] || uiDistFolders.vue;

/* * Middleware Configuration
 * - Security Headers: Comprehensive security headers for protection
 * - JSON Parsing: Parse incoming JSON request bodies
 * - Rate Limiting: Apply rate limiting to prevent abuse
 * - Static File Serving: Serve static files in production
 */
// Apply comprehensive security headers (includes CORS)
app.use(createSecurityMiddleware());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Parse JSON request bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(rateLimiter); // Apply rate limiting middleware
app.use("/api/auth", authRoutes); // Declare authentication endpoints
app.use("/api/users", usersRoutes); // Declare user endpoints
app.use("/api/docs", docsRoutes); // Declare docs endpoints
app.use("/api/categories", categoriesRoutes); // Declare category endpoints
app.use("/api/books", booksRoutes); // Declare books endpoints
app.use("/api/teams", teamsRoutes); // Declare teams endpoints
app.use("/api/projects", projectsRoutes); // Declare projects endpoints
app.use("/api/system", systemRoutes); // Declare system endpoints
app.use("/api/analytics", analyticsRoutes); // Declare analytics endpoints
app.use("/api/custom-charts", customChartsRoutes); // Declare custom charts endpoints
app.use("/api/reviews", reviewRoutes); // Declare review endpoints
app.use("/api/external-contacts", externalContactsRoutes); // Declare external contacts endpoints
app.use("/api/notifications", notificationsRoutes); // Declare notifications endpoints
app.use("/upload", uploadRoutes); // Declare uploads endpoints
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"))); // Serve uploaded files

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
});
// Static file serving for production
if(process.env.NODE_ENV === 'production') {
    console.log(`Serving ${selectedUi} UI from:`, frontendDistPath);
    // Serve static files from the selected frontend app in production
    app.use(express.static(frontendDistPath));
    // Handle any requests that don't match the API routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}

/* * Starting the Server
 * - The server connects to MongoDB before listening for requests.
 * - Logs the active environment and port number.
 */
const startServer = async () => {
    console.log("Active environment is:", activeEnv);
    console.log("Connecting to MongoDB...");

    await connectDB();

    if (String(process.env.SEED_ON_DEPLOY || '').toLowerCase() === 'true') {
        const { runSafeSeed } = await import('./scripts/seedSafe.js');
        await runSafeSeed({ manageConnection: false });
    }

    app.listen(nodePort, () => {
        console.log("Node server is running on port:", nodePort);
        console.log("Server is ready to accept requests.");
    });
};

startServer().catch((error) => {
    console.error("Server startup failed:", error?.name || "Error", error?.message || error);
    process.exit(1);
});

export default app;
