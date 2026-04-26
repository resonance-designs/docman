---
sidebar_position: 2
---

# Frontend Selection

The production frontend is selected with:

```env
DOCMAN_UI=vue
```

Supported values:

| Value | Frontend |
| --- | --- |
| `vue` | Vue/Vuetify frontend |
| `react` | Legacy React frontend |

The default is `vue`.

Build commands:

```bash
npm run build
npm run build:vue
npm run build:react
```

The backend uses the same environment variable to decide which `dist` directory to serve in production.
