---
sidebar_position: 2
---

# Linode Deployment

The Linode deployment should keep backend application files separate from Apache's static document root.

Common layout:

| Path | Purpose |
| --- | --- |
| `/var/www/docman` | application/backend repo and server-side files |
| `/var/www/docman/html` or configured vhost root | static frontend files served by Apache |

Confirm the real paths on the server before copying files.

## Frontend Output

Vue/Vuetify build output:

```text
frontend-vue/dist
```

Legacy React build output:

```text
frontend/dist
```

Do not copy static frontend files into the backend application directory.

## Backend Update

Backend updates should preserve:

- `backend/.env.prod`
- uploads
- service configuration
- MongoDB data

After backend updates:

```bash
npm install --omit=dev
sudo systemctl restart docman-backend.service
```

Confirm the actual service name before running restart commands.
