# DocMan Vue Frontend

This is the Vue and Vuetify migration foundation for DocMan.

The existing React frontend remains in `frontend/` while this app is brought to feature parity. This frontend is also the UI guidepost for the larger Resonance Designs local app ecosystem.

The first goal is to establish the shared suite shell, design tokens, route frame, and API access pattern that can also inform `rdevsyscmd` desktop surfaces.

## Current Scope

Implemented so far:

* Vuetify app shell and Resonance theme defaults.
* Auth state, login, logout, bearer-token API calls, and route guards.
* Role-gated navigation.
* Read-heavy list pages for documents, books, categories, teams, and projects.
* Shared resource list component with loaded-row search.
* First document detail view at `/documents/:id`.

Still pending:

* Full React feature parity.
* API-backed filters and pagination controls.
* Create/edit forms.
* Review assignment workflows.
* File upload, version history actions, and calendar export.
* Admin detail workflows.

## Commands

```powershell
npm install
npm run dev
npm run build
```

The dev server uses port `5174` so it can run beside the existing React frontend on port `5173`.

The backend should be running on port `5001`:

```powershell
cd ..\backend
npm run dev
```

Then open:

```text
http://localhost:5174
```

The API client defaults to the current browser hostname on backend port `5001`, so both `localhost` and `127.0.0.1` development URLs are supported when the backend CORS allowlist includes those origins.

## Validation

Useful checks:

```powershell
npm run build
```

Browser flow tested during the migration foundation:

* `/documents` redirects unauthenticated users to `/login`.
* Login redirects back to `/documents`.
* Documents, books, categories, teams, and projects routes render after login.
* Document list `Open` actions navigate to `/documents/:id`.
* Desktop and mobile viewport smoke checks render the shared shell.
