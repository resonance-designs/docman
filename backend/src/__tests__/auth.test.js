/*
 * @author Richard Bakos
 * @version 2.0.2
 * @license UNLICENSED
 */
import request from "supertest";
import app from "../server.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import bcrypt from "bcrypt";

/**
 * Test user data for authentication tests
 * @type {Object}
 */
const testUser = {
    email: "test@example.com",
    firstname: "Test",
    lastname: "User",
    username: "testuser",
    password: "Password123!",
};

/**
 * Authentication API test suite
 * Tests user registration, login, logout, and password reset functionality
 */
describe("Auth API", () => {
    beforeAll(async () => {
        // Wait for database connection
        await new Promise((res) => setTimeout(res, 1000));
    });

    afterAll(async () => {
        // Clean up test user
        await User.deleteOne({ email: testUser.email });
        await mongoose.connection.close();
    });

    describe("POST /api/auth/register", () => {
        afterEach(async () => {
            // Clean up after each test
            await User.deleteOne({ email: testUser.email });
        });

        test("should register a new user successfully", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send(testUser)
                .expect(201);

            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe(testUser.email);
            expect(res.body.user.role).toBe("viewer");
            expect(res.headers['set-cookie']).toBeDefined();
        });

        test("should fail to register with invalid email", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    ...testUser,
                    email: "invalid-email"
                })
                .expect(400);

            expect(res.body.message).toBe("Validation failed");
            expect(res.body.errors.email).toBeDefined();
        });

        test("should fail to register with weak password", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    ...testUser,
                    password: "123"
                })
                .expect(400);

            expect(res.body.message).toBe("Validation failed");
            expect(res.body.errors.password).toBeDefined();
        });

        test("should fail to register with existing email", async () => {
            // First registration
            await request(app)
                .post("/api/auth/register")
                .send(testUser)
                .expect(201);

            // Second registration with same email
            const res = await request(app)
                .post("/api/auth/register")
                .send(testUser)
                .expect(409);

            expect(res.body.message).toBe("User already exists.");
        });
    });

    describe("POST /api/auth/login", () => {
        beforeEach(async () => {
            // Create a test user before login tests
            const hashedPassword = await bcrypt.hash(testUser.password, 12);
            await User.create({
                ...testUser,
                password: hashedPassword
            });
        });

        afterEach(async () => {
            // Clean up after each test
            await User.deleteOne({ email: testUser.email });
        });

        test("should login successfully with valid credentials", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(200);

            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe(testUser.email);
            expect(res.headers['set-cookie']).toBeDefined();
        });

        test("should fail to login with invalid email", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "wrong@example.com",
                    password: testUser.password
                })
                .expect(401);

            expect(res.body.message).toBe("Invalid credentials.");
        });

        test("should fail to login with invalid password", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testUser.email,
                    password: "wrongpassword"
                })
                .expect(401);

            expect(res.body.message).toBe("Invalid credentials.");
        });
    });

    describe("POST /api/auth/forgot-password", () => {
        beforeEach(async () => {
            // Create a test user
            const hashedPassword = await bcrypt.hash(testUser.password, 12);
            await User.create({
                ...testUser,
                password: hashedPassword
            });
        });

        afterEach(async () => {
            // Clean up after each test
            await User.deleteOne({ email: testUser.email });
        });

        test("should send password reset email for existing user", async () => {
            const res = await request(app)
                .post("/api/auth/forgot-password")
                .send({ email: testUser.email })
                .expect(200);

            expect(res.body.message).toBe("Password reset link sent to your email.");
        });

        test("should not reveal if user doesn't exist", async () => {
            const res = await request(app)
                .post("/api/auth/forgot-password")
                .send({ email: "nonexistent@example.com" })
                .expect(404);

            expect(res.body.message).toBe("User not found.");
        });
    });

    describe("POST /api/auth/reset-password", () => {
        beforeEach(async () => {
            // Create a test user with reset token
            const hashedPassword = await bcrypt.hash(testUser.password, 12);
            const resetToken = "test-reset-token";
            await User.create({
                ...testUser,
                password: hashedPassword,
                resetPasswordToken: resetToken,
                resetPasswordExpires: Date.now() + 3600000 // 1 hour
            });
        });

        afterEach(async () => {
            // Clean up after each test
            await User.deleteOne({ email: testUser.email });
        });

        test("should reset password with valid token", async () => {
            const user = await User.findOne({ email: testUser.email });
            const res = await request(app)
                .post("/api/auth/reset-password")
                .send({
                    token: user.resetPasswordToken,
                    password: "NewPassword123!"
                })
                .expect(200);

            expect(res.body.message).toBe("Password has been reset.");
        });

        test("should fail to reset password with invalid token", async () => {
            const res = await request(app)
                .post("/api/auth/reset-password")
                .send({
                    token: "invalid-token",
                    password: "NewPassword123!"
                })
                .expect(400);

            expect(res.body.message).toBe("Invalid or expired token.");
        });
    });

    describe("GET /api/auth/refresh", () => {
        let refreshToken;

        beforeEach(async () => {
            // Create a test user with refresh token
            const hashedPassword = await bcrypt.hash(testUser.password, 12);
            const user = await User.create({
                ...testUser,
                password: hashedPassword
            });

            // Create refresh token
            refreshToken = "test-refresh-token";
            const hashed = await bcrypt.hash(refreshToken, 12);
            user.refreshTokenHash = hashed;
            await user.save();
        });

        afterEach(async () => {
            // Clean up after each test
            await User.deleteOne({ email: testUser.email });
        });

        test("should refresh access token with valid refresh token", async () => {
            const res = await request(app)
                .get("/api/auth/refresh")
                .set('Cookie', [`refreshToken=${refreshToken}`])
                .expect(200);

            expect(res.body.token).toBeDefined();
            expect(res.headers['set-cookie']).toBeDefined();
        });

        test("should fail to refresh with invalid refresh token", async () => {
            const res = await request(app)
                .get("/api/auth/refresh")
                .set('Cookie', [`refreshToken=invalid-token`])
                .expect(401);

            expect(res.body.message).toBe("Invalid refresh token.");
        });
    });

    describe("POST /api/auth/logout", () => {
        let refreshToken;

        beforeEach(async () => {
            // Create a test user with refresh token
            const hashedPassword = await bcrypt.hash(testUser.password, 12);
            const user = await User.create({
                ...testUser,
                password: hashedPassword
            });

            // Create refresh token
            refreshToken = "test-refresh-token";
            const hashed = await bcrypt.hash(refreshToken, 12);
            user.refreshTokenHash = hashed;
            await user.save();
        });

        afterEach(async () => {
            // Clean up after each test
            await User.deleteOne({ email: testUser.email });
        });

        test("should logout successfully", async () => {
            const res = await request(app)
                .post("/api/auth/logout")
                .set('Cookie', [`refreshToken=${refreshToken}`])
                .expect(200);

            expect(res.body.message).toBe("Logged out.");
            expect(res.headers['set-cookie']).toBeDefined();
        });
    });
});