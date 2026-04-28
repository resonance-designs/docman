/*
 * @name identityService
 * @file /docman/backend/src/services/identityService.js
 * @service identityService
 * @description Transitional identity resolution service for local JWT auth today and shared suite identity providers later
 * @author Richard Bakos
 * @version 2.2.3
 * @license UNLICENSED
 */
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import BlacklistedToken from "../models/BlacklistedToken.js";
import { TOKEN_KEY } from "../lib/jwtSecret.js";

const USER_SELECT_FIELDS = "-password -refreshTokenHash -resetPasswordToken -resetPasswordExpires";
const AUTHENTIK_ISSUER = process.env.AUTHENTIK_ISSUER || process.env.AUTHENTIK_BASE_URL || "";
const AUTHENTIK_AUDIENCE = process.env.AUTHENTIK_AUDIENCE || process.env.AUTHENTIK_CLIENT_ID || "";
const AUTHENTIK_JWT_PUBLIC_KEY = normalizePem(process.env.AUTHENTIK_JWT_PUBLIC_KEY || "");

function createAuthError(message, statusCode = 401) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function normalizePem(value) {
    return value ? value.replace(/\\n/g, "\n").trim() : "";
}

function isAuthentikConfigured() {
    return Boolean(AUTHENTIK_ISSUER && AUTHENTIK_AUDIENCE && AUTHENTIK_JWT_PUBLIC_KEY);
}

function isAuthentikToken(decoded) {
    if (!decoded || typeof decoded !== "object") {
        return false;
    }

    return Boolean(AUTHENTIK_ISSUER && decoded.iss === AUTHENTIK_ISSUER);
}

/**
 * Extract a Bearer token from the request Authorization header.
 * @param {Object} req - Express request object
 * @returns {string|null} Extracted Bearer token or null
 */
export function extractBearerToken(req) {
    const authHeader = req.headers?.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
        return null;
    }

    return authHeader.split(" ")[1];
}

/**
 * Normalize a user document into the request identity shape expected by the rest of the app.
 * @param {Object} user - User document or lean object
 * @returns {Object} Normalized request user object
 */
export function normalizeRequestUser(user) {
    if (!user) {
        return null;
    }

    const normalizedUser = { ...user };
    normalizedUser.id = normalizedUser._id.toString();

    return normalizedUser;
}

/**
 * Resolve an application user by Authentik subject.
 * @param {string} authentikSub - Authentik subject claim
 * @returns {Promise<Object|null>} Normalized request user or null
 */
export async function findUserByAuthentikSub(authentikSub) {
    if (!authentikSub) {
        return null;
    }

    const user = await User.findOne({ authentikSub }).select(USER_SELECT_FIELDS).lean();
    return normalizeRequestUser(user);
}

/**
 * Resolve the current local DocMan JWT identity.
 * This is the current authentication path and remains in place while the app is prepared for Authentik.
 * @param {string} token - Bearer token supplied by the client
 * @returns {Promise<Object>} Normalized identity context
 */
export async function resolveLocalTokenIdentity(token) {
    if (!token) {
        throw createAuthError("No token provided");
    }

    const blacklistedToken = await BlacklistedToken.findOne({ token }).lean();
    if (blacklistedToken) {
        throw createAuthError("Token has been invalidated");
    }

    const decoded = jwt.verify(token, TOKEN_KEY);
    if (!decoded?.id) {
        throw createAuthError("Invalid token");
    }

    const user = await User.findById(decoded.id).select(USER_SELECT_FIELDS).lean();
    if (!user) {
        throw createAuthError("User not found");
    }

    return {
        authType: "local-jwt",
        provider: user.identityProvider || "local",
        tokenClaims: decoded,
        user: normalizeRequestUser(user),
    };
}

/**
 * Resolve a request authenticated through Authentik-issued JWTs.
 * @param {string} token - Bearer token supplied by the client
 * @returns {Promise<Object>} Normalized identity context
 */
export async function resolveAuthentikTokenIdentity(token) {
    if (!isAuthentikConfigured()) {
        throw createAuthError("Authentik identity is not configured", 500);
    }

    const decoded = jwt.verify(token, AUTHENTIK_JWT_PUBLIC_KEY, {
        algorithms: ["RS256"],
        issuer: AUTHENTIK_ISSUER,
        audience: AUTHENTIK_AUDIENCE,
    });

    if (!decoded?.sub) {
        throw createAuthError("Invalid Authentik token");
    }

    const user = await findUserByAuthentikSub(decoded.sub);
    if (!user) {
        throw createAuthError("No linked RDocMan user for Authentik identity");
    }

    return {
        authType: "authentik-jwt",
        provider: "authentik",
        tokenClaims: decoded,
        user,
    };
}

/**
 * Resolve request identity.
 * Today this supports DocMan-local JWT access tokens.
 * Later this is the seam where Authentik token validation and external subject mapping should be added.
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Identity context with user and token claims
 */
export async function resolveRequestIdentity(req) {
    const token = extractBearerToken(req);
    if (!token) {
        throw createAuthError("No token provided");
    }

    const decoded = jwt.decode(token);
    if (isAuthentikToken(decoded)) {
        return resolveAuthentikTokenIdentity(token);
    }

    return resolveLocalTokenIdentity(token);
}
