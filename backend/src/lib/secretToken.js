import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.dev' });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.prod' });
} else {
    dotenv.config(); // Loads .env by default
}

const TOKEN_KEY = process.env.TOKEN_KEY || "CHANGE_ME";

export function createAccessToken(id, role) {
    return jwt.sign({ id, role }, TOKEN_KEY, { expiresIn: "15m" });
}

// Optional: helper to create a long-lived refresh JWT (not used by opaque token flow)
export function createSecretToken(id, role) {
    return jwt.sign({ id, role }, TOKEN_KEY, { expiresIn: "7d" });
}

// Middleware: verify access token from Authorization header and attach user to req.user
export async function verifyAccessToken(req, res, next) {
    try {
        const authHeader = req.headers?.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
        if (!token) return res.status(401).json({ message: "No token provided" });

        const decoded = jwt.verify(token, TOKEN_KEY);
        if (!decoded || !decoded.id) return res.status(401).json({ message: "Invalid token" });

        // Attach minimal user info (id and role). If you need full user object, fetch from DB.
        // Here we fetch role from DB to ensure latest role change is respected.
        const user = await User.findById(decoded.id).select("-password -refreshTokenHash -resetPasswordToken -resetPasswordExpires").lean();
        if (!user) return res.status(401).json({ message: "User not found" });

        req.user = user;
        next();
    } catch (err) {
        console.error("verifyAccessToken error:", err.message || err);
        return res.status(401).json({ message: "Invalid token" });
    }
}
