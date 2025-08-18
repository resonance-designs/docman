# DocMan - Document Management System

###### By Resonance Designs

###### Latest Version: v2.1.6

A modern, full-stack document management system built with React, Node.js, and MongoDB. DocMan provides secure document storage, collaborative workflows, and comprehensive review management.

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
- MongoDB 4.4+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd docman

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start development servers
npm run dev:backend    # Backend on :5001
npm run dev:frontend   # Frontend on :5173
```

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

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5001/api
```


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

### Frontend Architecture
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

### Key Patterns
- **Service Layer Pattern**: Business logic separated from HTTP handling
- **Custom Hooks**: Reusable state logic across components
- **Shared Components**: Consistent UI patterns with accessibility
- **Database Optimization**: Strategic indexing and query optimization

## 📚 Documentation

### For Developers
- **[Developer Onboarding Guide](./docs/DEVELOPER_ONBOARDING.md)** - Complete setup and workflow guide
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
