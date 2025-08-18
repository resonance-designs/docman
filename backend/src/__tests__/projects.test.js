/*
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import request from "supertest";
import app from "../server.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import Project from "../models/Project.js";
import Team from "../models/Team.js";
import bcrypt from "bcrypt";

const testUser = {
    email: "projuser@test.com",
    firstname: "Proj",
    lastname: "User",
    username: "projuser",
    password: "Password123!",
    role: "editor"
};

const testAdmin = {
    email: "projadmin@test.com",
    firstname: "Proj",
    lastname: "Admin",
    username: "projadmin",
    password: "Password123!",
    role: "admin"
};

const testProject = {
    name: "Test Project",
    description: "Test project description"
};

describe("Projects API", () => {
    let userToken, adminToken, userId, teamId, projectId;

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

        // Create a test team
        const team = await Team.create({
            name: "Test Team",
            description: "Test team for projects",
            owner: userId,
            members: [userId]
        });
        teamId = team._id;
    });

    afterAll(async () => {
        // Clean up test users, teams, and projects
        await User.deleteOne({ email: testUser.email });
        await User.deleteOne({ email: testAdmin.email });
        await Team.deleteMany({ name: "Test Team" });
        await Project.deleteMany({ name: testProject.name });
        await mongoose.connection.close();
    });

    describe("POST /api/auth/login", () => {
        test("should login project user", async () => {
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

    describe("POST /api/projects", () => {
        test("should create a new project as editor", async () => {
            const res = await request(app)
                .post("/api/projects")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    ...testProject,
                    team: teamId
                })
                .expect(201);

            expect(res.body.name).toBe(testProject.name);
            projectId = res.body._id;
        });

        test("should fail to create project without name", async () => {
            const res = await request(app)
                .post("/api/projects")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    description: "No name",
                    team: teamId
                })
                .expect(400);

            expect(res.body.message).toBe("Project name is required.");
        });
    });

    describe("GET /api/projects/my-projects", () => {
        test("should get user's projects", async () => {
            const res = await request(app)
                .get("/api/projects/my-projects")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("GET /api/projects/team/:teamId", () => {
        test("should get projects for a team", async () => {
            const res = await request(app)
                .get(`/api/projects/team/${teamId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("GET /api/projects/:id", () => {
        test("should get project by ID", async () => {
            const res = await request(app)
                .get(`/api/projects/${projectId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body._id).toBe(projectId.toString());
        });

        test("should fail to get project with invalid ID", async () => {
            const res = await request(app)
                .get("/api/projects/invalid-id")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(404);

            expect(res.body.message).toBe("Project not found.");
        });
    });

    describe("PUT /api/projects/:id", () => {
        test("should update project", async () => {
            const res = await request(app)
                .put(`/api/projects/${projectId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    name: "Updated Test Project",
                    description: "Updated description"
                })
                .expect(200);

            expect(res.body.message).toBe("Project updated successfully");
            expect(res.body.project.name).toBe("Updated Test Project");
        });

        test("should fail to update project with invalid data", async () => {
            const res = await request(app)
                .put(`/api/projects/${projectId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({})
                .expect(400);

            expect(res.body.message).toBe("Project name is required.");
        });
    });

    describe("POST /api/projects/:id/collaborators", () => {
        test("should add collaborator to project", async () => {
            const res = await request(app)
                .post(`/api/projects/${projectId}/collaborators`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    userId: userId
                })
                .expect(200);

            expect(res.body.message).toBe("Collaborator added successfully");
        });
    });

    describe("DELETE /api/projects/:id", () => {
        test("should delete project", async () => {
            // Create a project to delete
            const createRes = await request(app)
                .post("/api/projects")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    name: "Delete Test Project",
                    description: "Project to delete",
                    team: teamId
                })
                .expect(201);

            const deleteProjectId = createRes.body._id;

            const res = await request(app)
                .delete(`/api/projects/${deleteProjectId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.message).toBe("Project deleted successfully");
        });
    });
});