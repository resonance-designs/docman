/*
 * @name identityService Authentik Tests
 * @file /docman/backend/src/__tests__/services/identityService.authentik.test.js
 * @description Unit tests for Authentik identity auto-linking and JIT provisioning
 * @author Richard Bakos
 * @version 2.2.7
 * @license UNLICENSED
 */
import { jest } from "@jest/globals";

process.env.AUTHENTIK_ISSUER = "https://accounts.resonancedesigns.dev/application/o/rdocman-web/";
process.env.AUTHENTIK_AUDIENCE = "test-client-id";
process.env.AUTHENTIK_JWT_PUBLIC_KEY = "test-public-key";

const mockBlacklistedToken = {
    findOne: jest.fn(),
};

const mockUser = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
};

const mockJwt = {
    verify: jest.fn(),
    decode: jest.fn(),
};

jest.unstable_mockModule("../../models/BlacklistedToken.js", () => ({
    default: mockBlacklistedToken,
}));

jest.unstable_mockModule("../../models/User.js", () => ({
    default: mockUser,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
    default: mockJwt,
}));

const { resolveAuthentikTokenIdentity } = await import("../../services/identityService.js");

function createSelectLeanResult(value) {
    return {
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(value),
        }),
    };
}

describe("identityService Authentik resolution", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("resolves an already-linked Authentik user by sub", async () => {
        const linkedUser = {
            _id: "507f1f77bcf86cd799439011",
            email: "linked@example.com",
            role: "admin",
            identityProvider: "authentik",
            authentikSub: "auth-sub-1",
        };

        mockJwt.verify.mockReturnValue({
            iss: process.env.AUTHENTIK_ISSUER,
            aud: process.env.AUTHENTIK_AUDIENCE,
            sub: "auth-sub-1",
            email: "linked@example.com",
            email_verified: true,
        });

        mockUser.findOne.mockReturnValueOnce(createSelectLeanResult(linkedUser));

        const result = await resolveAuthentikTokenIdentity("fake-authentik-token");

        expect(result.resolution).toBe("linked-sub");
        expect(result.user.email).toBe("linked@example.com");
        expect(mockUser.create).not.toHaveBeenCalled();
    });

    test("auto-links an existing local user by verified email", async () => {
        const localUserDoc = {
            _id: "507f1f77bcf86cd799439012",
            email: "existing@example.com",
            username: "existinguser",
            role: "editor",
            identityProvider: "local",
            authentikSub: "",
            save: jest.fn().mockResolvedValue(true),
        };

        const hydratedUser = {
            _id: "507f1f77bcf86cd799439012",
            email: "existing@example.com",
            username: "existinguser",
            role: "editor",
            identityProvider: "authentik",
            authentikSub: "auth-sub-2",
        };

        mockJwt.verify.mockReturnValue({
            iss: process.env.AUTHENTIK_ISSUER,
            aud: process.env.AUTHENTIK_AUDIENCE,
            sub: "auth-sub-2",
            email: "existing@example.com",
            email_verified: true,
        });

        mockUser.findOne
            .mockReturnValueOnce(createSelectLeanResult(null))
            .mockResolvedValueOnce(localUserDoc);

        mockUser.findById.mockReturnValueOnce(createSelectLeanResult(hydratedUser));

        const result = await resolveAuthentikTokenIdentity("fake-authentik-token");

        expect(result.resolution).toBe("auto-linked-by-verified-email");
        expect(localUserDoc.identityProvider).toBe("authentik");
        expect(localUserDoc.authentikSub).toBe("auth-sub-2");
        expect(localUserDoc.save).toHaveBeenCalled();
        expect(result.user.email).toBe("existing@example.com");
    });

    test("jit provisions a new viewer account when no local user exists", async () => {
        const createdUser = {
            _id: "507f1f77bcf86cd799439013",
        };

        const hydratedUser = {
            _id: "507f1f77bcf86cd799439013",
            email: "newuser@example.com",
            username: "newuser",
            role: "viewer",
            identityProvider: "authentik",
            authentikSub: "auth-sub-3",
        };

        mockJwt.verify.mockReturnValue({
            iss: process.env.AUTHENTIK_ISSUER,
            aud: process.env.AUTHENTIK_AUDIENCE,
            sub: "auth-sub-3",
            email: "newuser@example.com",
            email_verified: true,
            preferred_username: "newuser",
            given_name: "New",
            family_name: "User",
        });

        mockUser.findOne
            .mockReturnValueOnce(createSelectLeanResult(null))
            .mockResolvedValueOnce(null)
            .mockReturnValueOnce(createSelectLeanResult(null))
            .mockReturnValueOnce(createSelectLeanResult(null));

        mockUser.create.mockResolvedValue(createdUser);
        mockUser.findById.mockReturnValueOnce(createSelectLeanResult(hydratedUser));

        const result = await resolveAuthentikTokenIdentity("fake-authentik-token");

        expect(result.resolution).toBe("jit-provisioned");
        expect(mockUser.create).toHaveBeenCalledWith(expect.objectContaining({
            email: "newuser@example.com",
            username: "newuser",
            role: "viewer",
            identityProvider: "authentik",
            authentikSub: "auth-sub-3",
        }));
        expect(result.user.email).toBe("newuser@example.com");
    });
});
