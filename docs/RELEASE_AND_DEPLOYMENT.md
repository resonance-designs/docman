# Release and Deployment Maintainer Guide

This document is for project maintainers responsible for cutting releases and operating the Render and Linode deployments.

## Deployment Targets

DocMan is intended to run in two production-like places:

| Hostname | Platform | Purpose |
| --- | --- | --- |
| `docman.resonancedesigns.dev` | Linode | Primary production deployment |
| `docman.render.resonancedesigns.dev` | Render | Render-hosted deployment and fallback validation target |

Both deployments should use the same MongoDB Atlas database unless a deliberate test database is being used.

## Release Branch Workflow

The release workflow is automated by `npm run git:release`.

Before creating a release:

1. Merge or rebase the intended changes into the working branch.
2. Run the checks/builds you want for the release.
3. Synchronize the version:

```bash
npm run version:sync
```

or set an explicit version:

```bash
npm run version:sync 2.2.2
```

4. Commit all release changes.
5. Confirm the working tree is clean:

```bash
git status
```

Create and publish the release branch/tag:

```bash
npm run git:release
```

The script reads the version from the root `package.json` and then:

- creates `release/X.X.X` from the current branch
- creates annotated tag `vX.X.X`
- pushes `release/X.X.X` to `origin`
- pushes `vX.X.X` to `origin`

The script refuses to run when:

- the worktree is dirty
- Git is in detached HEAD mode
- the local or remote release branch already exists
- the local or remote tag already exists

After the release branch and tag are pushed, open a PR from `release/X.X.X` into `master`.

## Version Tracking

The root `package.json` is the source of truth for the app version.

Use:

```bash
npm run version:sync
```

to increment the patch version automatically, or:

```bash
npm run version:sync X.X.X
```

to set a specific version.

The version sync script updates:

- package files
- package lock root package metadata
- `README.md` badges
- `project-config.json`
- `@version` headers in project-owned source/docs/scripts

## Render Deployment

Render should deploy from `master`.

Recommended Render settings:

| Setting | Value |
| --- | --- |
| Environment | Node |
| Build Command | `npm run build` |
| Start Command | `npm run start` |
| Auto Deploy | Enabled for `master` |

Required environment variables:

```env
NODE_ENV=production
ATLAS=yes
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority&appName=<app-name>
JWT_SECRET=<secure-random-secret>
DOCMAN_UI=vue
SEED_ON_DEPLOY=false
```

Optional environment variables:

```env
UPSTASH_REDIS_REST_URL=<upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-rest-token>
DOCMAN_DEFAULT_EMAIL=admin@example.com
DOCMAN_DEFAULT_USERNAME=admin
DOCMAN_DEFAULT_PASSWORD=<temporary-secure-password>
```

Render provides `PORT` automatically. Do not set `NODE_PORT` unless there is a specific reason.

### Render UI Selection

`DOCMAN_UI` controls which production frontend the backend serves:

| Value | UI |
| --- | --- |
| `vue` | Vue/Vuetify frontend |
| `react` | Legacy React frontend |

The default is `vue`.

### Render Seeding

Set `SEED_ON_DEPLOY=true` only when you intentionally want the backend startup to run the safe seed.

The safe seed:

- never deletes data
- never drops collections
- never recreates collections
- inserts full sample data only when all app collections are empty
- creates only the default superadmin when records exist but the users collection is empty
- skips seeding when existing app data and users are present

For first Render setup against an empty Atlas database, set:

```env
SEED_ON_DEPLOY=true
DOCMAN_DEFAULT_EMAIL=<admin-email>
DOCMAN_DEFAULT_USERNAME=<admin-username>
DOCMAN_DEFAULT_PASSWORD=<temporary-secure-password>
```

After the seed runs successfully, set:

```env
SEED_ON_DEPLOY=false
```

and rotate the default account password from inside the app.

Look for these log lines in Render:

```text
Safe seed current counts:
Safe seed completed.
```

or:

```text
Existing data found. Safe seed skipped without modifying records.
```

## Cloudflare DNS

Recommended records:

