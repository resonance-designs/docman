/*
 * @name identityService
 * @file /docman/backend/src/services/identityService.js
 * @service identityService
 * @description Transitional identity resolution service for local JWT auth today and shared suite identity providers later
 * @author Richard Bakos
 * @version 2.2.7
 * @license UNLICENSED
 */
import jwt from "jsonwebtoken";
import { createPublicKey, randomBytes } from "node:crypto";
import User from "../models/User.js";
import BlacklistedToken from "../models/BlacklistedToken.js";
import { TOKEN_KEY } from "../lib/jwtSecret.js";
import { sanitizeEmail, validateEmail, validateUsername } from "../lib/validation.js";

const USER_SELECT_FIELDS = "-password -refreshTokenHash -resetPasswordToken -resetPasswordExpires";
const AUTHENTIK_ISSUER = process.env.AUTHENTIK_ISSUER || process.env.AUTHENTIK_BASE_URL || "";
const AUTHENTIK_AUDIENCE = process.env.AUTHENTIK_AUDIENCE || process.env.AUTHENTIK_CLIENT_ID || "";
const AUTHENTIK_JWT_PUBLIC_KEY = normalizePem(process.env.AUTHENTIK_JWT_PUBLIC_KEY || "");
const AUTHENTIK_JWKS_URL = resolveAuthentikJwksUrl();
const AUTHENTIK_JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
const JIT_DEFAULT_ROLE = "viewer";

let authentikJwksCache = {
    fetchedAt: 0,
    keysByKid: new Map(),
};

function createAuthError(message, statusCode = 401) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function normalizePem(value) {
    return value ? value.replace(/\\n/g, "\n").trim() : "";
}

function normalizeIssuer(value) {
    if (!value) {
        return "";
    }

    return value.endsWith("/") ? value : `${value}/`;
}

function resolveAuthentikJwksUrl() {
    const explicitJwksUrl = process.env.AUTHENTIK_JWKS_URL || "";
    if (explicitJwksUrl) {
        return explicitJwksUrl.trim();
    }

    const issuer = normalizeIssuer(AUTHENTIK_ISSUER);
    if (!issuer) {
        return "";
    }

    return `${issuer}jwks/`;
}

function isAuthentikConfigured() {
    return Boolean(AUTHENTIK_ISSUER && AUTHENTIK_AUDIENCE && (AUTHENTIK_JWT_PUBLIC_KEY || AUTHENTIK_JWKS_URL));
}

function isAuthentikToken(decoded) {
    if (!decoded || typeof decoded !== "object") {
        return false;
    }

    return Boolean(AUTHENTIK_ISSUER && decoded.iss === AUTHENTIK_ISSUER);
}

function normalizeClaimString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function isVerifiedEmail(decoded) {
    return decoded?.email_verified === true || decoded?.email_verified === "true";
}

function getNormalizedVerifiedEmail(decoded) {
    if (!isVerifiedEmail(decoded)) {
        return "";
    }

    const candidateEmail = normalizeClaimString(decoded?.email);
    const validation = validateEmail(candidateEmail);
    return validation.isValid ? validation.sanitized : "";
}

function buildJitPassword() {
    return `Ak!${randomBytes(24).toString("hex")}Z9`;
}

function buildJitNames(decoded, normalizedEmail) {
    const fullName = normalizeClaimString(decoded?.name);
    const givenName = normalizeClaimString(decoded?.given_name);
    const familyName = normalizeClaimString(decoded?.family_name);
    const preferredUsername = normalizeClaimString(decoded?.preferred_username);
    const emailLocalPart = normalizedEmail ? normalizedEmail.split("@")[0] : "";

    let firstname = givenName;
    let lastname = familyName;

    if (!firstname && fullName) {
        const [firstToken, ...rest] = fullName.split(/\s+/).filter(Boolean);
        firstname = firstToken || "";
        lastname = rest.join(" ");
    }

    if (!firstname) {
        firstname = preferredUsername || emailLocalPart || "Authentik";
    }

    if (!lastname) {
        lastname = fullName && firstname !== fullName ? fullName.replace(firstname, "").trim() : "";
    }

    if (!lastname) {
        lastname = "User";
    }

    return {
        firstname: firstname.slice(0, 50),
        lastname: lastname.slice(0, 50),
    };
}

function slugifyUsernameCandidate(value) {
    const trimmed = normalizeClaimString(value);
    if (!trimmed) {
        return "";
    }

    return trimmed
        .normalize("NFKD")
        .replace(/[^\w.\-@ ]+/g, "")
        .replace(/@/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/[._-]{2,}/g, "-")
        .replace(/^[._-]+|[._-]+$/g, "")
        .slice(0, 30);
}

