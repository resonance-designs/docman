/*
 * @name authController
 * @file /docman/backend/src/controllers/authController.js
 * @controller authController
 * @description Authentication controller handling user registration, login, logout, and password reset functionality
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { createAccessToken } from "../lib/secretToken.js";
import { record, AUDIT_ACTIONS } from "../services/auditService.js";

function hashResetToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function getAppBaseUrl() {
    return (process.env.APP_BASE_URL || process.env.FRONTEND_URL || "http://localhost:5174").replace(/\/+$/, "");
}
import { sendEmail } from "../lib/emailService.js";
import {
    validateName,
    validateEmail,
    validatePassword,
    validateRole,
    validateUsername,
    sanitizeString,
    sanitizeEmail
} from "../lib/validation.js";

function isLocalSelfRegistrationEnabled() {
    return process.env.LOCAL_SELF_REGISTRATION_ENABLED !== "false";
}

/**
 * Helper function to set refresh token cookie
 * @param {Object} res - Express response object
 * @param {string} token - Refresh token to set in cookie
 */
function setRefreshCookie(res, token) {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days to match access token
    });
}

/**
 * Register a new user account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with access token and user data or error message
 */
export async function register(req, res) {
    try {
        if (!isLocalSelfRegistrationEnabled()) {
            return res.status(403).json({
                message: "Local self-registration is disabled. Create a Resonance Account through Authentik instead.",
            });
        }

        const { email, firstname, lastname, username, password, role } = req.body;

        // Validation
        const validationErrors = [];

        const firstnameResult = validateName(firstname, "First name");
        if (!firstnameResult.isValid) validationErrors.push({ field: "firstname", message: firstnameResult.error });

        const lastnameResult = validateName(lastname, "Last name");
        if (!lastnameResult.isValid) validationErrors.push({ field: "lastname", message: lastnameResult.error });

        const emailResult = validateEmail(email);
        if (!emailResult.isValid) validationErrors.push({ field: "email", message: emailResult.error });

        const passwordResult = validatePassword(password);
        if (!passwordResult.isValid) validationErrors.push({ field: "password", message: passwordResult.error });

        if (role && role !== "viewer") {
            validationErrors.push({ field: "role", message: "Self-registration cannot request a role. An administrator assigns roles." });
        }

        const usernameError = validateUsername(username);
        if (usernameError) validationErrors.push({ field: "username", message: usernameError });

        // Return validation errors if any
        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationErrors.reduce((acc, error) => {
                    acc[error.field] = error.message;
                    return acc;
                }, {})
            });
        }
        
        // Use sanitized values from validation results
        const sanitizedEmail = emailResult.sanitized;
        const sanitizedFirstname = firstnameResult.sanitized;
        const sanitizedLastname = lastnameResult.sanitized;
        const sanitizedUsername = sanitizeString(username); // validateUsername doesn't return sanitized value

        const existingUser = await User.findOne({
            $or: [{ email: sanitizedEmail }, { username: sanitizedUsername }]
        });
        if (existingUser) return res.status(409).json({ message: "User already exists." });

        // Self-registration always creates a viewer. Roles are granted by admins afterwards (and audited).
        const assignedRole = "viewer";

        // Create user - password will be hashed by pre-save middleware
        const user = new User({
            email: sanitizedEmail,
            firstname: sanitizedFirstname,
            lastname: sanitizedLastname,
            username: sanitizedUsername,
            password: password, // Don't hash here - let pre-save middleware handle it
            role: assignedRole
        });
        await user.save();

        // Create tokens
        const accessToken = createAccessToken(user._id, user.role, user.sessionVersion || 0);

        // Create opaque refresh token and store its hash
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const hashed = await bcrypt.hash(refreshToken, 12);
        const loginUpdate = await User.updateOne(
            { _id: user._id, isActive: { $ne: false }, $or: [{ sessionVersion: user.sessionVersion || 0 }, ...(user.sessionVersion ? [] : [{ sessionVersion: { $exists: false } }])] },
            { $set: { refreshTokenHash: hashed } }
        );
        if (!loginUpdate.matchedCount) return res.status(401).json({ message: 'Account changed; sign in again.' });

        setRefreshCookie(res, refreshToken);

        await record(req, {
            actorUser: { _id: user._id, email: user.email, role: user.role },
            action: AUDIT_ACTIONS.AUTH_REGISTER,
            resourceType: "user",
            resourceId: user._id,
            summary: `Self-registered local account ${user.email}`,
        });

        res.status(201).json({ token: accessToken, user: { id: user._id, email: user.email, username: user.username, role: user.role } });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Registration failed." });
    }
}

