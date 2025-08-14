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

/**
 * Test user data for document tests (editor role)
 * @type {Object}
 */
const testUser = {
    email: "docuser@test.com",
    firstname: "Doc",
    lastname: "User",
    username: "docuser",
    password: "Password123!",
    role: "editor"
};

/**
 * Test admin user data for document tests (admin role)
 * @type {Object}
 */
const testAdmin = {
    email: "docadmin@test.com",
    firstname: "Doc",
    lastname: "Admin",
    username: "docadmin",
    password: "Password123!",
    role: "admin"
};

/**
 * Test category data for document tests
 * @type {Object}
 */
const testCategory = {
    name: "Test Category"
};

/**
 * Documents API test suite
 * Tests document CRUD operations, permissions, and file management
 */
describe("Documents API", () => {
    let userToken, adminToken, userId, docId;

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

        // Create admin user
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
        test("should login document user", async () => {
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

    describe("POST /api/docs", () => {
        test("should create a new document", async () => {
            const res = await request(app)
                .post("/api/docs")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    title: "Test Document",
                    description: "Test document description",
                    reviewDate: new Date(),
                    author: userId,
                    category: testCategory._id,
                    stakeholders: [],
                    owners: [userId]
                })
                .expect(201);

            expect(res.body.message).toBe("Document created successfully");
            expect(res.body.doc.title).toBe("Test Document");
            docId = res.body.doc._id;
        });

        test("should fail to create document without required fields", async () => {
            const res = await request(app)
                .post("/api/docs")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    title: "Test Document"
                })
                .expect(400);

            expect(res.body.message).toContain("required");
        });
    });

    describe("GET /api/docs", () => {
        test("should get all documents", async () => {
            const res = await request(app)
                .get("/api/docs")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });

        test("should get documents with search filter", async () => {
            const res = await request(app)
                .get("/api/docs?search=Test")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("GET /api/docs/:id", () => {
        test("should get document by ID", async () => {
            const res = await request(app)
                .get(`/api/docs/${docId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body._id).toBe(docId);
        });

        test("should fail to get document with invalid ID", async () => {
            const res = await request(app)
                .get("/api/docs/invalid-id")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(404);

            expect(res.body.message).toBe("Document not found.");
        });
    });

    describe("PUT /api/docs/:id", () => {
        test("should update document", async () => {
            const res = await request(app)
                .put(`/api/docs/${docId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    title: "Updated Test Document"
                })
                .expect(200);

            expect(res.body.message).toBe("Document updated successfully");
            expect(res.body.doc.title).toBe("Updated Test Document");
        });

        test("should fail to update document with invalid data", async () => {
            const res = await request(app)
                .put(`/api/docs/${docId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    title: ""
                })
                .expect(400);

            expect(res.body.message).toBe("No fields were changed.");
        });
    });

    describe("PUT /api/docs/:id/review", () => {
        test("should mark document as reviewed", async () => {
            const res = await request(app)
                .put(`/api/docs/${docId}/review`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    reviewCompleted: true
                })
                .expect(200);

            expect(res.body.message).toBe("Document marked as reviewed");
            expect(res.body.doc.reviewCompleted).toBe(true);
        });

        test("should fail to mark document with invalid data", async () => {
            const res = await request(app)
                .put(`/api/docs/${docId}/review`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    reviewCompleted: "invalid"
                })
                .expect(400);

            expect(res.body.message).toBe("reviewCompleted must be a boolean value");
        });
    });

    describe("DELETE /api/docs/:id", () => {
        test("should delete document as admin", async () => {
            const res = await request(app)
                .delete(`/api/docs/${docId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body.message).toBe("Document deleted successfully");
        });

        test("should fail to delete document as editor", async () => {
            // Create a new document to test deletion
            const createRes = await request(app)
                .post("/api/docs")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    title: "Test Document 2",
                    description: "Test document description 2",
                    reviewDate: new Date(),
                    author: userId,
                    category: testCategory._id,
                    stakeholders: [],
                    owners: [userId]
                })
                .expect(201);

            const newDocId = createRes.body.doc._id;

            const res = await request(app)
                .delete(`/api/docs/${newDocId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);

            expect(res.body.message).toBe("Access denied.");
        });
    });
});