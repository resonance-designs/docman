/*
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import request from "supertest";
import app from "../server.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import Team from "../models/Team.js";
import bcrypt from "bcrypt";

const testUser = {
    email: "teamuser@test.com",
    firstname: "Team",
    lastname: "User",
    username: "teamuser",
    password: "Password123!",
    role: "editor"
};

const testAdmin = {
    email: "teamadmin@test.com",
    firstname: "Team",
    lastname: "Admin",
    username: "teamadmin",
    password: "Password123!",
    role: "admin"
};

const testTeam = {
    name: "Test Team",
    description: "Test team description"
};

describe("Teams API", () => {
    let userToken, adminToken, userId, teamId;

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
        // Clean up test users and teams
        await User.deleteOne({ email: testUser.email });
        await User.deleteOne({ email: testAdmin.email });
        await Team.deleteMany({ name: testTeam.name });
        await mongoose.connection.close();
    });

    describe("POST /api/auth/login", () => {
        test("should login team user", async () => {
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

    describe("POST /api/teams", () => {
        test("should create a new team as editor", async () => {
            const res = await request(app)
                .post("/api/teams")
                .set("Authorization", `Bearer ${userToken}`)
                .send(testTeam)
                .expect(201);

            expect(res.body.name).toBe(testTeam.name);
            teamId = res.body._id;
        });

        test("should fail to create team without name", async () => {
            const res = await request(app)
                .post("/api/teams")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ description: "No name" })
                .expect(400);

            expect(res.body.message).toBe("Team name is required.");
        });
    });

    describe("GET /api/teams", () => {
        test("should get all teams as admin", async () => {
            const res = await request(app)
                .get("/api/teams")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });

        test("should fail to get all teams as regular user", async () => {
            const res = await request(app)
                .get("/api/teams")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);

            expect(res.body.message).toBe("Access denied.");
        });
    });

    describe("GET /api/teams/my-teams", () => {
        test("should get user's teams", async () => {
            const res = await request(app)
                .get("/api/teams/my-teams")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("GET /api/teams/:id", () => {
        test("should get team by ID", async () => {
            const res = await request(app)
                .get(`/api/teams/${teamId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body._id).toBe(teamId.toString());
        });

        test("should fail to get team with invalid ID", async () => {
            const res = await request(app)
                .get("/api/teams/invalid-id")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(404);

            expect(res.body.message).toBe("Team not found.");
        });
    });

    describe("PUT /api/teams/:id", () => {
        test("should update team", async () => {
            const res = await request(app)
                .put(`/api/teams/${teamId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    name: "Updated Test Team",
                    description: "Updated description"
                })
                .expect(200);

            expect(res.body.message).toBe("Team updated successfully");
            expect(res.body.team.name).toBe("Updated Test Team");
        });

        test("should fail to update team with invalid data", async () => {
            const res = await request(app)
                .put(`/api/teams/${teamId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({})
                .expect(400);

            expect(res.body.message).toBe("Team name is required.");
        });
    });

    describe("POST /api/teams/:id/invite", () => {
        test("should invite user to team", async () => {
            const res = await request(app)
                .post(`/api/teams/${teamId}/invite`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    email: testAdmin.email
                })
                .expect(200);

            expect(res.body.message).toBe("Invitation sent successfully");
        });
    });

    describe("DELETE /api/teams/:id", () => {
        test("should delete team", async () => {
            // Create a team to delete
            const createRes = await request(app)
                .post("/api/teams")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    name: "Delete Test Team",
                    description: "Team to delete"
                })
                .expect(201);

            const deleteTeamId = createRes.body._id;

            const res = await request(app)
                .delete(`/api/teams/${deleteTeamId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.message).toBe("Team deleted successfully");
        });
    });
});