/**
 * Authenticate a user and generate access/refresh tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with access token and user data or error message
 */
export async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Allow login with either email or username
        const user = await User.findOne({
            $or: [{ email: email }, { username: email }]
        });
        if (!user || user.isActive === false || !(await bcrypt.compare(password, user.password))) {
            await record(req, {
                action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
                outcome: "failure",
                resourceType: "user",
                resourceId: user?._id || null,
                summary: `Failed login for "${email.slice(0, 200)}"`,
                metadata: { identifier: email.slice(0, 200), knownUser: Boolean(user) },
            });
            return res.status(401).json({ message: "Invalid credentials." });
        }

        console.log("🔑 Creating access token for user:", user._id, "with role:", user.role);
        const accessToken = createAccessToken(user._id, user.role, user.sessionVersion || 0);
        console.log("🔑 Access token created, length:", accessToken.length);

        // Rotate refresh token: create new opaque token/hash
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const hashed = await bcrypt.hash(refreshToken, 12);
        const loginUpdate = await User.updateOne(
            { _id: user._id, isActive: { $ne: false }, $or: [{ sessionVersion: user.sessionVersion || 0 }, ...(user.sessionVersion ? [] : [{ sessionVersion: { $exists: false } }])] },
            { $set: { refreshTokenHash: hashed } }
        );
        if (!loginUpdate.matchedCount) return res.status(401).json({ message: 'Account changed; sign in again.' });

        setRefreshCookie(res, refreshToken);

        await record(req, {
            actorUser: { _id: user._id, email: user.email, role: user.role },
            action: AUDIT_ACTIONS.AUTH_LOGIN,
            resourceType: "user",
            resourceId: user._id,
            summary: `Signed in (${user.email})`,
        });

        res.status(200).json({ token: accessToken, user: { id: user._id, email: user.email, username: user.username, role: user.role } });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed." });
    }
}

/**
 * Request a password reset email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function forgotPassword(req, res) {
    const { email } = req.body;
    const genericResponse = { message: "If an account exists for that email, a password reset link has been sent." };
    if (typeof email !== "string" || !email) return res.status(400).json({ message: "Email is required." });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Same response whether or not the account exists (prevents account enumeration)
    if (!user) return res.json(genericResponse);

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = hashResetToken(token); // only the hash is stored
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset link
    const resetLink = `${getAppBaseUrl()}/reset-password?token=${token}`;
    const text = `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${resetLink}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;
    const html = `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
                  <p>Please click on the following link, or paste this into your browser to complete the process:</p>
                  <p><a href="${resetLink}">Reset Password</a></p>
                  <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`;

    try {
        await sendEmail(user.email, "Password Reset Request", text, html);
        res.json(genericResponse);
    } catch (error) {
        console.error("Error sending password reset email:", error);
        res.status(500).json({ message: "Error sending password reset email. Please try again later." });
    }
}

/**
 * Reset a user's password using a token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function resetPassword(req, res) {
    const { token, password } = req.body;
    if (typeof token !== "string" || !token || typeof password !== "string") {
        return res.status(400).json({ message: "Invalid or expired token." });
    }
    const passwordResult = validatePassword(password);
    if (!passwordResult.isValid) return res.status(400).json({ message: passwordResult.error });

    const user = await User.findOne({
        resetPasswordToken: hashResetToken(token),
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired token." });

    user.password = password; // Don't hash here - let pre-save middleware handle it
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokenHash = undefined; // sign out other sessions
    await user.save();

    await record(req, {
            actorUser: { _id: user._id, email: user.email, role: user.role },
        action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET,
        resourceType: "user",
        resourceId: user._id,
        summary: `Password reset via emailed token (${user.email})`,
    });

    res.json({ message: "Password has been reset." });
}

/**
 * Refresh an expired access token using a refresh token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with new access token or error message
 */
