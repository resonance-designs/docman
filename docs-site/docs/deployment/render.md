---
sidebar_position: 1
---

# Render Deployment

Render should deploy from `master`.

Recommended settings:

| Setting | Value |
| --- | --- |
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

Render provides `PORT`; do not hard-code `NODE_PORT` unless required.

## First Empty Database Seed

For first setup against an empty Atlas database:

```env
SEED_ON_DEPLOY=true
DOCMAN_DEFAULT_EMAIL=<admin-email>
DOCMAN_DEFAULT_USERNAME=<admin-username>
DOCMAN_DEFAULT_PASSWORD=<temporary-secure-password>
```

After a successful seed, set:

```env
SEED_ON_DEPLOY=false
```

Safe seed behavior:

- if all app collections are empty, sample data is inserted
- if app records exist and users exist, seeding is skipped
- if app records exist but users are empty, only the default superadmin is created
- collections are never deleted, dropped, or recreated

Look for this in Render logs:

```text
Safe seed current counts:
```
