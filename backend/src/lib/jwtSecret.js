/*
 * @name jwtSecret
 * @file /docman/backend/src/lib/jwtSecret.js
 * @module jwtSecret
 * @description Shared JWT secret configuration for token signing and verification
 * @author Richard Bakos
 * @version 2.2.5
 * @license UNLICENSED
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const DEFAULT_TOKEN_KEY = "docman-dev-secret-key-2024";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");

if (process.env.NODE_ENV === "development") {
    dotenv.config({ path: path.join(backendRoot, ".env.dev") });
} else if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: path.join(backendRoot, ".env.prod") });
} else {
    dotenv.config({ path: path.join(backendRoot, ".env") });
}

const isProduction = process.env.NODE_ENV === "production" || process.env.ENV === "Production";
const configuredTokenKey = process.env.JWT_SECRET || process.env.TOKEN_KEY;

if (!configuredTokenKey && isProduction) {
    throw new Error("Missing JWT secret. Set JWT_SECRET or TOKEN_KEY before starting the backend in production.");
}

if (configuredTokenKey === DEFAULT_TOKEN_KEY && isProduction) {
    throw new Error("Refusing to use the default JWT secret in production. Set JWT_SECRET or TOKEN_KEY to a secure random value.");
}

export const TOKEN_KEY = configuredTokenKey || DEFAULT_TOKEN_KEY;

if (TOKEN_KEY === DEFAULT_TOKEN_KEY) {
    console.warn("WARNING: Using default JWT secret. Set JWT_SECRET or TOKEN_KEY for deployed environments.");
}

console.log("JWT secret configured, length:", TOKEN_KEY.length);