export async function refreshToken(req, res) {
    try {
        const cookieToken = req.cookies?.refreshToken;
        if (!cookieToken) return res.status(401).json({ message: "No refresh token provided." });

        // Find user by comparing hashes (inefficient for many users; ok for small apps)
        const users = await User.find({ refreshTokenHash: { $exists: true } });
        let found = null;
        for (const u of users) {
            if (u.refreshTokenHash && await bcrypt.compare(cookieToken, u.refreshTokenHash)) { found = u; break; }
        }
        if (!found || found.isActive === false) return res.status(401).json({ message: "Invalid refresh token." });

        // Rotate
        const newRefresh = crypto.randomBytes(64).toString('hex');
        const newHash = await bcrypt.hash(newRefresh, 12);
        const refreshUpdate = await User.updateOne(
            { _id: found._id, isActive: { $ne: false }, $or: [{ sessionVersion: found.sessionVersion || 0 }, ...(found.sessionVersion ? [] : [{ sessionVersion: { $exists: false } }])], refreshTokenHash: found.refreshTokenHash },
            { $set: { refreshTokenHash: newHash } }
        );
        if (!refreshUpdate.matchedCount) return res.status(401).json({ message: 'Session changed; sign in again.' });

        // Issue new access token
        const newAccess = createAccessToken(found._id, found.role, found.sessionVersion || 0);
        setRefreshCookie(res, newRefresh);
        res.json({ token: newAccess });
    } catch (error) {
        console.error("Refresh token error:", error);
        res.status(403).json({ message: "Could not refresh token." });
    }
}

/**
 * Invalidate a user's refresh token and clear authentication cookies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function logout(req, res) {
    try {
        const cookieToken = req.cookies?.refreshToken;
        let loggedOutUser = null;
        if (typeof cookieToken === "string" && cookieToken) {
            const users = await User.find({ refreshTokenHash: { $exists: true } });
            for (const u of users) {
                if (u.refreshTokenHash && await bcrypt.compare(cookieToken, u.refreshTokenHash)) { u.refreshTokenHash = undefined; await u.save(); loggedOutUser = u; break; }
            }
        }
        if (loggedOutUser) {
            await record(req, {
            actorUser: { _id: loggedOutUser._id, email: loggedOutUser.email, role: loggedOutUser.role },
                action: AUDIT_ACTIONS.AUTH_LOGOUT,
                resourceType: "user",
                resourceId: loggedOutUser._id,
                summary: `Signed out (${loggedOutUser.email})`,
            });
        }
        
        // Blacklist the access token if provided in Authorization header
        const authHeader = req.headers?.authorization || "";
        const accessToken = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
        if (accessToken) {
            // Import the blacklistToken function here to avoid circular dependencies
            const secretTokenModule = await import("../lib/secretToken.js");
            const invalidated = await secretTokenModule.blacklistToken(accessToken);
            if (!invalidated) return res.status(503).json({ message: "Unable to invalidate the session. Please retry sign out." });
        }
        
        res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
        res.json({ message: "Logged out." });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Logout failed." });
    }
}

/**
 * Return the current authenticated RDocMan session user.
 * Works for both local DocMan JWTs and future Authentik-linked identities once request identity is resolved.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with current authenticated user
 */
export async function getCurrentSession(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        res.status(200).json({
            user: req.user,
            identity: req.identity ? {
                authType: req.identity.authType,
                provider: req.identity.provider,
                resolution: req.identity.resolution || null,
            } : null,
        });
    } catch (error) {
        console.error("Get current session error:", error);
        res.status(500).json({ message: "Failed to resolve current session." });
    }
}
