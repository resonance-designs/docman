import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import nodemailer from "nodemailer";
import { createAccessToken } from "../lib/secretToken.js";

// Helper to set refresh cookie
function setRefreshCookie(res, token) {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
}

export async function register(req, res) {
    try {
        const { email, firstname, lastname, username, password, role } = req.body;
        if (!email || !firstname || !lastname || !username || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(409).json({ message: "Email already in use." });

        const user = new User({ email, firstname, lastname, username, password, role });
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

export async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "All fields are required." });

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const accessToken = createAccessToken(user._id, user.role);

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

export async function forgotPassword(req, res) {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'broderick.carroll@ethereal.email',
            pass: 'aqDYjX8EXtGV3r7x3v'
        }
    });

    (async () => {
        const info = await transporter.sendMail({
            from: '"Resonance Designs - No Reply" <noreply@resonancedesigns.dev>',
            to: user.email,
            subject: "Your password reset link",
            text: "Reset link: http://yourfrontend.com/reset-password?token=${token}", // plain‑text body
            html: '<b>Reset link: <a href="http://yourfrontend.com/reset-password?token=${token}">http://yourfrontend.com/reset-password?token=${token}</a></b>', // HTML body
        });

        console.log("Message sent:", info.messageId);
    })();

    // Send email with reset link (pseudo-code)
    // await sendEmail(user.email, `Reset link: http://yourfrontend.com/reset-password?token=${token}`);

    res.json({ message: "Password reset link sent to your email." });
}

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

export async function logout(req, res) {
    try {
        const cookieToken = req.cookies?.refreshToken;
        if (cookieToken) {
            const users = await User.find({ refreshTokenHash: { $exists: true } });
            for (const u of users) {
                if (u.refreshTokenHash && await bcrypt.compare(cookieToken, u.refreshTokenHash)) { u.refreshTokenHash = undefined; await u.save(); break; }
            }
        }
        res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
        res.json({ message: "Logged out." });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Logout failed." });
    }
}
