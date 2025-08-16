// Script to update descriptions in comment headers for files that still have generic descriptions
// Usage: node update-descriptions.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_SRC_DIR = path.join(__dirname, 'frontend', 'src');
const BACKEND_SRC_DIR = path.join(__dirname, 'backend', 'src');

// Mapping of file patterns to better descriptions
const descriptionMappings = {
  // Frontend Pages
  'RegUserPage.jsx': 'User registration page with form validation and account creation functionality',
  'ResetPassPage.jsx': 'Password reset page for updating user passwords with secure token validation',
  'MyProfilePage.jsx': 'User profile management page for updating personal information and preferences',
  'ViewUserPage.jsx': 'User detail page displaying user information and administrative actions',
  'ViewCatsPage.jsx': 'Category management page for viewing, creating, and organizing document categories',
  'CreateCatPage.jsx': 'Category creation page with form for adding new document categories',
  'ViewPage.jsx': 'Document review page for viewing documents that need review and approval',
  'SystemInfoPage.jsx': 'System information dashboard displaying server status, database info, and application metrics',
  'CustomChartsPage.jsx': 'Custom analytics page for creating and viewing personalized data visualizations',
  'CreateProjectPage.jsx': 'Project creation page with form for setting up new projects and team assignments',
  'EditProjectPage.jsx': 'Project editing page for updating project details, status, and team members',
  'ProjectDetailPage.jsx': 'Project detail page showing project information, documents, and team collaboration',
  'TeamDetailPage.jsx': 'Team detail page displaying team members, projects, and collaboration tools',
  'EditTeamPage.jsx': 'Team editing page for updating team information and managing member roles',
  'ManageExternalContactTypesPage.jsx': 'External contact type management page for organizing contact categories',

  // Frontend Components
  'PaginatedDocTable.jsx': 'Paginated table component for displaying documents with sorting, filtering, and bulk actions',
  'PaginatedUserTable.jsx': 'Paginated table component for displaying users with administrative controls and filtering',
  'CatTable.jsx': 'Category table component for displaying and managing document categories',
  'DocsNotFound.jsx': 'Empty state component displayed when no documents are found with call-to-action',
  'Footer.jsx': 'Application footer component with copyright information and company branding',
  'RateLimitedUI.jsx': 'Rate limit notification component displayed when API request limits are exceeded',
  'ProtectedRoutes.jsx': 'Route protection component for handling authentication and authorization',
  'NotificationBell.jsx': 'Notification bell component with dropdown for displaying user notifications',

  // Filter Components
  'DateRangeFilter.jsx': 'Date range filter component with calendar picker for filtering by date periods',
  'DropdownFilter.jsx': 'Dropdown filter component with search functionality for selecting filter options',
  'SortableHeader.jsx': 'Sortable table header component with visual indicators for column sorting',

  // Team Components
  'CreateTeamModal.jsx': 'Modal component for creating new teams with form validation and member invitation',
  'InviteMemberModal.jsx': 'Modal component for inviting new members to teams with role assignment',

  // Project Components
  'ProjectCard.jsx': 'Project card component displaying project summary, status, priority, and quick actions',

  // Frontend Utilities
  'axios.js': 'Axios HTTP client configuration with base URL, interceptors, and authentication headers',
  'validation.js': 'Form validation utilities with comprehensive validation rules and error handling',
  'globalUtils.js': 'Global utility functions for common operations across the application',
  'themes.js': 'Theme configuration and utilities for managing application appearance and styling',

  // Context and Hooks
  'useAutoLogout.jsx': 'Custom hook for automatic user logout on inactivity with configurable timeout',

  // Backend Controllers
  'categoriesController.js': 'Category management controller for CRUD operations on document categories',
  'teamsController.js': 'Team management controller for team operations, member management, and invitations',
  'projectsController.js': 'Project management controller for project CRUD operations and team assignments',
  'analyticsController.js': 'Analytics controller for generating reports, charts, and system metrics',
  'systemController.js': 'System information controller for server status, health checks, and diagnostics',
  'notificationsController.js': 'Notification management controller for user notifications and alerts',
  'uploadFileController.js': 'File upload controller for handling document file uploads and version management',
  'profilePictureController.js': 'Profile picture management controller for user avatar uploads and updates',
  'externalContactsController.js': 'External contact management controller for organizing external stakeholders',
  'customChartsController.js': 'Custom chart controller for creating and managing personalized analytics',
  'reviewController.js': 'Document review controller for managing review workflows and approvals',

  // Backend Models
  'Category.js': 'Category model schema for organizing documents into logical groups and hierarchies',
  'Project.js': 'Project model schema for organizing documents and teams into collaborative projects',
  'File.js': 'File model schema for storing document file metadata and version information',
  'BlacklistedToken.js': 'Blacklisted token model for managing invalidated JWT tokens and security',
  'ExternalContact.js': 'External contact model for managing stakeholders outside the organization',
  'ExternalContactType.js': 'External contact type model for categorizing external stakeholder relationships',
  'Notification.js': 'Notification model for managing user notifications and system alerts',
  'CustomChart.js': 'Custom chart model for storing user-defined analytics and visualizations',

  // Backend Routes
  'usersRoutes.js': 'User management routes for CRUD operations, profile updates, and administrative functions',
  'categoriesRoutes.js': 'Category management routes for organizing and managing document categories',
  'teamsRoutes.js': 'Team management routes for team operations, member management, and collaboration',
  'projectsRoutes.js': 'Project management routes for project operations and team assignments',
  'analyticsRoutes.js': 'Analytics routes for generating reports, metrics, and data visualizations',
  'systemRoutes.js': 'System information routes for health checks, status monitoring, and diagnostics',
  'uploadRoutes.js': 'File upload routes for handling document uploads and file management',
  'notificationsRoutes.js': 'Notification routes for managing user notifications and alerts',
  'externalContactsRoutes.js': 'External contact management routes for stakeholder organization',
  'customChartsRoutes.js': 'Custom chart routes for creating and managing personalized analytics',
  'reviewRoutes.js': 'Document review routes for managing review workflows and approvals',

  // Backend Middleware
  'requireRole.js': 'Role-based access control middleware for restricting routes by user permissions',
  'rateLimiter.js': 'Rate limiting middleware using Redis for preventing API abuse and ensuring fair usage',
  'uploadMid.js': 'File upload middleware for handling multipart form data and file validation',
  'authRateLimiter.js': 'Authentication rate limiting middleware for preventing brute force attacks',

  // Backend Config
  'db.js': 'Database connection configuration for MongoDB with support for local and Atlas deployments',
  'upstash.js': 'Upstash Redis configuration for rate limiting and caching with sliding window algorithm',

  // Backend Utilities
  'utils.js': 'Backend utility functions for object validation and common server-side operations',
  'emailService.js': 'Email service utilities for sending notifications, password resets, and system alerts'
};

