# DocMan - Document Management System

__by Resonance Designs__

![Static Badge](https://img.shields.io/badge/Version-3.0.2-orange)
![Static Badge](https://img.shields.io/badge/Latest_Release-v3.0.1-green)

A modern, full-stack document management system built with Node.js, MongoDB, and a frontend currently migrating from React to Vue/Vuetify. DocMan provides secure document storage, collaborative workflows, and comprehensive review management.

DocMan is also the baseline UI guidepost for the larger Resonance Designs local app ecosystem. New suite-facing UI work should use Vue, Vite, Vuetify, and shared Material-style interaction patterns.

## Install on a fresh Ubuntu server

The interactive [`install.sh`](install.sh) installs prerequisites and configures native services, authenticated databases, the first superadmin, encrypted storage, HTTPS and optional scheduled backups. Start with the [guided installer walkthrough](docs/deployment/automated-installation.md), including prerequisites, prompts, expected results and recovery. Target: latest Ubuntu LTS (currently 26.04), x86_64 with AVX. Full fresh-VM acceptance remains pending; local safety/bootstrap checks are documented there.

After cloning the reviewed release on a **fresh server**, run `bash install.sh --check`, then `sudo bash install.sh`. For an existing deployment, use [the update procedure](docs/deployment/ubuntu-server-installation.md#19-existing-installations-and-updates), not this installer.

For an existing standard-layout server, [`update.sh`](update.sh) stages the selected release, requires an encrypted pre-update backup, preserves settings/keys, runs migrations and verifies the published application. Read the [guided update and recovery walkthrough](docs/deployment/automated-updates.md). Obtain it in a separate tools clone before changing an older live checkout, then run `sudo bash update.sh --check`. Full Ubuntu VM update acceptance remains pending.

## ✨ Features

### 📄 Document Management

- **Upload & Storage**: Authenticated, checksum-verified file storage with version control
- **Metadata Management**: Rich document metadata and categorization
- **Search & Filter**: Full-text search with advanced filtering
- **Access Control**: Role-based permissions and stakeholder management

### 👥 Collaboration

- **Team Management**: Create teams and manage members
- **Project Organization**: Group documents into projects
- **Stakeholder Assignment**: Assign document owners and stakeholders
- **Review Workflows**: Structured document review processes

### 🔐 Security & Compliance

- **Authentication**: JWT-based secure authentication
- **Authorization**: Role-based access control (Viewer, Editor, Admin)
- **Audit Trail**: Append-only, hash-chained audit log with export and integrity verification
- **Change Approval**: New versions are published only after approval by designated approvers
- **Revision History**: Every metadata change stored with before/after values

See [docs/compliance-and-redis.md](docs/compliance-and-redis.md) for the audit log, approval workflow, Redis options (Upstash or self-hosted), and upgrade steps.
- **Data Protection**: Input validation and sanitization

### 📊 Analytics & Reporting

- **Dashboard**: Real-time system metrics and user activity
- **Document Analytics**: Usage patterns and review status
- **Custom Charts**: Configurable data visualizations
- **Export Capabilities**: Data export in multiple formats

## 🚀 Quick Start

**Installing on an Ubuntu server? Start with the [complete Ubuntu installation guide](docs/deployment/ubuntu-server-installation.md).** It provides one Ubuntu 26.04 LTS installation walkthrough and an internal POC sequence that installs the application before DNS/HTTPS setup. It covers every required service, local accounts, HTTPS, email, backups, restore drills, updates, and troubleshooting. The local development commands below are not the production installation procedure.

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm
- MongoDB 6.0+ (verified with 8.0.34)

### Manual Local Installation

```bash
# Clone the repository
sudo git clone https://github.com/resonance-designs/docman.git /path/to/docman

# Install backend dependencies
cd /path/to/docman/backend
sudo npm install

# Install frontend dependencies
cd /path/to/docman/frontend
sudo npm install

# Install Vue/Vuetify migration frontend dependencies
cd /path/to/docman/frontend-vue
sudo npm install

# Set up environment variables
sudo cp /path/to/docman/backend/.env.sample /path/to/docman/backend/.env.dev

# Open .env.dev and configure as needed
sudo nano /path/to/docman/.env.dev

# Start development servers
cd /path/to/docman/backend
npm run dev    # Backend on :5001
cd /path/to/docman/frontend
npm run dev    # Frontend on :5173
cd /path/to/docman/frontend-vue
npm run dev    # Vue/Vuetify migration frontend on :5174
```

Now visit http://localhost:5173 in your browser to check that the application is running locally.

The Vue/Vuetify migration frontend runs at http://localhost:5174 and can run beside the existing React frontend.

### Environment Configuration

#### Backend (.env)

```env
NODE_ENV=development
PORT=5001
MONGO_URI=mongodb://localhost:27017/docman
JWT_SECRET=your-jwt-secret
REFRESH_TOKEN_SECRET=your-refresh-secret
ATLAS=no
```

#### Optional MongoDB Atlas configuration

For a self-hosted deployment using Atlas, configure the backend environment with the following values. Follow the Ubuntu deployment guide for protected settings files and service setup.

```env
NODE_ENV=production
ATLAS=yes
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority&appName=<app-name>
JWT_SECRET=<secure-random-secret>
DOCMAN_UI=vue
SEED_ON_DEPLOY=false
UPSTASH_REDIS_REST_URL=<upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-rest-token>
```

The backend uses `PORT` first, then `NODE_PORT`, then `5001`; configure the port to match the reverse proxy.

Use `MONGO_URI` or `MONGODB_URI` for a full MongoDB connection string. `MONGO_ATLAS_URI` is not read by the backend.

`DOCMAN_UI` chooses the production UI. Use `vue` for the Vuetify interface or `react` for the legacy React interface. The default is `vue`.

`SEED_ON_DEPLOY=true` runs the safe seed during backend startup. The safe seed never deletes or drops data. It seeds sample data only when the database is empty; if records already exist, it skips seeding. If records exist but the users collection is empty, it creates only the default superadmin account. Set `DOCMAN_DEFAULT_EMAIL`, `DOCMAN_DEFAULT_USERNAME`, and `DOCMAN_DEFAULT_PASSWORD` to control that account.

If you prefer the split Atlas variables instead of `MONGO_URI`, provide all of these:

```env
MONGO_ATLAS_USER=<user>
MONGO_ATLAS_PASSWORD=<password>
MONGO_ATLAS_HOST=<cluster-host>
MONGO_ATLAS_DB=<database>
MONGO_ATLAS_APP=<app-name>
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:5001/api
VITE_AUTHENTIK_ENABLED=false
VITE_AUTHENTIK_CLIENT_ID=rdocman-web
VITE_AUTHENTIK_AUTHORIZATION_URL=https://accounts.resonancedesigns.dev/application/o/authorize/
VITE_AUTHENTIK_REGISTRATION_URL=https://accounts.resonancedesigns.dev/if/flow/<your-enrollment-flow>/
VITE_AUTHENTIK_TOKEN_URL=https://accounts.resonancedesigns.dev/application/o/token/
VITE_AUTHENTIK_REDIRECT_URI=http://localhost:5174/auth/callback
VITE_AUTHENTIK_SCOPE=openid profile email
```

#### Frontend production build env

For production Authentik-enabled builds, the Vue frontend reads build-time values from:

```text
frontend-vue/.env.production
```

Create it from:

```text
frontend-vue/.env.production.example
```

Important:

* `frontend-vue/.env.production` is intentionally ignored because it is environment-specific.
* `VITE_*` values are shipped to the browser and must not contain secrets.
* Pull the Authentik client ID and OIDC endpoints from the `RDocMan Web Provider` overview in Authentik or its OpenID configuration document before filling the file.
* `VITE_AUTHENTIK_REGISTRATION_URL` should point at the Authentik self-service enrollment flow you want new users to use for suite account creation.
* The deploy/update scripts should either copy `frontend-vue/.env.production` from the prepared source checkout or generate it from the `VITE_*` values stored in `backend/.env.prod` before the Vite build runs.
* Changing `frontend-vue/.env.production` requires a frontend rebuild and republish.

The Vue/Vuetify frontend defaults to the current browser hostname on port `5001` during development. This allows both `http://localhost:5174` and `http://127.0.0.1:5174` to call the backend. The backend CORS development allowlist includes both localhost and loopback origins for ports `3000`, `5173`, and `5174`.

When Authentik is enabled in the Vue frontend, the login view will expose a "Sign in with Resonance Account" path. The frontend uses Authorization Code + PKCE and expects the backend to accept Authentik-issued access tokens that resolve to linked local RDocMan users through `authentikSub`.

When `VITE_AUTHENTIK_REGISTRATION_URL` is configured, the login view also exposes a `Create Resonance Account` path for suite-wide account creation in Authentik.

Current Authentik migration reality:

* the Authentik user must already exist
* if the Authentik token carries a verified email that matches one local `RDocMan` user, the app auto-links that user on first sign-in
* if the Authentik token carries a verified email and no local `RDocMan` user exists yet, the app just-in-time provisions a new local viewer account
* the current admin linking flow still expects the real Authentik `sub` claim from the token payload for manual repair, pre-linking, and exceptions

Practical implication:

* most users should no longer need manual linking if Authentik gives the app a usable verified email
* entering a username or email instead of the real `sub` will still produce a broken manual link
* once any `authentikSub` value is saved, the current admin UI stops showing that user in the "unlinked" list until the record is corrected

Suite registration authority:

* Authentik should be treated as the canonical place where new suite users create their primary account
* `RDocMan` should own only the local shadow user/profile/role record for app-specific settings
* Keep **System Settings → Accounts and passwords → Allow local self-registration** off (default); this database policy replaces `LOCAL_SELF_REGISTRATION_ENABLED`. See [account invitations and password policy](docs/account-invitations.md).

How to get the real `sub` today:

* sign in through `Sign in with Resonance Account`
* preserve the browser network log across the redirect
* inspect the Authentik token response
* decode the JWT payload from `access_token` or `id_token`
* copy the `sub` claim exactly

Do not use the Authentik username, email, or display name as `authentikSub` unless one of those is literally the `sub` claim in the decoded token.

## 🧭 Suite UI Migration

DocMan currently has two frontend surfaces:

| Path | Stack | Purpose |
|------|-------|---------|
| `frontend/` | React, Vite, Tailwind, DaisyUI | Existing production-capable frontend |
| `frontend-vue/` | Vue, Vite, Vuetify | Migration foundation and shared suite UI guidepost |

The Vue/Vuetify frontend should be brought to feature parity in phases. The current migration foundation includes:

* Shared Vuetify app shell and Resonance theme.
* Login/logout flow using the existing DocMan API.
* Protected routes and role-gated navigation.
* Read-heavy list pages for documents, books, categories, teams, and projects.
* Loaded-row search in the shared resource list page.
* First document detail page at `/documents/:id`.

The existing React frontend should remain intact until the Vue/Vuetify frontend covers the primary workflows.
## ⚙️ Production Deployment & Update Scripts

Maintainers should read the [Release and Deployment Maintainer Guide](./docs/RELEASE_AND_DEPLOYMENT.md) before cutting release branches, operating self-hosted servers, or changing deployment automation.

DocMan includes three scripts to manage deployment and updates on a production Apache server.

These scripts are designed to work seamlessly with an Apache web server and leverage Let's Encrypt for SSL/TLS encryption. They automate the process of updating both the backend and frontend applications while ensuring that no downtime occurs during the transition period.

You can find these scripts in this repositories latest release: [https://github.com/resonance-designs/docman/releases/tag/latest](https://github.com/resonance-designs/docman/releases/tag/latest)

Download them and then upload them somewhere on your server, like your users home directory (Eg, `/home/user/scripts/`)

### Available Scripts

| Script | Purpose | Notes |
|--------|---------|------|
| [`apache_production_deploy.sh`](https://github.com/resonance-designs/docman/releases/download/latest/apache_production_deploy.sh) | Initial deployment of DocMan to a fresh server | Use this for first-time setup or to recover a broken deployment tree. Clones a fresh repo copy, creates a persistent backup of any existing deployment tree/service/publish root, materializes `frontend-vue/.env.production`, rebuilds the Vue frontend, publishes the remote bundle, and recreates the backend service definition. |
| [`apache_production_update.sh`](https://github.com/resonance-designs/docman/releases/download/latest/apache_production_update.sh) | Standard interactive update | Updates an existing Apache-hosted instance from the current checked-out repo, creates a full persistent backup of the deployment tree and Apache publish root, materializes `frontend-vue/.env.production`, rebuilds the Vue/remote assets, and optionally runs Certbot for one or more domains. |
| [`apache_production_update_ni.sh`](https://github.com/resonance-designs/docman/releases/download/latest/apache_production_update_ni.sh) | Non-interactive automated update | Fully automated update for the current Vue/remote-bundle deployment shape. Supports `--dry-run`, creates a full persistent backup, rolls back from the local backup on errors, and can run Certbot when `SSL_DOMAINS` and `CERTBOT_EMAIL` are provided. |

### Setting Executable Permissions

Before running any script, ensure it is executable:

```bash
chmod +x /path/to/docman/scripts/apache_production_deploy.sh
chmod +x /path/to/docman/scripts/apache_production_update.sh
chmod +x /path/to/docman/scripts/apache_production_update_ni.sh
```

Replace `/path/to/docman/scripts/` with the path where you uploaded them to on your server (Eg, `/home/user/scripts/`).

### Usage

#### 1️⃣ Initial Deployment

```bash
sudo ./apache_production_deploy.sh
```

* Installs backend and frontend on a fresh server.
* Creates a fresh `.env.prod` from `.env.sample` for the new deployment.
* Generates `frontend-vue/.env.production` from the prepared source checkout or `VITE_*` values in `backend/.env.prod`.
* Optionally sets up SSL certificates.
* Clones a fresh repository checkout into `/var/www/docman`.
* Builds `frontend-vue` and `frontend-vue/dist-remote/remote/`.
* Republishes the remote bundle used by `RDSysCMD`.
* Backs up an existing `/var/www/docman` tree before replacing it.
* Exports previously discovered `.env*` files to `~/docman/env-backups/`.
* Preserves the previous backend environment file at `~/docman/previous-backend.env.prod` when available.
* Reuses the preserved backend env file as the preferred source of prompt defaults on the next recovery run.

If you are recovering a broken Linode deployment rather than deploying to a brand-new server, expect the script to remain interactive. It may still ask for:

* MongoDB connection values
* `NODE_PORT`
* Upstash Redis values
* AWS SES values
* JWT/auth token secret values

The preserved env file under `~/docman/previous-backend.env.prod` is intended to make those prompts much less painful on the next run.

#### Updates to existing servers

Use the [guided updater walkthrough](docs/deployment/automated-updates.md), including its prerequisite checks and separate tools clone. **Do not pull the live checkout before the pre-update backup.** The updater records the installed commit and backs up the database, uploads and original source before switching to the approved release.

The guided updater is interactive; an unattended replacement is not currently provided. The older `apache_production_update*.sh` scripts are legacy tooling and are not the recommended routine-update procedure for this release. For a nonstandard layout, use the [manual Ubuntu update procedure](docs/deployment/ubuntu-server-installation.md#19-existing-installations-and-updates) and preserve the old deployment before changing its checkout.

A failed update after source/database mutation requires the documented recovery procedure; do not perform an automatic code-only rollback over a changed database. Fresh-server installation and update acceptance remain separate checks.

## 🏗️ Architecture

DocMan follows modern architectural patterns for scalability and maintainability:

### Backend Architecture

```
backend/
├── src/
│   ├── controllers/      # HTTP request handlers
│   ├── services/         # Business logic layer
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API route definitions
│   ├── middleware/      # Custom middleware
│   ├── lib/            # Utilities and helpers
│   └── config/         # Configuration files
└── __tests__/          # Test suites
```

### Existing React Frontend Architecture

```
frontend/
├── src/
│   ├── components/     # React components
│   │   ├── shared/    # Reusable UI components
│   │   └── ...        # Feature-specific components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and API client
│   └── assets/        # Static assets
├── .storybook/        # Component documentation
└── __tests__/         # Test suites
```

### Vue/Vuetify Migration Frontend Architecture

```
frontend-vue/
├── src/
│   ├── components/     # Shared Vue/Vuetify components
│   ├── composables/    # Auth, resource loading, and reusable state
│   ├── plugins/        # Vuetify setup and theme defaults
│   ├── router/         # Vue Router routes and guards
│   ├── services/       # API client
│   └── views/          # Page-level module views
└── vite.config.js
```

### Key Patterns

- **Service Layer Pattern**: Business logic separated from HTTP handling
- **Custom Hooks**: Reusable state logic across components
- **Vue Composables**: New migration frontend uses composables for shared state and API loading
- **Shared Components**: Consistent UI patterns with accessibility
- **Suite UI Baseline**: Vue/Vuetify views should inform future integrated apps in the local ecosystem
- **Database Optimization**: Strategic indexing and query optimization

## 📚 Documentation

### For Developers

- **[Developer Onboarding Guide](./docs/DEVELOPER_ONBOARDING.md)** - Complete setup and workflow guide
- **[Release and Deployment Maintainer Guide](./docs/RELEASE_AND_DEPLOYMENT.md)** - Release branches, tags, Ubuntu/Linode, GitHub Actions, and deployment safety
- **[Docs Site](./docs-site/README.md)** - Docusaurus source for the published DocMan documentation site
- **[Architecture Decision Records](./docs/architecture/README.md)** - Design decisions and rationale
- **[API Documentation](http://localhost:5001/api-docs)** - Interactive API documentation
- **[Component Library](http://localhost:6006)** - Storybook component documentation

### For Users

- **User Manual** - Complete user guide (coming soon)
- **Admin Guide** - System administration guide (coming soon)

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Frontend tests
cd frontend
npm test                # Run all tests
npm run test:ui         # Interactive test UI
npm run test:coverage   # Coverage report

# Vue/Vuetify migration frontend
cd frontend-vue
npm run build           # Verify the migration frontend builds
```

### Test Coverage

- **Backend**: 85%+ coverage target
- **Frontend**: 80%+ coverage target
- **Integration Tests**: Critical user flows
- **E2E Tests**: Complete application workflows

## 📊 Performance

### Benchmarks

- **API Response Time**: 50-500ms average
- **Database Queries**: <100ms average
- **Frontend Load Time**: <3 seconds initial load
- **File Upload**: Up to 10MB files supported

### Optimization Features

- **Database Indexing**: Strategic indexes for common queries
- **Query Optimization**: Aggregation pipelines for complex operations
- **Caching**: Multi-layer caching strategy
- **Code Splitting**: Lazy-loaded components and routes

## 🔐 Security

Run `npm run security:audit` from the repository root to audit all five lockfiles. Findings and audit failures exit nonzero. See the [dependency security review](docs/dependency-security-review.md) for the November 18 remediation, remaining unpatched Picomatch advisory, verification, and deployment requirements.

### Security Features

- **Authentication**: JWT with refresh token rotation
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: Protection against abuse
- **Security Headers**: CORS, CSP, HSTS implementation
- **File Upload Security**: Type validation and size limits

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards

- **ESLint**: Enforced code style
- **Prettier**: Automatic code formatting
- **JSDoc**: Comprehensive function documentation
- **Testing**: Required for new features

## 📄 License

This project is licensed under the UNLICENSED License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the DocMan Team**

For more information, visit our [documentation](./docs/) or check out the [developer onboarding guide](./docs/DEVELOPER_ONBOARDING.md).


### Superadmin account management

Superadmins can use **Users** (`/admin/users`) to create local accounts, edit profiles/roles, reset other local users' passwords, and disable/re-enable accounts while preserving document history. The API enforces superadmin access; self-registration can remain disabled. Bootstrap the first superadmin using the [Ubuntu walkthrough](docs/deployment/ubuntu-server-installation.md#11-create-accounts-and-initialize-the-database). Existing superadmins cannot be demoted/disabled through this interface. Deploy the updated backend and rebuilt Vue frontend together.

### Superadmin email configuration

Open **System Settings → Outgoing email** to select SMTP (username/password or IP-authorized relay), AWS SES (server credentials/IAM role or stored API keys), the existing SES environment settings, or disabled sending. Configure sender/reply-to, SMTP host/port/TLS/authentication, or SES region, then save and send a test email. Saved settings apply to password-reset/review messages without restarting; recipient delivery still needs confirmation.

Stored credentials use AES-256-GCM with a dedicated server-side `EMAIL_SETTINGS_KEY` and are never returned to the browser. SMTP certificate verification stays enabled; password login requires encryption. SMTP without login and AWS server credentials work without the encryption key. See [Ubuntu guide section 16](docs/deployment/ubuntu-server-installation.md#16-configure-outgoing-email-in-system-settings) for complete setup, internal CA trust, backup/recovery, and troubleshooting. Self-service Vue password-reset screens remain a separate outstanding feature.

### Encryption at rest and upload size

Stored document files can be encrypted at rest, invisibly to users: files are encrypted while they stream to disk (no plaintext is ever written) and decrypted only for accounts allowed to download them. Each file has its own key, wrapped by the server's `DOCUMENT_ENCRYPTION_KEY`; nobody handles keys or document passwords. Superadmins turn encryption on and set the maximum upload size in **System Settings → Document storage**. See [Ubuntu guide section 15.1](docs/deployment/ubuntu-server-installation.md#151-encryption-at-rest-and-upload-size).

Activity and email notifications: see [event coverage, setup, queue status and recovery](docs/activity-notifications.md).

Users can open **My account** in the toolbar to edit their profile or change a local password. Password changes require the current password and sign out existing sessions. SSO profiles remain provider-managed; username and email changes require a superadmin.

Document editors/owners and administrators can enable **Public sharing** on a document details page. Anyone with the random link can download the current approved file without signing in. Disable sharing to revoke the link; re-enabling issues a new link. Private versions, assignments, and audit history are excluded. Public access still requires network access to the server.

Superadmins can disable new public sharing in System Settings and optionally suspend existing public links until sharing is re-enabled. Individual document revocation remains permanent.

## User manual and QA guide

- [Illustrated end-user manual (PDF)](output/pdf/docman-user-manual.pdf)
- [End-to-end QA guide (PDF)](output/pdf/docman-qa-end-to-end-guide.pdf)
- [Editable sources, blank results sheet and rebuild instructions](docs/manuals/README.md)

The guides reflect the current Vue source, distinguish API-only functionality, and do not imply that local changes are deployed or that acceptance tests have been run.

### Categories, books, teams and projects

The Vue navigation now provides management interfaces for these resources. Categories are managed by admins/superadmins; books by editor/admin owners or superadmins; teams by owners/team admins or superadmins; projects by owners/managers or superadmins. Resource linking organizes existing documents and does not grant document access. See [management operations and acceptance checks](docs/resource-management.md).
