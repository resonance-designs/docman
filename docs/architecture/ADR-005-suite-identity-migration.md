# ADR-005: Suite Identity Migration with Authentik

**Status:** Proposed  
**Date:** 2026-04-26

## Context

RDocMan was originally built as a standalone application and currently owns its own authentication, session, and role model. That worked when the application was isolated, but it becomes a problem as RDocMan is folded into the broader `RDSysCMD` suite alongside future applications.

The suite direction now requires:

- one shared login system across apps
- one shared session and token authority
- app-specific authorization to remain local where domain logic requires it

At the suite level, Authentik has been selected as the shared identity provider. RDocMan therefore needs a migration path from app-local identity ownership to shared suite identity without breaking document, team, project, and review permissions.

## Current Authentication Model

### Identity and Credentials

RDocMan currently stores user identity and credentials in its own `User` model:

- `backend/src/models/User.js`

The `User` model currently owns:

- name and profile fields
- email
- username
- hashed password
- top-level application role
- password reset token and expiry
- hashed refresh token

This means the current `users` collection is both:

- the identity store
- the app membership/profile store

Those responsibilities will eventually need to be separated.

### Login Flow

Current login routes live in:

- `backend/src/routes/authRoutes.js`
- `backend/src/controllers/authController.js`

Current flow:

1. User submits email or username plus password to `/api/auth/login`.
2. Backend looks up the local `User` record.
3. Backend checks the password with bcrypt.
4. Backend issues a JWT access token with `id` and `role`.
5. Backend generates an opaque refresh token, hashes it, and stores the hash on the `User` record.
6. Backend sets the refresh token in an `httpOnly` cookie.
7. Frontend stores the access token and user payload in local storage.

### Access Token Model

Access token behavior currently lives in:

- `backend/src/lib/secretToken.js`
- `backend/src/lib/jwtSecret.js`

Current characteristics:

- signed with a local shared secret
- contains `id` and `role`
- valid for 5 days
- verified directly by the backend

The current access token is therefore both:

- the app authentication artifact
- the carrier of top-level authorization context

### Refresh Token Model

Refresh tokens are currently:

- opaque random strings
- stored only as a bcrypt hash on the `User` document
- sent to the browser in an `httpOnly` cookie
- rotated on login and refresh

Refresh flow lives in:

- `backend/src/controllers/authController.js`

The current lookup strategy scans users with `refreshTokenHash` and compares hashes until a match is found. That is acceptable for a small standalone app but is not the right long-term shape for suite-wide identity.

### Logout and Revocation

Logout currently does two things:

1. clears the stored refresh token hash on the matching user
2. blacklists the current access token if one is supplied

Blacklist behavior lives in:

- `backend/src/models/BlacklistedToken.js`
- `backend/src/lib/secretToken.js`

The `blacklistedtokens` collection is therefore an app-local access-token revocation mechanism, not a suite-wide session authority.

### Route Protection

Authentication and authorization are split into two layers today:

- authentication:
  - `backend/src/lib/secretToken.js`
  - `verifyAccessToken`
- authorization:
  - `backend/src/middleware/requireRole.js`

This split is actually a good migration seam.

Current route pattern is generally:

```text
verifyAccessToken -> requireRole(...) -> controller
```

The access token middleware:

- reads the Bearer token
- checks the blacklist
- verifies the JWT
- loads the current user from MongoDB
- attaches the current user to `req.user`

The role middleware then enforces the top-level app role hierarchy:

- `viewer`
- `editor`
- `admin`
- `superadmin`

### Frontend Session Behavior

The current Vue/Vuetify frontend auth behavior lives in:

- `frontend-vue/src/composables/useAuth.js`
- `frontend-vue/src/services/api.js`
- `frontend-vue/src/router/index.js`

The current frontend:

- logs in through `/api/auth/login`
- stores the access token in local storage
- stores the current user payload in local storage
- attaches the Bearer token on API requests
- clears local state on `401`

The refresh cookie exists on the backend, but the frontend does not yet act like a full centralized-session client. It behaves more like a classic app-local JWT frontend with a server-assisted refresh path.

The legacy React frontend follows the same overall pattern: local storage holds the access token and frontend role checks often decode the token directly.

## Current Authorization Model

