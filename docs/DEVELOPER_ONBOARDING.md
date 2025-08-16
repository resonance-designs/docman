# Developer Onboarding Guide

Welcome to the **DocMan** project! This guide will help you get up and running quickly and understand the codebase architecture.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **MongoDB** 4.4+ (local or Atlas)
- **Git** for version control
- **WSL** (if on Windows)

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd docman

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start development servers
npm run dev:backend    # Backend on :5001
npm run dev:frontend   # Frontend on :5173
```

### First Steps Checklist
- [ ] Repository cloned and dependencies installed
- [ ] Environment variables configured
- [ ] Both servers running successfully
- [ ] Can access frontend at http://localhost:5173
- [ ] Can access API docs at http://localhost:5001/api-docs
- [ ] Database connection established

## 🏗️ Architecture Overview

DocMan follows a **modern full-stack architecture** with clear separation of concerns:

```
docman/
├── backend/           # Node.js/Express API
│   ├── src/
│   │   ├── controllers/   # HTTP request handlers
│   │   ├── services/      # Business logic layer
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API route definitions
│   │   ├── middleware/    # Custom middleware
│   │   ├── lib/          # Utilities and helpers
│   │   └── config/       # Configuration files
│   └── __tests__/        # Backend tests
├── frontend/          # React/Vite SPA
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and API client
│   │   └── assets/       # Static assets
│   ├── .storybook/       # Component documentation
│   └── __tests__/        # Frontend tests
└── docs/              # Project documentation
    ├── architecture/     # ADRs and design docs
    └── api/             # API documentation
```

### Key Architectural Patterns

#### 1. **Service Layer Pattern** (Backend)
Business logic is separated from HTTP handling:
```javascript
// Controller (HTTP layer)
export const createDocument = async (req, res) => {
  try {
    const result = await documentService.createDocument(req.body, req.user);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    handleServiceError(error, res);
  }
};

// Service (Business logic)
export const createDocument = async (data, user) => {
  validateDocumentData(data);
  const document = await Doc.create({ ...data, author: user.id });
  await notificationService.notifyStakeholders(document);
  return document;
};
```

#### 2. **Custom Hooks Pattern** (Frontend)
Complex state logic extracted into reusable hooks:
```javascript
// Component using hooks
const CreateDocPage = () => {
  const { users, categories, loading } = useFormData();
  const stakeholderManagement = useStakeholderManagement(setValue);
  const fileUpload = useFileUpload({ onSuccess: handleSuccess });
  
  // Clean, focused component logic
};
```

#### 3. **Shared Component Library**
Reusable UI components with consistent behavior:
```javascript
import { BaseModal, FormField, DataTable } from '@/components/shared';

<BaseModal isOpen={isOpen} title="Create User">
  <FormField label="Name" type="text" {...register('name')} />
</BaseModal>
```

## 🛠️ Development Workflow

### Code Organization Principles

#### Backend Structure
- **Controllers**: Handle HTTP requests/responses only
- **Services**: Contain all business logic and validation
- **Models**: Define data schemas and relationships
- **Middleware**: Handle cross-cutting concerns (auth, validation, etc.)

#### Frontend Structure
- **Pages**: Top-level route components
- **Components**: Reusable UI building blocks
- **Hooks**: Reusable state logic
- **Services**: API communication and data transformation

### Naming Conventions

#### Files and Directories
```
PascalCase:     Components (UserCard.jsx, CreateModal.jsx)
camelCase:      Hooks (useFormData.js, useAuth.js)
kebab-case:     Utilities (api-client.js, date-utils.js)
lowercase:      Directories (components, services, utils)
```

#### Variables and Functions
```javascript
// camelCase for variables and functions
const userName = 'john';
const getUserById = (id) => { ... };

// PascalCase for components and classes
const UserCard = ({ user }) => { ... };
class DocumentService { ... }

// UPPER_SNAKE_CASE for constants
const API_BASE_URL = 'http://localhost:5001';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
```

### Git Workflow

#### Branch Naming
```
feature/add-user-management
bugfix/fix-login-validation
hotfix/security-patch
refactor/extract-service-layer
```

#### Commit Messages
```
feat: add user role management
fix: resolve authentication token expiry
docs: update API documentation
refactor: extract document service layer
test: add unit tests for user service
```

### Code Quality Standards

#### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', '@typescript-eslint/recommended'],
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-unused-vars': 'error'
  }
};
```

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## 📝 Documentation Standards

### JSDoc Comments
All functions should have comprehensive JSDoc comments:

```javascript
/**
 * Creates a new document with validation and notifications
 * @param {Object} data - Document data
 * @param {string} data.title - Document title
 * @param {string} data.description - Document description
 * @param {Object} user - User context
 * @param {string} user.id - User ID
 * @param {string} user.role - User role
 * @returns {Promise<Object>} Created document
 * @throws {ValidationError} When data is invalid
 * @throws {AuthorizationError} When user lacks permissions
 */
export async function createDocument(data, user) {
  // Implementation
}
```

### File Headers
Every file should have a descriptive header:

```javascript
/*
 * @name documentService
 * @file /docman/backend/src/services/documentService.js
 * @service documentService
 * @description Business logic for document management operations
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
```

### Component Documentation
React components should be documented with prop types and examples:

```javascript
/**
 * Reusable modal component with accessibility features
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {ReactNode} props.children - Modal content
 * @example
 * <BaseModal isOpen={true} onClose={handleClose} title="Example">
 *   <p>Modal content</p>
 * </BaseModal>
 */
export const BaseModal = ({ isOpen, onClose, title, children }) => {
  // Implementation
};
```

## 🧪 Testing Guidelines

