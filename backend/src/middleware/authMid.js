import { verifyToken } from "../lib/secretToken.js";

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided." });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({ message: "Invalid token." });
    }
};

export default authMiddleware;