function buildUsernameCandidates(decoded, normalizedEmail, authentikSub) {
    const candidates = [];
    const pushCandidate = (value) => {
        const candidate = slugifyUsernameCandidate(value);
        if (candidate && !candidates.includes(candidate)) {
            candidates.push(candidate);
        }
    };

    pushCandidate(decoded?.preferred_username);
    pushCandidate(decoded?.nickname);

    if (normalizedEmail) {
        pushCandidate(normalizedEmail.split("@")[0]);
    }

    const givenName = normalizeClaimString(decoded?.given_name);
    const familyName = normalizeClaimString(decoded?.family_name);
    if (givenName && familyName) {
        pushCandidate(`${givenName}.${familyName}`);
        pushCandidate(`${givenName}-${familyName}`);
    }

    pushCandidate(decoded?.name);
    pushCandidate(`authentik-${normalizeClaimString(authentikSub).slice(0, 12)}`);

    return candidates;
}

async function findAvailableUsername(decoded, normalizedEmail, authentikSub) {
    const candidates = buildUsernameCandidates(decoded, normalizedEmail, authentikSub);

    for (const candidate of candidates) {
        if (validateUsername(candidate)) {
            continue;
        }

        const existingUser = await User.findOne({ username: candidate }).select("_id").lean();
        if (!existingUser) {
            return candidate;
        }

        for (let counter = 2; counter <= 1000; counter += 1) {
            const suffix = `${counter}`;
            const base = candidate.slice(0, Math.max(1, 30 - suffix.length));
            const suffixedCandidate = `${base}${suffix}`;
            if (validateUsername(suffixedCandidate)) {
                continue;
            }

            const taken = await User.findOne({ username: suffixedCandidate }).select("_id").lean();
            if (!taken) {
                return suffixedCandidate;
            }
        }
    }

    throw createAuthError("Unable to generate a unique RDocMan username for the Authentik identity", 500);
}

async function hydrateRequestUserById(userId) {
    const user = await User.findById(userId).select(USER_SELECT_FIELDS).lean();
    return normalizeRequestUser(user);
}

async function autoLinkUserByVerifiedEmail(decoded) {
    const normalizedEmail = getNormalizedVerifiedEmail(decoded);
    if (!normalizedEmail) {
        return null;
    }

    const user = await User.findOne({ email: sanitizeEmail(normalizedEmail) });
    if (!user) {
        return null;
    }

    if (user.authentikSub && user.authentikSub !== decoded.sub) {
        throw createAuthError("The matching RDocMan email is already linked to another Authentik identity", 409);
    }

    user.identityProvider = "authentik";
    user.authentikSub = decoded.sub;
    await user.save();

    return {
        resolution: "auto-linked-by-verified-email",
        user: await hydrateRequestUserById(user._id),
    };
}

async function provisionUserFromAuthentikClaims(decoded) {
    const normalizedEmail = getNormalizedVerifiedEmail(decoded);
    if (!normalizedEmail) {
        return null;
    }

    const existingUser = await User.findOne({ email: sanitizeEmail(normalizedEmail) }).select("_id authentikSub").lean();
    if (existingUser) {
        return null;
    }

    const username = await findAvailableUsername(decoded, normalizedEmail, decoded.sub);
    const { firstname, lastname } = buildJitNames(decoded, normalizedEmail);

    const createdUser = await User.create({
        email: sanitizeEmail(normalizedEmail),
        firstname,
        lastname,
        username,
        password: buildJitPassword(),
        role: JIT_DEFAULT_ROLE,
        identityProvider: "authentik",
        authentikSub: decoded.sub,
    });

    return {
        resolution: "jit-provisioned",
        user: await hydrateRequestUserById(createdUser._id),
    };
}

async function resolveOrCreateAuthentikUser(decoded) {
    const existingLinkedUser = await findUserByAuthentikSub(decoded.sub);
    if (existingLinkedUser) {
        return {
            resolution: "linked-sub",
            user: existingLinkedUser,
        };
    }

    const autoLinkedUser = await autoLinkUserByVerifiedEmail(decoded);
    if (autoLinkedUser) {
        return autoLinkedUser;
    }

    const jitProvisionedUser = await provisionUserFromAuthentikClaims(decoded);
    if (jitProvisionedUser) {
        return jitProvisionedUser;
    }

    throw createAuthError("No linked or provisionable RDocMan user for Authentik identity");
}

/**
 * Extract a Bearer token from the request Authorization header.
 * @param {Object} req - Express request object
 * @returns {string|null} Extracted Bearer token or null
 */
export function extractBearerToken(req) {
    const authHeader = req.headers?.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
        return null;
    }

    return authHeader.split(" ")[1];
}

/**
 * Normalize a user document into the request identity shape expected by the rest of the app.
 * @param {Object} user - User document or lean object
 * @returns {Object} Normalized request user object
 */
