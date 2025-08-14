/*
 * @name authRoutes
 * @file /docman/backend/src/routes/authRoutes.js
 * @routes authRoutes
 * @description Authentication routes for user registration, login, logout, password reset, and token refresh
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import express from "express";
import { register, login, forgotPassword, resetPassword, refreshToken, logout } from "../controllers/authController.js";
import { limitLogin, limitRegister, limitPasswordReset } from "../middleware/authRateLimiter.js";

const router = express.Router();

// POST /api/auth/register - Register a new user account
// Rate limited to prevent abuse
router.post("/register", limitRegister, register);

// POST /api/auth/login - Authenticate a user and generate access/refresh tokens
// Rate limited to prevent brute force attacks
router.post("/login", limitLogin, login);

// POST /api/auth/forgot-password - Request a password reset email
// Rate limited to prevent spamming email addresses
router.post("/forgot-password", limitPasswordReset, forgotPassword);

// POST /api/auth/reset-password - Reset a user's password using a token
// Rate limited to prevent brute force attacks on reset tokens
router.post("/reset-password", limitPasswordReset, resetPassword);

// GET /api/auth/refresh - Refresh an expired access token using a refresh token
router.get("/refresh", refreshToken);

// POST /api/auth/logout - Invalidate a user's refresh token and clear authentication cookies
router.post("/logout", logout);

export default router;