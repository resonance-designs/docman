/*
 * @name authController
 * @file /docman/backend/src/controllers/authController.js
 * @controller authController
 * @description Authentication controller handling user registration, login, logout, and password reset functionality
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { createAccessToken } from "../lib/secretToken.js";
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
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

        if (role) {
            const roleResult = validateRole(role);
            if (!roleResult.isValid) validationErrors.push({ field: "role", message: roleResult.error });
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

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({
            email: sanitizedEmail,
            firstname: sanitizedFirstname,
            lastname: sanitizedLastname,
            username: sanitizedUsername,
            password: hashedPassword,
            role: role || "viewer"
        });
        await user.save();

        // Create tokens
        const accessToken = createAccessToken(user._id, user.role);

        // Create opaque refresh token and store its hash
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const hashed = await bcrypt.hash(refreshToken, 12);
        user.refreshTokenHash = hashed;
        await user.save();

        setRefreshCookie(res, refreshToken);

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
        if (!email || !password) return res.status(400).json({ message: "All fields are required." });

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        console.log("🔑 Creating access token for user:", user._id, "with role:", user.role);
        const accessToken = createAccessToken(user._id, user.role);
        console.log("🔑 Access token created, length:", accessToken.length);

        // Rotate refresh token: create new opaque token/hash
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const hashed = await bcrypt.hash(refreshToken, 12);
        user.refreshTokenHash = hashed;
        await user.save();

        setRefreshCookie(res, refreshToken);

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
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset link
    const resetLink = `http://yourfrontend.com/reset-password?token=${token}`;
    const text = `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${resetLink}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;
    const html = `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
                  <p>Please click on the following link, or paste this into your browser to complete the process:</p>
                  <p><a href="${resetLink}">Reset Password</a></p>
                  <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`;

    try {
        await sendEmail(user.email, "Password Reset Request", text, html);
        res.json({ message: "Password reset link sent to your email." });
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
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired token." });

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

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
        if (!found) return res.status(401).json({ message: "Invalid refresh token." });

        // Rotate
        const newRefresh = crypto.randomBytes(64).toString('hex');
        const newHash = await bcrypt.hash(newRefresh, 12);
        found.refreshTokenHash = newHash;
        await found.save();

        // Issue new access token
        const newAccess = createAccessToken(found._id, found.role);
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
        if (cookieToken) {
            const users = await User.find({ refreshTokenHash: { $exists: true } });
            for (const u of users) {
                if (u.refreshTokenHash && await bcrypt.compare(cookieToken, u.refreshTokenHash)) { u.refreshTokenHash = undefined; await u.save(); break; }
            }
        }
        
        // Blacklist the access token if provided in Authorization header
        const authHeader = req.headers?.authorization || "";
        const accessToken = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
        if (accessToken) {
            // Import the blacklistToken function here to avoid circular dependencies
            const secretTokenModule = await import("../lib/secretToken.js");
            await secretTokenModule.blacklistToken(accessToken);
        }
        
        res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
        res.json({ message: "Logged out." });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Logout failed." });
    }
}
