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

const testAdmin = {
    email: "admin@test.com",
    firstname: "Test",
    lastname: "Admin",
    username: "testadmin",
    password: "Password123!",
    role: "admin"
};

const testUser = {
    email: "user@test.com",
    firstname: "Test",
    lastname: "User",
    username: "testuser",
    password: "Password123!",
    role: "viewer"
};

const testUser2 = {
    email: "user2@test.com",
    firstname: "Test2",
    lastname: "User2",
    username: "testuser2",
    password: "Password123!",
    role: "editor"
};

describe("Users API", () => {
    let adminToken, userToken, adminId, userId;

    beforeAll(async () => {
        // Wait for database connection
        await new Promise((res) => setTimeout(res, 1000));
        
        // Create test users
        const hashedPassword = await bcrypt.hash(testAdmin.password, 12);
        const admin = await User.create({
            ...testAdmin,
            password: hashedPassword
        });
        adminId = admin._id;

        const user = await User.create({
            ...testUser,
            password: hashedPassword
        });
        userId = user._id;

    });

    afterAll(async () => {
        // Clean up test users
        await User.deleteOne({ email: testAdmin.email });
        await User.deleteOne({ email: testUser.email });
        await User.deleteOne({ email: testUser2.email });
        await mongoose.connection.close();
    });

    describe("POST /api/auth/login", () => {
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

        test("should login regular user", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(200);

            userToken = res.body.token;
        });
    });

    describe("GET /api/users", () => {
        test("should get all users for admin", async () => {
            const res = await request(app)
                .get("/api/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        test("should get all users for regular user", async () => {
            const res = await request(app)
                .get("/api/users")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });
    });

    describe("GET /api/users/:id", () => {
        test("should get user by ID for admin", async () => {
            const res = await request(app)
                .get(`/api/users/${userId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body._id).toBe(userId.toString());
            expect(res.body.email).toBe(testUser.email);
        });

        test("should get user by ID for regular user", async () => {
            const res = await request(app)
                .get(`/api/users/${userId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body._id).toBe(userId.toString());
            expect(res.body.email).toBe(testUser.email);
        });

        test("should fail to get user with invalid ID", async () => {
            const res = await request(app)
                .get("/api/users/invalid-id")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(404);

            expect(res.body.message).toBe("User not found.");
        });
    });

    describe("PUT /api/users/:id", () => {
        test("should update user's own profile", async () => {
            const res = await request(app)
                .put(`/api/users/${userId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    firstname: "Updated",
                    lastname: "User"
                })
                .expect(200);

            expect(res.body.message).toBe("User updated successfully");
            expect(res.body.user.firstname).toBe("Updated");
        });

        test("should update user's theme", async () => {
            const res = await request(app)
                .put(`/api/users/${userId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    theme: "clean-business"
                })
                .expect(200);

            expect(res.body.user.theme).toBe("clean-business");
        });

        test("should admin update another user's role", async () => {
            const res = await request(app)
                .put(`/api/users/${userId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    role: "editor"
                })
                .expect(200);

            expect(res.body.message).toBe("User updated successfully");
        });

        test("should fail to update another user's profile for regular user", async () => {
            const res = await request(app)
                .put(`/api/users/${adminId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    firstname: "Hacker"
                })
                .expect(403);

            expect(res.body.message).toBe("You can only edit your own profile.");
        });

        test("should fail to update with invalid data", async () => {
            const res = await request(app)
                .put(`/api/users/${userId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    email: "invalid-email"
                })
                .expect(400);

            expect(res.body.message).toBe("Validation failed");
        });
    });

    describe("DELETE /api/users/:id", () => {
        test("should delete user as admin", async () => {
            // Create a user to delete
            const hashedPassword = await bcrypt.hash(testUser2.password, 12);
            const userToDelete = await User.create({
                ...testUser2,
                password: hashedPassword
            });

            const res = await request(app)
                .delete(`/api/users/${userToDelete._id}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body.message).toBe("User deleted successfully");
        });

        test("should fail to delete user as regular user", async () => {
            const res = await request(app)
                .delete(`/api/users/${adminId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);

            expect(res.body.message).toBe("Access denied.");
        });
    });
});