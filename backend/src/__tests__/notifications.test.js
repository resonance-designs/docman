/*
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import request from "supertest";
import app from "../server.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import bcrypt from "bcrypt";

const testUser = {
    email: "notifuser@test.com",
    firstname: "Notif",
    lastname: "User",
    username: "notifuser",
    password: "Password123!",
    role: "viewer"
};

const testAdmin = {
    email: "notifadmin@test.com",
    firstname: "Notif",
    lastname: "Admin",
    username: "notifadmin",
    password: "Password123!",
    role: "admin"
};

describe("Notifications API", () => {
    let userToken, adminToken, userId, notificationId;

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
        // Clean up test users and notifications
        await User.deleteOne({ email: testUser.email });
        await User.deleteOne({ email: testAdmin.email });
        await Notification.deleteMany({ recipient: userId });
        await mongoose.connection.close();
    });

    describe("POST /api/auth/login", () => {
        test("should login notification user", async () => {
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

    describe("GET /api/notifications", () => {
        test("should get user's notifications", async () => {
            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("POST /api/notifications", () => {
        test("should create a new notification", async () => {
            const res = await request(app)
                .post("/api/notifications")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    recipient: userId,
                    type: "test",
                    message: "Test notification"
                })
                .expect(201);

            expect(res.body.message).toBe("Notification created successfully");
            notificationId = res.body.notification._id;
        });

        test("should fail to create notification without required fields", async () => {
            const res = await request(app)
                .post("/api/notifications")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    message: "Test notification"
                })
                .expect(400);

            expect(res.body.message).toBe("Recipient and type are required.");
        });
    });

    describe("PUT /api/notifications/:id/read", () => {
        test("should mark notification as read", async () => {
            const res = await request(app)
                .put(`/api/notifications/${notificationId}/read`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.message).toBe("Notification marked as read");
            expect(res.body.notification.read).toBe(true);
        });

        test("should fail to mark notification as read with invalid ID", async () => {
            const res = await request(app)
                .put("/api/notifications/invalid-id/read")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(404);

            expect(res.body.message).toBe("Notification not found.");
        });
    });

    describe("DELETE /api/notifications/:id", () => {
        test("should delete notification", async () => {
            // Create a notification to delete
            const createRes = await request(app)
                .post("/api/notifications")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    recipient: userId,
                    type: "test",
                    message: "Test notification to delete"
                })
                .expect(201);

            const deleteNotificationId = createRes.body.notification._id;

            const res = await request(app)
                .delete(`/api/notifications/${deleteNotificationId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.message).toBe("Notification deleted successfully");
        });
    });
});