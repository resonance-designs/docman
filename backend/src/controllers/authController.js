import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import nodemailer from "nodemailer";
import { createSecretToken } from "../lib/secretToken.js";

export async function register(req, res) {
    try {
        const { email, firstname, lastname, username, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (!email || !firstname || !lastname || !username || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }
        if (existingUser) {
            return res.status(409).json({ message: "Email already in use." });
        }
        const user = new User({ email, firstname, lastname, username, password });
        await user.save();
        const token = createSecretToken(user._id);
        res.status(201).json({ token, user: { id: user._id, email, firstname, lastname, username } });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Registration failed." });
    }
}

export async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const token = createSecretToken(user._id);
        res.status(200).json({ token, user: { id: user._id, email, username: user.username } });
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