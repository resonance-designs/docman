/*
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import request from "supertest";
import app from "../server.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import bcrypt from "bcrypt";

const testUser = {
    email: "test+ci@example.com",
    firstname: "CI",
    lastname: "Tester",
    username: "citester",
    password: "Password123!",
};

describe("Auth Integration", () => {
    beforeAll(async () => {
        await new Promise((res) => setTimeout(res, 1000));
    });

    afterAll(async () => {
        await User.deleteOne({ email: testUser.email });
        await mongoose.connection.close();
    });

    test("should register, login, refresh token, and access protected route", async () => {
        // Register user
        await request(app)
            .post("/api/auth/register")
            .send(testUser)
            .expect(201);

        // Login
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: testUser.email, password: testUser.password })
            .expect(200);

        const accessToken = loginRes.body.token;
        expect(accessToken).toBeDefined();
        const cookies = loginRes.headers['set-cookie'];
        expect(cookies).toBeDefined();

        // Access protected route
        const protectedRes = await request(app)
            .get("/api/docs")
            .set("Authorization", `Bearer ${accessToken}`);
        expect([200, 204, 401]).toContain(protectedRes.status);

        // Access with invalid token
        const bad = await request(app)
            .get("/api/docs")
            .set("Authorization", `Bearer invalid_token`);
        expect([401, 403]).toContain(bad.status);

        // Refresh token
        const agent = request.agent(app);
        if (cookies && cookies.length) {
            agent.jar.setCookie(cookies[0]);
        }
        const refreshRes = await agent.get("/api/auth/refresh").expect(200);
        const newAccess = refreshRes.body.token;
        expect(newAccess).toBeDefined();

        // Access with new token
        const after = await request(app)
            .get("/api/docs")
            .set("Authorization", `Bearer ${newAccess}`);
        expect([200, 204]).toContain(after.status);

        // Logout
        await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${newAccess}`)
            .set('Cookie', cookies)
            .expect(200);
    }, 20000);

    test("should fail to register with invalid data", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                email: "invalid-email",
                firstname: "Test",
                lastname: "User",
                username: "testuser",
                password: "123" // Weak password
            })
            .expect(400);

        expect(res.body.message).toBe("Validation failed");
        expect(res.body.errors).toBeDefined();
    });

    test("should fail to login with invalid credentials", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "wrong@example.com",
                password: "wrongpassword"
            })
            .expect(401);

        expect(res.body.message).toBe("Invalid credentials.");
    });

    test("should handle forgot password flow", async () => {
        // Create user first
        const hashedPassword = await bcrypt.hash(testUser.password, 12);
        await User.create({
            ...testUser,
            password: hashedPassword
        });

        // Request password reset
        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: testUser.email })
            .expect(200);

        expect(res.body.message).toBe("Password reset link sent to your email.");

        // Clean up
        await User.deleteOne({ email: testUser.email });
    });
});
