---
sidebar_position: 4
---

# Data Safety

Production deploys must not wipe Atlas data.

DocMan includes destructive `clear:*` scripts for development and administrative recovery work. In production, these scripts refuse to run unless explicitly confirmed:

```env
CONFIRM_PRODUCTION_CLEAR=true
```

Do not set this variable in Render, GitHub Actions, or Linode production environments.

## Safe Seeding

Use:

```bash
npm run seed:safe
```

or set:

```env
SEED_ON_DEPLOY=true
```

for a one-time startup seed.

Safe seeding never deletes, drops, or recreates collections.
