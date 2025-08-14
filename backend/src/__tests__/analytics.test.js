/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import request from "supertest";
import app from "../server.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import Doc from "../models/Doc.js";
import bcrypt from "bcrypt";

const testUser = {
    email: "analyticsuser@test.com",
    firstname: "Analytics",
    lastname: "User",
    username: "analyticsuser",
    password: "Password123!",
    role: "viewer"
};

const testAdmin = {
    email: "analyticsadmin@test.com",
    firstname: "Analytics",
    lastname: "Admin",
    username: "analyticsadmin",
    password: "Password123!",
    role: "admin"
};

describe("Analytics API", () => {
    let userToken, adminToken, userId;

    beforeAll(async () => {
        // Wait for database connection
        await new Promise((res) => setTimeout(res, 1000));
        
        // Create test users
        const hashedPassword = await bcrypt.hash(testUser.password, 12);
        const user = await User.create({
            ...testUser,
            password: hashedPassword
        });
        userId = user._id;

        const adminUser = await User.create({
            ...testAdmin,
            password: hashedPassword
        });
    });

    afterAll(async () => {
        // Clean up test users and documents
        await User.deleteOne({ email: testUser.email });
        await User.deleteOne({ email: testAdmin.email });
        await Doc.deleteMany({ title: /Test Document/ });
        await mongoose.connection.close();
    });

    describe("POST /api/auth/login", () => {
        test("should login analytics user", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(200);

            userToken = res.body.token;
        });

        test("should login admin user", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testAdmin.email,
                    password: testAdmin.password
                })
                .expect(200);

            adminToken = res.body.token;
        });
    });

    describe("GET /api/analytics/stats", () => {
        test("should get analytics stats", async () => {
            const res = await request(app)
                .get("/api/analytics/stats")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body).toHaveProperty("totalUsers");
            expect(res.body).toHaveProperty("totalDocs");
            expect(res.body).toHaveProperty("totalTeams");
            expect(res.body).toHaveProperty("totalProjects");
        });

        test("should fail to get analytics stats as regular user", async () => {
            const res = await request(app)
                .get("/api/analytics/stats")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);

            expect(res.body.message).toBe("Access denied.");
        });
    });

    describe("GET /api/analytics/user-activity", () => {
        test("should get user activity data", async () => {
            const res = await request(app)
                .get("/api/analytics/user-activity")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });

        test("should fail to get user activity as regular user", async () => {
            const res = await request(app)
                .get("/api/analytics/user-activity")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);

            expect(res.body.message).toBe("Access denied.");
        });
    });

    describe("GET /api/analytics/doc-stats", () => {
        test("should get document statistics", async () => {
            const res = await request(app)
                .get("/api/analytics/doc-stats")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body).toHaveProperty("totalDocs");
            expect(res.body).toHaveProperty("reviewedDocs");
            expect(res.body).toHaveProperty("overdueDocs");
        });

        test("should fail to get document stats as regular user", async () => {
            const res = await request(app)
                .get("/api/analytics/doc-stats")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);

            expect(res.body.message).toBe("Access denied.");
        });
    });

    describe("GET /api/analytics/system-info", () => {
        test("should get system information", async () => {
            const res = await request(app)
                .get("/api/analytics/system-info")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body).toHaveProperty("nodeVersion");
            expect(res.body).toHaveProperty("os");
            expect(res.body).toHaveProperty("uptime");
        });

        test("should fail to get system info as regular user", async () => {
            const res = await request(app)
                .get("/api/analytics/system-info")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);

            expect(res.body.message).toBe("Access denied.");
        });
    });
});