RDocMan authorization is not only top-level role-based. It also depends on domain objects and app-local relationships.

Examples:

- document access depends on ownership, stakeholder state, and review relationships
- team access depends on ownership and membership
- project access depends on ownership, collaboration, and team/project linkage
- user profile access depends on whether the requesting user is acting on themselves

This means the suite migration must preserve a crucial distinction:

- authentication can move to Authentik
- domain authorization must remain in RDocMan

## Migration Seams

### Strong Existing Seams

The current codebase already has some useful boundaries:

1. Authentication and role-checking are separate middleware layers.
2. Controllers generally consume `req.user` instead of re-verifying tokens directly.
3. Domain authorization often happens after request identity is resolved.
4. The frontend already has a centralized auth composable and API client in the Vue app.

These seams mean RDocMan does not need a destructive rewrite to adopt shared identity.

### Tight Coupling That Must Be Reduced

The following concerns are still tightly coupled and should be separated:

1. `User` is both credential owner and app profile/member record.
2. Access tokens encode the app role directly from the local user record.
3. Refresh token ownership is attached directly to the `User` document.
4. Logout assumes RDocMan is the source of truth for session revocation.
5. Some frontend logic assumes the access token itself is the primary source of role truth.

## Decision

RDocMan should migrate to a model where:

- Authentik owns authentication
- Authentik owns session and refresh-token authority
- RDocMan trusts Authentik-issued identity
- RDocMan keeps app-specific authorization and membership logic

RDocMan should not remain the long-term owner of:

- primary credentials
- suite session lifecycle
- refresh-token lifecycle
- suite-level user identity

## Consequences

### Positive

- One suite login across RDSysCMD, RDocMan, and future apps.
- Cleaner desktop SSO model.
- Better separation between identity and domain authorization.
- Future apps can adopt the same identity model from the start.

### Tradeoffs

- RDocMan backend will need an identity abstraction layer.
- Existing user records need a migration/linking strategy.
- Frontend login behavior will need to move away from app-local assumptions.
- Some tests will need to be updated to reflect external identity flows.

## Initial Migration Plan

### Phase 1

Document and stabilize the current boundaries.

Immediate objective:

- stop widening the local-auth surface area

### Phase 2

Add external identity mapping to the user model.

Recommended fields:

- `authentikSub`
- optional identity metadata such as provider/source fields if needed later

At that point, the `users` collection can begin shifting from:

- credential store

to:

- RDocMan membership and profile-extension store

### Phase 3

Introduce an identity context layer in the backend.

Instead of route protection being conceptually:

```text
verify local JWT -> load local user -> authorize
```

target:

```text
verify Authentik identity -> resolve local app user -> authorize
```

### Phase 4

Teach the backend to trust Authentik-issued tokens.

Likely replacement target for current `verifyAccessToken` behavior:

- validate Authentik issuer
- validate audience
- validate signature
- read `sub`
- resolve linked local user
- populate `req.user`

Transitional implementation note:

- existing local users should be linked explicitly to Authentik identities through `authentikSub`
- automatic email-based identity linking should not be relied on silently at request time
- the first migration mechanism should be an explicit mapping workflow that can be dry-run and audited

### Phase 5

Reduce dependence on local refresh and blacklist behavior.

Long term:

- `refreshTokenHash` should no longer be the primary refresh authority
- `blacklistedtokens` should no longer be the primary session revocation mechanism

Those concerns should move to the identity provider layer.

## Immediate Next Backend Changes

1. Add a lightweight identity-resolution abstraction around the current `verifyAccessToken` middleware.
2. Add an external-identity field plan to `User`.
3. Audit all places that assume the JWT payload is the source of role truth.
4. Plan a transitional resolver that can support:
   - existing local login
   - future Authentik token validation
5. Keep app-specific authorization in services and controllers, not in the identity provider.
6. Add an explicit Authentik user-linking mechanism for existing users before enabling Authentik-only access paths.

## References

- `backend/src/models/User.js`
- `backend/src/models/BlacklistedToken.js`
- `backend/src/controllers/authController.js`
- `backend/src/lib/secretToken.js`
- `backend/src/middleware/requireRole.js`
- `frontend-vue/src/composables/useAuth.js`
- `frontend-vue/src/services/api.js`
