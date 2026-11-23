# Release and Deployment Maintainer Guide

This document is for project maintainers responsible for cutting releases and operating self-hosted Ubuntu and Linode deployments.

For a new independently hosted Ubuntu server, use the [complete Ubuntu installation guide](deployment/ubuntu-server-installation.md). Its local MongoDB/Redis architecture is separate from the optional Atlas deployment configuration described below.

## Deployment documentation maintenance requirement

The Ubuntu guide must always target the **latest stable Ubuntu Server LTS** through one complete, beginner-followable installation sequence. Verify the current release using official Ubuntu sources when updating it. Cover installation and configuration of every prerequisite, exact commands and file contents, expected results, and recovery/troubleshooting. Keep the explicit version/codename and package repositories consistent; do not maintain older-LTS alternatives inside the walkthrough.

Update the guide whenever guided deployment introduces or corrects a step. For a new LTS, check dependency compatibility and validate the revised instructions before claiming support. Record blockers and unverified steps honestly. Update README, HANDOFF, and the documentation overview together so they point to the same deployment target. This is a standing user requirement recorded in [HANDOFF](../HANDOFF.md).

Before accepting an edit, read it as a first-time terminal user: can the reader identify the right computer/prompt, enter each value, recognize successful or deliberately denied output, and know exactly where to stop on failure? Include silent-success behavior and interactive answers where relevant. Put checkpoints before dependent mutations rather than explaining a failed preflight after a block that already applies the change. Review this across the entire walkthrough, including optional services and recovery, not only the example reported by a user.

Documentation corrections are maintainer work. When the user requests a complete fresh-server guide, audit the repository and the guide locally; do not substitute a new server diagnostic exercise for repairing the instructions. Keep one base package list, install each prerequisite before first use, and distinguish required runtime components from optional integrations and separate backup-host requirements. A permission check does not prove a package is installed. Keep a single current installation-status table in HANDOFF rather than contradictory appended checkpoints. State whether edits are local or published, and distinguish syntax validation from a target-server deployment test.

## Deployment Targets

DocMan runs on independently managed Ubuntu servers; the existing hosted production target is:

| Hostname | Platform | Purpose |
| --- | --- | --- |
| `docman.resonancedesigns.dev` | Linode | Primary production deployment |

Each deployment must use its intended database. Keep development/POC data separate from production. MongoDB Atlas remains optional.

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

## Cloudflare DNS

Recommended records:

| Name | Target | Notes |
| --- | --- | --- |
| `docman` | Linode IP or existing Linode hostname | Primary production |


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

The Linode workflow is manual-only (`workflow_dispatch`). The documentation workflow runs on relevant changes to `master` or manual dispatch. Dependency audits and installer/update safety checks run separately; they do not deploy the app.

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

Do not set that variable in GitHub Actions or other production environments by default.

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
9. Deploy the release explicitly to the intended Ubuntu/Linode server and verify service health.
10. Confirm Cloudflare routes the intended hostnames to the intended origins.
11. Confirm the app loads and login works.
12. If `SEED_ON_DEPLOY=true` was used for first setup, set it back to `false`.