| Name | Target | Notes |
| --- | --- | --- |
| `docman` | Linode IP or existing Linode hostname | Primary production |
| `docman.render` | Render `*.onrender.com` hostname | Render deployment |

For Render certificate issuance, keep the Cloudflare record as DNS-only until Render reports the custom domain as verified and the certificate as issued.

Cloudflare SSL mode should be:

```text
Full (strict)
```

after each origin has a valid certificate for its hostname.

## GitHub Actions

The repository currently includes:

```text
.github/workflows/deploy.yml
.github/workflows/docs-site-pages.yml
```

That workflow runs on pushes to `master`.

Maintainers should treat GitHub Actions as deployment automation, not as the release source of truth. The release source of truth is:

```text
release/X.X.X branch + vX.X.X tag
```

### Required GitHub Secrets

For SSH-based Linode deployment workflows, configure these repository secrets:

| Secret | Purpose |
| --- | --- |
| `SERVER_SSH_KEY` | Private SSH key used by GitHub Actions |
| `SERVER_HOST` | Linode hostname or IP |
| `SERVER_USER` | SSH user |

### GitHub Actions Maintenance Notes

If the GitHub Actions workflow deploys the frontend manually, it must honor the selected UI.

For Vue/Vuetify production deployments, the built frontend lives at:

```text
frontend-vue/dist
```

For legacy React deployments, the built frontend lives at:

```text
frontend/dist
```

The root command:

```bash
npm run build
```

uses `DOCMAN_UI` and defaults to Vue/Vuetify.

When maintaining `.github/workflows/deploy.yml`, make sure any explicit `rsync` or copy step matches the configured UI. Avoid hard-coding `frontend/dist` unless the workflow is intentionally deploying the legacy React interface.

### Docs Site GitHub Pages Workflow

The docs site lives in:

```text
docs-site/
```

The workflow at `.github/workflows/docs-site-pages.yml` builds that Docusaurus site and publishes it to GitHub Pages. In repository settings, configure Pages to use **GitHub Actions** as the source.

## Linode Deployment Notes

The Linode deployment should preserve the distinction between:

| Path | Purpose |
| --- | --- |
| app/backend path | Node backend source, `.env.prod`, package files, uploads |
| vhost document root | static frontend files served by Apache |

Do not copy static frontend build output into the backend application directory.

For static frontend-only updates, copy the selected `dist` output into the Apache document root configured by the existing vhost.

For backend updates, update the backend application path, preserve `.env.prod`, install production dependencies, and restart the backend service.

For full recovery deploys using `scripts/apache_production_deploy.sh`:

- back up the existing `/var/www/docman` tree instead of deleting it blindly
- preserve previous `.env*` files during that backup
- export those env files into `~/docman/env-backups/`
- preserve the last backend env file as `~/docman/previous-backend.env.prod`
- prefer that preserved backend env file as the prompt-default source on the next recovery run

This env preservation behavior exists specifically because production recovery often needs to re-enter:

- MongoDB connection values
- `NODE_PORT`
- Upstash Redis credentials
- AWS SES credentials
- JWT/auth token secrets

Maintainers should treat `~/docman/previous-backend.env.prod` as a recovery aid, not as a replacement for proper secret management. After a successful recovery deploy, confirm the resulting `/var/www/docman/backend/.env.prod` matches the intended live configuration.

## Data Safety Rules

Production deploys must not clear or recreate collections.

The `clear:*` scripts refuse to run in production unless this variable is explicitly set:

```env
CONFIRM_PRODUCTION_CLEAR=true
```

Do not set that variable in Render, GitHub Actions, or Linode production environments by default.

## Release Checklist

1. Update code and docs.
2. Run `npm run version:sync` or `npm run version:sync X.X.X`.
3. Update `CHANGELOG.md`.
4. Run the intended build, usually:

```bash
npm run build:vue
```

5. Commit all changes.
6. Run:

```bash
npm run git:release
```

7. Open a PR from `release/X.X.X` to `master`.
8. Merge the PR.
9. Confirm Render deploy completed.
10. Confirm Cloudflare routes the intended hostnames to the intended origins.
11. Confirm the app loads and login works.
12. If `SEED_ON_DEPLOY=true` was used for first setup, set it back to `false`.