### Backend Testing
```javascript
// Service layer tests
describe('DocumentService', () => {
  test('should create document with valid data', async () => {
    const mockData = { title: 'Test Doc', description: 'Test' };
    const mockUser = { id: '123', role: 'editor' };
    
    const result = await documentService.createDocument(mockData, mockUser);
    
    expect(result.title).toBe('Test Doc');
    expect(result.author).toBe('123');
  });
});
```

### Frontend Testing
```javascript
// Component tests
import { render, screen, fireEvent } from '@testing-library/react';
import { BaseModal } from '../BaseModal';

describe('BaseModal', () => {
  test('should close on escape key', () => {
    const onClose = jest.fn();
    render(<BaseModal isOpen onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
```

### Running Tests
```bash
# Backend tests
cd backend && npm test
npm run test:watch
npm run test:coverage

# Frontend tests
cd frontend && npm test
npm run test:ui
npm run test:coverage
```

## 🔧 Development Tools

### Recommended VS Code Extensions
- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code formatter**
- **ESLint**
- **Auto Rename Tag**
- **Bracket Pair Colorizer**
- **GitLens**
- **Thunder Client** (API testing)

### Browser DevTools
- **React Developer Tools**
- **Redux DevTools** (if using Redux)
- **MongoDB Compass** (database GUI)

### Useful Commands
```bash
# Development
npm run dev:backend     # Start backend with nodemon
npm run dev:frontend    # Start frontend with Vite
npm run dev:both        # Start both servers

# Testing
npm run test           # Run tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report

# Documentation
npm run storybook      # Component documentation
npm run build-storybook # Build static docs

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix auto-fixable issues
npm run format         # Run Prettier
```

## 📚 Learning Resources

### Project-Specific Documentation
- **[API Documentation](http://localhost:5001/api-docs)** - Interactive API docs
- **[Component Library](http://localhost:6006)** - Storybook documentation
- **[Architecture Decisions](./architecture/README.md)** - ADRs and design decisions

### External Resources
- **[React Documentation](https://reactjs.org/docs)**
- **[Express.js Guide](https://expressjs.com/)**
- **[MongoDB Manual](https://docs.mongodb.com/manual/)**
- **[Testing Library](https://testing-library.com/docs/)**

## 🚨 Common Gotchas

### Environment Variables
- Backend uses `.env` files for configuration
- Frontend uses `VITE_` prefix for environment variables
- Never commit `.env` files to version control

### Database Connections
- Ensure MongoDB is running before starting backend
- Check connection strings in environment variables
- Use MongoDB Compass for database inspection

### CORS Issues
- Frontend and backend run on different ports
- CORS is configured in backend middleware
- Check browser console for CORS errors

### File Uploads
- Files are stored in `backend/uploads/` directory
- Ensure proper file permissions
- Check file size limits in configuration

## 🆘 Getting Help

### Internal Resources
- **Team Chat**: [Slack/Discord channel]
- **Code Reviews**: Create PR for feedback
- **Documentation**: Check docs/ directory first

### Debugging Tips
1. **Check browser console** for frontend errors
2. **Check backend logs** for API errors
3. **Use debugger statements** for step-through debugging
4. **Test API endpoints** with Thunder Client or Postman
5. **Check database state** with MongoDB Compass

### Common Issues
- **Port conflicts**: Change ports in environment variables
- **Module not found**: Run `npm install` in correct directory
- **Database connection**: Verify MongoDB is running
- **Authentication errors**: Check JWT token validity

## 🎯 Next Steps

### Week 1: Getting Familiar
- [ ] Complete environment setup
- [ ] Read through Architecture Decision Records
- [ ] Explore the component library in Storybook
- [ ] Review API documentation
- [ ] Make your first small contribution (documentation fix, minor bug)

### Week 2: First Feature
- [ ] Pick up a "good first issue" from the backlog
- [ ] Follow the development workflow
- [ ] Write tests for your changes
- [ ] Submit your first pull request

### Week 3: Deep Dive
- [ ] Understand the service layer pattern
- [ ] Learn the custom hooks architecture
- [ ] Contribute to shared components
- [ ] Help improve documentation

### Month 1: Full Contributor
- [ ] Lead a feature development
- [ ] Mentor newer team members
- [ ] Contribute to architectural decisions
- [ ] Help with code reviews

## 📊 Performance Benchmarks

Understanding the performance characteristics helps with development:

### Backend Performance
- **API Response Time**: 50-500ms (target)
- **Database Query Time**: <100ms (target)
- **File Upload**: Up to 10MB files supported
- **Concurrent Users**: Tested up to 100 concurrent

### Frontend Performance
- **Initial Load**: <3 seconds
- **Component Render**: <16ms (60fps)
- **Bundle Size**: <500KB gzipped
- **Lighthouse Score**: 90+ (target)

## 🔐 Security Considerations

### Authentication & Authorization
- JWT tokens with 1-hour expiry
- Refresh tokens for session management
- Role-based access control (viewer, editor, admin)
- Rate limiting on all endpoints

### Data Protection
- Input validation on all endpoints
- SQL injection prevention
- XSS protection with CSP headers
- File upload restrictions and scanning

### Best Practices
- Never log sensitive data
- Use environment variables for secrets
- Validate all user inputs
- Follow OWASP security guidelines

---

**Welcome to the team!** 🎉

This guide should get you started, but don't hesitate to ask questions. The codebase is well-documented, and the team is here to help you succeed.

For immediate help:
- 📖 Check the [Architecture Documentation](./architecture/README.md)
- 🔧 Browse the [API Documentation](http://localhost:5001/api-docs)
- 🎨 Explore the [Component Library](http://localhost:6006)
- 💬 Ask in the team chat
- 🐛 Create an issue for bugs or questions
