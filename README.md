# DocMan - Document Management System

__by Resonance Designs__

![Static Badge](https://img.shields.io/badge/Version-2.2.3-orange)
![Static Badge](https://img.shields.io/badge/Latest_Release-v2.2.3-green)

A modern, full-stack document management system built with Node.js, MongoDB, and a frontend currently migrating from React to Vue/Vuetify. DocMan provides secure document storage, collaborative workflows, and comprehensive review management.

DocMan is also the baseline UI guidepost for the larger Resonance Designs local app ecosystem. New suite-facing UI work should use Vue, Vite, Vuetify, and shared Material-style interaction patterns.

## ✨ Features

### 📄 Document Management

- **Upload & Storage**: Secure file upload with version control
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
- **Audit Trail**: Complete activity logging
- **Data Protection**: Input validation and sanitization

### 📊 Analytics & Reporting

- **Dashboard**: Real-time system metrics and user activity
- **Document Analytics**: Usage patterns and review status
- **Custom Charts**: Configurable data visualizations
- **Export Capabilities**: Data export in multiple formats

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm
- MongoDB 4.4+

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

#### Render + MongoDB Atlas

Set the Render start command to `npm run start` and add these values in Render under **Environment Variables**. Do not use a Secret File for these values; the backend reads them from `process.env`.

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

Render provides `PORT` automatically. The backend will use `PORT` first, then `NODE_PORT`, then `5001`.

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
```

The Vue/Vuetify frontend defaults to the current browser hostname on port `5001` during development. This allows both `http://localhost:5174` and `http://127.0.0.1:5174` to call the backend. The backend CORS development allowlist includes both localhost and loopback origins for ports `3000`, `5173`, and `5174`.

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

Maintainers should read the [Release and Deployment Maintainer Guide](./docs/RELEASE_AND_DEPLOYMENT.md) before cutting release branches, operating Render, or changing deployment automation.

DocMan includes three scripts to manage deployment and updates on a production Apache server.

These scripts are designed to work seamlessly with an Apache web server and leverage Let's Encrypt for SSL/TLS encryption. They automate the process of updating both the backend and frontend applications while ensuring that no downtime occurs during the transition period.

You can find these scripts in this repositories latest release: [https://github.com/resonance-designs/docman/releases/tag/latest](https://github.com/resonance-designs/docman/releases/tag/latest)

Download them and then upload them somewhere on your server, like your users home directory (Eg, `/home/user/scripts/`)

### Available Scripts

| Script | Purpose | Notes |
|--------|---------|------|
| [`apache_production_deploy.sh`](https://github.com/resonance-designs/docman/releases/download/latest/apache_production_deploy.sh) | Initial deployment of DocMan to a fresh server | Use this for first-time setup. Installs backend, frontend, and environment variables. |
| [`apache_production_update.sh`](https://github.com/resonance-designs/docman/releases/download/latest/apache_production_update.sh) | Standard interactive update | Updates an existing production instance. Prompts for confirmations. Optional SSL update. |
| [`apache_production_update_ni.sh`](https://github.com/resonance-designs/docman/releases/download/latest/apache_production_update_ni.sh) | Non-interactive automated update | Fully automated update without prompts. Supports optional SSL and `--dry-run` for testing. Automatically rolls back on errors. |

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
* Sets up environment variables (`.env.prod`) from `.env.sample.`
* Optionally sets up SSL certificates.

#### 2️⃣ Standard Interactive Update

```bash
sudo ./apache_production_update.sh
```

* Updates DocMan in an interactive mode.
* Prompts for confirmation before critical steps.

#### 3️⃣ Non-Interactive Update

```bash
sudo ./apache_production_update_ni.sh [--ssl] [--dry-run]
```

* Performs a fully automated, non-interactive update.
* `--ssl` – Updates SSL certificates.
* `--dry-run` – Simulates the update without making any changes.
* Automatically rolls back changes if any command fails.
* Backs up `.env.prod` and frontend files at `/tmp/docman_env_backup/`.

### Recommended Workflow

1. For a **fresh server**, use `apache_production_deploy.sh`.
2. For **routine updates**, test with dry-run first:

   ```bash
   sudo ./apache_production_update_ni.sh --dry-run
   ```
3. Then run the actual non-interactive update:

   ```bash
   sudo ./apache_production_update_ni.sh --ssl
   ```

   or

   ```bash
   sudo ./apache_production_update_ni.sh
   ```

   Depending on whether you need SSL updated or not.

### Notes

* **Backups**: All scripts back up .env.prod and frontend files to /tmp/docman_env_backup/.
* **Rollback**: Scripts automatically restore previous state if a command fails.
* **Root Privileges**: Scripts must be run as root or via sudo.
* **Dry-Run Logs**: Non-interactive script logs simulated commands for review without applying changes.

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
- **[Release and Deployment Maintainer Guide](./docs/RELEASE_AND_DEPLOYMENT.md)** - Release branches, tags, Render, GitHub Actions, and deployment safety
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

