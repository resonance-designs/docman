/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import request from "supertest";
import app from "../server.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import Category from "../models/Category.js";
import bcrypt from "bcrypt";

const testUser = {
    email: "catuser@test.com",
    firstname: "Cat",
    lastname: "User",
    username: "catuser",
    password: "Password123!",
    role: "editor"
};

const testAdmin = {
    email: "catadmin@test.com",
    firstname: "Cat",
    lastname: "Admin",
    username: "catadmin",
    password: "Password123!",
    role: "admin"
};

const testCategory = {
    name: "Test Category"
};

describe("Categories API", () => {
    let userToken, adminToken, categoryId;

    beforeAll(async () => {
        // Wait for database connection
        await new Promise((res) => setTimeout(res, 1000));
        
        // Create test users
        const hashedPassword = await bcrypt.hash(testUser.password, 12);
        await User.create({
            ...testUser,
            password: hashedPassword
        });

        const adminUser = await User.create({
            ...testAdmin,
            password: hashedPassword
        });
    });

    afterAll(async () => {
        // Clean up test users and categories
        await User.deleteOne({ email: testUser.email });
        await User.deleteOne({ email: testAdmin.email });
        await Category.deleteMany({ name: testCategory.name });
        await mongoose.connection.close();
    });

    describe("POST /api/auth/login", () => {
        test("should login category user", async () => {
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

    describe("POST /api/categories", () => {
        test("should create a new category as admin", async () => {
            const res = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${adminToken}`)
                .send(testCategory)
                .expect(201);

            expect(res.body.name).toBe(testCategory.name);
            categoryId = res.body._id;
        });

        test("should fail to create category as regular user", async () => {
            const res = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${userToken}`)
                .send(testCategory)
                .expect(403);

            expect(res.body.message).toBe("Access denied.");
        });

        test("should fail to create category without name", async () => {
            const res = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({})
                .expect(400);

            expect(res.body.message).toBe("Category name is required.");
        });
    });

    describe("GET /api/categories", () => {
        test("should get all categories as admin", async () => {
            const res = await request(app)
                .get("/api/categories")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        test("should get all categories as regular user", async () => {
            const res = await request(app)
                .get("/api/categories")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("DELETE /api/categories/:id", () => {
        test("should delete category as admin", async () => {
            const res = await request(app)
                .delete(`/api/categories/${categoryId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body.message).toBe("Category deleted successfully");
        });

        test("should fail to delete category as regular user", async () => {
            // Create a category to test deletion
            const createRes = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ name: "Temp Category" })
                .expect(201);

            const tempCategoryId = createRes.body._id;

            const res = await request(app)
                .delete(`/api/categories/${tempCategoryId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);

            expect(res.body.message).toBe("Access denied.");
        });
    });
});