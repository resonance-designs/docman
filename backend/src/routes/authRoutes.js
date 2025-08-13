import express from "express";
import { register, login, forgotPassword, resetPassword, refreshToken, logout } from "../controllers/authController.js";
import { limitLogin, limitRegister, limitPasswordReset } from "../middleware/authRateLimiter.js";

const router = express.Router();

router.post("/register", limitRegister, register);
router.post("/login", limitLogin, login);
router.post("/forgot-password", limitPasswordReset, forgotPassword);
router.post("/reset-password", limitPasswordReset, resetPassword);
router.get("/refresh", refreshToken);
router.post("/logout", logout);

export default router;