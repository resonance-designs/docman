import dotenv from "dotenv";
import jwt from "jsonwebtoken";

if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.dev' });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.prod' });
} else {
    dotenv.config(); // Loads .env by default
}

export function createAccessToken(id) {
    return jwt.sign({ id }, process.env.TOKEN_KEY, { expiresIn: "15m" });
}

export function verifyAccessToken(token) {
    return jwt.verify(token, process.env.TOKEN_KEY);
}

export function createSecretToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    });
}