---
sidebar_position: 2
---

# Versioning

The root `package.json` is the source of truth for the DocMan app version.

Patch bump:

```bash
npm run version:sync
```

Explicit version:

```bash
npm run version:sync 2.3.0
```

The sync script updates:

- root package metadata
- backend package metadata
- React frontend package metadata
- Vue/Vuetify frontend package metadata
- package lock root metadata
- README version badges
- `project-config.json`
- source and docs `@version` headers

After version sync, review the diff and commit it before creating a release branch.
