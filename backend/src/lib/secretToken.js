import dotenv from "dotenv";
import jwt from "jsonwebtoken";

if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.dev' });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.prod' });
} else {
    dotenv.config(); // Loads .env by default
}

export function createSecretToken(id) {
    return jwt.sign({ id }, process.env.TOKEN_KEY, {
        expiresIn: "3d",
    });
}

export function verifyToken(token) {
    return jwt.verify(token, process.env.TOKEN_KEY);
}