# Changelog

All notable changes to this project will be documented in this file.

## [2.2.7] - 2026-04-30

### Changed

- Changed the Authentik backend identity flow to auto-link existing local users by verified email on first sign-in.
- Changed the Authentik backend identity flow to just-in-time provision new local viewer accounts for verified Authentik identities that do not already exist in MongoDB.
- Changed the Vue login experience to expose `Create Resonance Account` when an Authentik enrollment URL is configured and to de-emphasize legacy local-only access.
- Added `LOCAL_SELF_REGISTRATION_ENABLED` so production can disable the legacy local `/auth/register` path when Authentik is the canonical suite registration authority.
- Updated deployment and recovery documentation to explain the new verified-email auto-linking path, JIT provisioning behavior, and the remaining manual `authentikSub` repair workflow.

## [2.2.6] - 2026-04-29

### Changed

- Hardened `apache_production_deploy.sh` to create a persistent full backup of the existing deployment tree, Apache publish root, and backend systemd unit before replacing them.
- Changed the deployment script to prompt for Authentik frontend/backend env values and materialize `frontend-vue/.env.production` before the Vite build.
- Hardened `apache_production_update.sh` and `apache_production_update_ni.sh` to restore from persistent local backups instead of relying on a fresh git clone during rollback.
- Updated `backend/.env.sample`, `frontend-vue/.env.production.example`, and README guidance to document the real frontend Authentik build env flow.

## [2.2.5] - 2026-04-29

### Added

- Added `.secrets/.env.prod` as a local ignored production env reference for recovery and deployment patching.
- Added `AUTHENTIK_JWKS_URL` support so the backend can verify Authentik RS256 tokens from JWKS instead of relying solely on a hard-coded PEM.

### Changed

- Updated `apache_production_deploy.sh` to preserve discovered `.env*` files under `~/docman/env-backups/` and keep `~/docman/previous-backend.env.prod` as the preferred recovery source.
- Changed the deployment script to detect and reuse existing production values more safely during recovery prompts instead of depending on placeholder `.env` content.
- Modernized `apache_production_update.sh` to rebuild the Vue frontend, publish the remote bundle, preserve prior env files, and follow the current `docman` service model.
- Modernized `apache_production_update_ni.sh` to match the current Vue/remote-bundle deployment path, preserve env backups, and require explicit SSL domain/email inputs for Certbot automation.
- Updated deployment documentation and README guidance to reflect the current Linode, Apache, Authentik, SES, Redis, and hybrid remote-bundle deployment path.
- Updated backend Authentik configuration examples and `.env.sample` to prefer JWKS-based validation with `AUTHENTIK_JWKS_URL`.
- Updated Swagger/OpenAPI metadata to use `info@resonancedesigns.dev`, label the live API correctly as production, and remove stale `docman.com` assumptions.
- Updated package metadata and backend email fallbacks to use the Resonance Designs contact address consistently.

## [2.2.4] - 2026-04-27

### Added

- Added Authentik migration architecture documentation in `docs/architecture/ADR-005-suite-identity-migration.md`.
- Added transitional backend identity resolution support for future Authentik-issued tokens.
- Added `authentikSub` and provider-linking support to the local DocMan user model.
- Added a CLI script and admin API/UI workflow for linking existing DocMan users to Authentik identities.
- Added an Authentik PKCE login path in `frontend-vue` for suite-level sign-in.
- Added a reusable MongoDB TLS helper script in `scripts/setup-mongodb-ssl/setup-mongodb-ssl.sh`.

### Changed

- Updated `apache_production_deploy.sh` to align with the current RDocMan architecture.
- Changed the deployment script to build and publish `frontend-vue` instead of the legacy frontend.
- Changed the deployment script to publish `frontend-vue/dist-remote/remote/` for the RDSysCMD hybrid desktop module.
- Changed the deployment script to recreate `docman-backend.service` with the `docman` service user.
- Changed the deployment script to detect and reuse an existing MongoDB server configuration when available.
- Changed the deployment script to reuse prior `.env.prod` values from the latest deployment backup as prompt defaults when available.
- Tightened the documented and scripted Node.js requirement to `20.19+` or `22.12+` for the current Vue/Vite toolchain.
- Updated deployment documentation and README guidance to reflect the current Vue/Vuetify, Authentik, and hybrid remote-bundle deployment path.

## [2.2.3] - 2026-04-25

### Added

- Added a project-specific Docusaurus documentation site under `docs-site/`.
- Added maintainer documentation for release workflow, version syncing, GitHub Actions, Render, Linode, Cloudflare, data safety, and frontend selection.
- Added a GitHub Pages workflow for publishing the Docusaurus docs site from `docs-site/`.
- Added `docs-site/package.json` and `docs-site/package-lock.json` to `npm run version:sync` coverage.

### Changed

- Updated README and developer onboarding documentation to link maintainers to the release/deployment guide and docs site.
- Updated the Linode GitHub Actions deployment workflow to build the selected UI and deploy the selected frontend bundle.
- Changed the Linode deployment workflow to manual-only with `workflow_dispatch` while server-side SSH setup is unfinished.
- Synchronized app version metadata to `2.2.3` across package files, lockfiles, project config, README badges, and tracked source headers.

### Verified

- Verified the docs site with `npm ci --prefix docs-site`.
- Verified the docs site production build with `npm run build --prefix docs-site`.

### Notes

- The docs build succeeds with a non-fatal webpack warning from `vscode-languageserver-types`.
- The docs dependency tree currently reports npm audit findings inherited from the Docusaurus install.

## [2.2.2] - 2026-04-25

### Added

- Added configurable production UI selection with `DOCMAN_UI=vue|react`, defaulting to the Vue/Vuetify interface.
- Added cross-platform build commands:
  - `npm run build`
  - `npm run build:vue`
  - `npm run build:react`
- Added backend production static serving support for the selected UI bundle.
- Added safe deployment seeding with `npm run seed:safe`.
- Added optional startup seeding with `SEED_ON_DEPLOY=true`.
- Added default account configuration for safe seeding:
  - `DOCMAN_DEFAULT_EMAIL`
  - `DOCMAN_DEFAULT_USERNAME`
  - `DOCMAN_DEFAULT_PASSWORD`
- Added production data clearing safeguards for all `clear:*` scripts.
- Added `npm run version:sync` to synchronize app version metadata from the root `package.json`.
- Added `npm run git:release` to create and push `release/X.X.X` branches and `vX.X.X` tags from the root package version.

### Changed

- Changed the default production build target from the legacy React frontend to the Vue/Vuetify frontend.
- Updated environment documentation for Render/Atlas deployment settings.
- Updated `.env.sample` with UI selection, safe seed, and default account settings.
- Synchronized tracked app version metadata across package files, lockfiles, README badges, project config, docs, scripts, and source headers.

### Safety

- Safe seeding now refuses to delete, drop, or recreate collections.
- Safe seeding only inserts sample data when the database is empty.
- If records exist but no users exist, safe seeding creates only the configured default superadmin account.
- Production clear scripts now refuse to run unless `CONFIRM_PRODUCTION_CLEAR=true` is explicitly set.
- Release automation refuses to run with a dirty worktree, detached HEAD, duplicate release branch, or duplicate tag.

### Notes

- `npm run git:release` intentionally requires committed changes before creating and pushing a release branch/tag.
- Jest verification is still blocked by the existing missing `jest-watch-typeahead/filename` configuration dependency.