export function normalizeRequestUser(user) {
    if (!user) {
        return null;
    }

    const normalizedUser = { ...user };
    normalizedUser.id = normalizedUser._id.toString();

    return normalizedUser;
}

/**
 * Resolve an application user by Authentik subject.
 * @param {string} authentikSub - Authentik subject claim
 * @returns {Promise<Object|null>} Normalized request user or null
 */
export async function findUserByAuthentikSub(authentikSub) {
    if (!authentikSub) {
        return null;
    }

    const user = await User.findOne({ authentikSub }).select(USER_SELECT_FIELDS).lean();
    return normalizeRequestUser(user);
}

/**
 * Resolve the current local DocMan JWT identity.
 * This is the current authentication path and remains in place while the app is prepared for Authentik.
 * @param {string} token - Bearer token supplied by the client
 * @returns {Promise<Object>} Normalized identity context
 */
export async function resolveLocalTokenIdentity(token) {
    if (!token) {
        throw createAuthError("No token provided");
    }

    const blacklistedToken = await BlacklistedToken.findOne({ token }).lean();
    if (blacklistedToken) {
        throw createAuthError("Token has been invalidated");
    }

    const decoded = jwt.verify(token, TOKEN_KEY);
    if (!decoded?.id) {
        throw createAuthError("Invalid token");
    }

    const user = await User.findById(decoded.id).select(USER_SELECT_FIELDS).lean();
    if (!user) {
        throw createAuthError("User not found");
    }

    return {
        authType: "local-jwt",
        provider: user.identityProvider || "local",
        tokenClaims: decoded,
        user: normalizeRequestUser(user),
    };
}

/**
 * Resolve a request authenticated through Authentik-issued JWTs.
 * @param {string} token - Bearer token supplied by the client
 * @returns {Promise<Object>} Normalized identity context
 */
export async function resolveAuthentikTokenIdentity(token) {
    if (!isAuthentikConfigured()) {
        throw createAuthError("Authentik identity is not configured", 500);
    }

    const verificationKey = await resolveAuthentikVerificationKey(token);
    const decoded = jwt.verify(token, verificationKey, {
        algorithms: ["RS256"],
        issuer: AUTHENTIK_ISSUER,
        audience: AUTHENTIK_AUDIENCE,
    });

    if (!decoded?.sub) {
        throw createAuthError("Invalid Authentik token");
    }

    const resolvedIdentity = await resolveOrCreateAuthentikUser(decoded);

    return {
        authType: "authentik-jwt",
        provider: "authentik",
        resolution: resolvedIdentity.resolution,
        tokenClaims: decoded,
        user: resolvedIdentity.user,
    };
}

async function resolveAuthentikVerificationKey(token) {
    if (AUTHENTIK_JWT_PUBLIC_KEY) {
        return AUTHENTIK_JWT_PUBLIC_KEY;
    }

    if (!AUTHENTIK_JWKS_URL) {
        throw createAuthError("Authentik JWKS URL is not configured", 500);
    }

    const decodedToken = jwt.decode(token, { complete: true });
    const kid = decodedToken?.header?.kid;
    if (!kid) {
        throw createAuthError("Authentik token is missing a key id");
    }

    const jwk = await getAuthentikJwk(kid);
    if (!jwk) {
        throw createAuthError(`Authentik signing key ${kid} was not found`, 401);
    }

    return createPublicKey({ key: jwk, format: "jwk" });
}

async function getAuthentikJwk(kid) {
    const now = Date.now();
    if (authentikJwksCache.keysByKid.size && (now - authentikJwksCache.fetchedAt) < AUTHENTIK_JWKS_CACHE_TTL_MS) {
        return authentikJwksCache.keysByKid.get(kid) || null;
    }

    const response = await fetch(AUTHENTIK_JWKS_URL);
    if (!response.ok) {
        throw createAuthError(`Unable to fetch Authentik JWKS (${response.status})`, 500);
    }

    const payload = await response.json();
    const keys = Array.isArray(payload?.keys) ? payload.keys : [];
    const keysByKid = new Map(keys.filter((key) => key?.kid).map((key) => [key.kid, key]));

    authentikJwksCache = {
        fetchedAt: now,
        keysByKid,
    };

    return keysByKid.get(kid) || null;
}

/**
 * Resolve request identity.
 * Today this supports DocMan-local JWT access tokens.
 * Later this is the seam where Authentik token validation and external subject mapping should be added.
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Identity context with user and token claims
 */
export async function resolveRequestIdentity(req) {
    const token = extractBearerToken(req);
    if (!token) {
        throw createAuthError("No token provided");
    }

    const decoded = jwt.decode(token);
    if (isAuthentikToken(decoded)) {
        return resolveAuthentikTokenIdentity(token);
    }

    return resolveLocalTokenIdentity(token);
}
