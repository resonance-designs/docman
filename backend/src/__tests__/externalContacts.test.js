/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import request from "supertest";
import app from "../server.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import ExternalContact from "../models/ExternalContact.js";
import ExternalContactType from "../models/ExternalContactType.js";
import bcrypt from "bcrypt";

const testUser = {
    email: "extuser@test.com",
    firstname: "Ext",
    lastname: "User",
    username: "extuser",
    password: "Password123!",
    role: "editor"
};

const testAdmin = {
    email: "extadmin@test.com",
    firstname: "Ext",
    lastname: "Admin",
    username: "extadmin",
    password: "Password123!",
    role: "admin"
};

const testContactType = {
    name: "Vendor",
    description: "Vendor contact type"
};

describe("External Contacts API", () => {
    let userToken, adminToken, userId, contactTypeId, contactId;

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

        // Create a contact type
        const contactType = await ExternalContactType.create(testContactType);
        contactTypeId = contactType._id;
    });

    afterAll(async () => {
        // Clean up test users, contacts, and contact types
        await User.deleteOne({ email: testUser.email });
        await User.deleteOne({ email: testAdmin.email });
        await ExternalContact.deleteMany({ name: /Test Contact/ });
        await ExternalContactType.deleteMany({ name: testContactType.name });
        await mongoose.connection.close();
    });

    describe("POST /api/auth/login", () => {
        test("should login external contacts user", async () => {
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

    describe("POST /api/external-contacts", () => {
        test("should create a new external contact", async () => {
            const res = await request(app)
                .post("/api/external-contacts")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    name: "Test Contact",
                    email: "test@contact.com",
                    phone: "123-456-7890",
                    type: contactTypeId
                })
                .expect(201);

            expect(res.body.name).toBe("Test Contact");
            contactId = res.body._id;
        });

        test("should fail to create contact without required fields", async () => {
            const res = await request(app)
                .post("/api/external-contacts")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    name: "Test Contact"
                })
                .expect(400);

            expect(res.body.message).toBe("Email and type are required.");
        });
    });

    describe("GET /api/external-contacts", () => {
        test("should get all external contacts", async () => {
            const res = await request(app)
                .get("/api/external-contacts")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("GET /api/external-contacts/:id", () => {
        test("should get external contact by ID", async () => {
            const res = await request(app)
                .get(`/api/external-contacts/${contactId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body._id).toBe(contactId.toString());
        });

        test("should fail to get contact with invalid ID", async () => {
            const res = await request(app)
                .get("/api/external-contacts/invalid-id")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(404);

            expect(res.body.message).toBe("External contact not found.");
        });
    });

    describe("PUT /api/external-contacts/:id", () => {
        test("should update external contact", async () => {
            const res = await request(app)
                .put(`/api/external-contacts/${contactId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    name: "Updated Test Contact",
                    email: "updated@test.com"
                })
                .expect(200);

            expect(res.body.message).toBe("External contact updated successfully");
            expect(res.body.contact.name).toBe("Updated Test Contact");
        });
    });

    describe("DELETE /api/external-contacts/:id", () => {
        test("should delete external contact", async () => {
            // Create a contact to delete
            const createRes = await request(app)
                .post("/api/external-contacts")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    name: "Delete Test Contact",
                    email: "delete@test.com",
                    phone: "123-456-7890",
                    type: contactTypeId
                })
                .expect(201);

            const deleteContactId = createRes.body._id;

            const res = await request(app)
                .delete(`/api/external-contacts/${deleteContactId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.message).toBe("External contact deleted successfully");
        });
    });

    describe("GET /api/external-contacts/types", () => {
        test("should get all contact types", async () => {
            const res = await request(app)
                .get("/api/external-contacts/types")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("POST /api/external-contacts/types", () => {
        test("should create a new contact type as admin", async () => {
            const res = await request(app)
                .post("/api/external-contacts/types")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    name: "Client",
                    description: "Client contact type"
                })
                .expect(201);

            expect(res.body.name).toBe("Client");
        });

        test("should fail to create contact type as regular user", async () => {
            const res = await request(app)
                .post("/api/external-contacts/types")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    name: "Unauthorized Type"
                })
                .expect(403);

            expect(res.body.message).toBe("Access denied.");
        });
    });
});