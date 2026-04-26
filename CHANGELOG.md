# Changelog

All notable changes to this project will be documented in this file.

## [0.2.3] - 2026-04-25

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

## [0.2.2] - 2026-04-25

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
