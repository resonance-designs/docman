---
sidebar_position: 3
---

# GitHub Actions

The repository has two deployment concerns:

- Render auto-deploys from GitHub through Render's own GitHub integration.
- GitHub Actions can deploy to Linode over SSH when configured.

Render does not require a GitHub Actions workflow unless maintainers intentionally switch to Render deploy hooks or API-based deploys.

## GitHub Pages Docs Site

The docs site workflow builds `docs-site` and publishes it to GitHub Pages.

Repository settings required:

1. Open repository settings.
2. Go to **Pages**.
3. Set source to **GitHub Actions**.

The Pages workflow should run on changes to:

```text
docs-site/**
.github/workflows/docs-site-pages.yml
```

## Linode Deploy Action

The existing Linode deploy action is intended to deploy over SSH using repository secrets:

```text
SERVER_SSH_KEY
SERVER_HOST
SERVER_USER
```

Before enabling it as production automation, maintainers should verify:

- the backend app path
- the Apache document root
- the selected frontend output path
- `.env.prod` preservation
- upload directory preservation
- service name used by `systemctl`

For Vue/Vuetify deployments, the frontend output path is:

```text
frontend-vue/dist
```

For legacy React deployments, the frontend output path is:

```text
frontend/dist
```