console.log('Updating descriptions in comment headers...\n');

// Function to update description in a file
function updateFileDescription(filePath) {
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return;
  
  try {
    const fileName = path.basename(filePath);
    const newDescription = descriptionMappings[fileName];
    
    if (!newDescription) {
      console.log(`⏭️  Skipping ${path.relative(__dirname, filePath)} - No description mapping found`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has a comment header
    if (!content.trim().startsWith('/*')) {
      console.log(`⏭️  Skipping ${path.relative(__dirname, filePath)} - No comment header found`);
      return;
    }
    
    // Update the description line
    const originalContent = content;
    content = content.replace(/(\*\s*@description\s+).*$/m, `$1${newDescription}`);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${path.relative(__dirname, filePath)}`);
      console.log(`   New description: ${newDescription}`);
    } else {
      console.log(`⏭️  Skipping ${path.relative(__dirname, filePath)} - No @description field found or already updated`);
    }
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Function to recursively process directory
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      processDirectory(itemPath);
    } else if (stat.isFile() && (item.endsWith('.jsx') || item.endsWith('.js'))) {
      updateFileDescription(itemPath);
    }
  });
}

// Run the description update
processDirectory(FRONTEND_SRC_DIR);
processDirectory(BACKEND_SRC_DIR);
console.log('\nDescription update completed!');
