
import request from "supertest";
import app from "../server.js";
import mongoose from "mongoose";
import User from "../models/User.js";

const testUser = {
    email: "test+ci@example.com",
    firstname: "CI",
    lastname: "Tester",
    username: "citester",
    password: "Password123!",
};

describe("Auth integration", () => {
    beforeAll(async () => {
        await new Promise((res) => setTimeout(res, 1000));
    });

    afterAll(async () => {
        await User.deleteOne({ email: testUser.email });
        await mongoose.connection.close();
    });

    test("login -> refresh -> access protected", async () => {
        await request(app).post("/api/auth/register").send(testUser);

        const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

        const accessToken = loginRes.body.token;
        expect(accessToken).toBeDefined();
        const cookies = loginRes.headers['set-cookie'];
        expect(cookies).toBeDefined();

        const protectedRes = await request(app)
        .get("/api/docs")
        .set("Authorization", `Bearer ${accessToken}`);
        expect([200,204,401]).toContain(protectedRes.status);

        const bad = await request(app)
        .get("/api/docs")
        .set("Authorization", `Bearer invalid_token`);
        expect([401,403]).toContain(bad.status);

        const agent = request.agent(app);
        if (cookies && cookies.length) {
            agent.jar.setCookie(cookies[0]);
        }
        const refreshRes = await agent.get("/api/auth/refresh").expect(200);
        const newAccess = refreshRes.body.token;
        expect(newAccess).toBeDefined();

        const after = await request(app)
        .get("/api/docs")
        .set("Authorization", `Bearer ${newAccess}`);
        expect([200,204]).toContain(after.status);
    }, 20000);
});
