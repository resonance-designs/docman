/*
 * @name swagger
 * @file /docman/backend/src/config/swagger.js
 * @module swagger
 * @description OpenAPI/Swagger configuration for comprehensive API documentation
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Swagger/OpenAPI configuration options
 */
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'DocMan API',
            version: '1.1.10',
            description: 'Comprehensive Document Management System API',
            contact: {
                name: 'Richard Bakos',
                email: 'support@docman.com'
            },
            license: {
                name: 'UNLICENSED',
                url: 'https://docman.com/license'
            }
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:5001/api',
                description: 'Development server'
            },
            {
                url: 'https://api.docman.com/api',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token for authentication'
                }
            },
            schemas: {
                // User schemas
                User: {
                    type: 'object',
                    required: ['firstname', 'lastname', 'email', 'username', 'password'],
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'User ID',
                            example: '507f1f77bcf86cd799439011'
                        },
                        firstname: {
                            type: 'string',
                            description: 'User first name',
                            example: 'John'
                        },
                        lastname: {
                            type: 'string',
                            description: 'User last name',
                            example: 'Doe'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address',
                            example: 'john.doe@example.com'
                        },
                        username: {
                            type: 'string',
                            description: 'Unique username',
                            example: 'johndoe'
                        },
                        role: {
                            type: 'string',
                            enum: ['viewer', 'editor', 'admin'],
                            description: 'User role',
                            example: 'editor'
                        },
                        isActive: {
                            type: 'boolean',
                            description: 'User active status',
                            example: true
                        },
                        department: {
                            type: 'string',
                            description: 'User department',
                            example: 'Engineering'
                        },
                        profilePicture: {
                            type: 'string',
                            description: 'Profile picture URL',
                            example: '/uploads/profiles/user123.jpg'
                        },
                        theme: {
                            type: 'string',
                            description: 'User theme preference',
                            example: 'dark'
                        },
                        bio: {
                            type: 'string',
                            description: 'User biography',
                            example: 'Software engineer with 5 years experience'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'User creation timestamp'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'User last update timestamp'
                        }
                    }
                },
                
                // Document schemas
                Document: {
                    type: 'object',
                    required: ['title', 'author', 'category'],
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Document ID',
                            example: '507f1f77bcf86cd799439011'
                        },
                        title: {
                            type: 'string',
                            description: 'Document title',
                            example: 'Project Requirements Document'
                        },
                        description: {
                            type: 'string',
                            description: 'Document description',
                            example: 'Detailed requirements for the new project'
                        },
                        author: {
                            $ref: '#/components/schemas/User'
                        },
                        category: {
                            $ref: '#/components/schemas/Category'
                        },
                        stakeholders: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/User'
                            },
                            description: 'Document stakeholders'
                        },
                        owners: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/User'
                            },
                            description: 'Document owners'
                        },
                        reviewDate: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Next review date'
                        },
                        reviewCompleted: {
                            type: 'boolean',
                            description: 'Review completion status',
                            example: false
                        },
                        reviewCompletedBy: {
                            $ref: '#/components/schemas/User'
                        },
                        reviewCompletedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Review completion timestamp'
                        },
                        currentVersion: {
                            type: 'number',
                            description: 'Current document version',
                            example: 1
                        },
                        versionHistory: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    version: { type: 'number' },
                                    label: { type: 'string' },
                                    uploadedAt: { type: 'string', format: 'date-time' },
                                    uploadedBy: { $ref: '#/components/schemas/User' },
                                    changelog: { type: 'string' }
                                }
                            }
                        },
                        externalContacts: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    email: { type: 'string', format: 'email' },
                                    phoneNumber: { type: 'string' },
                                    type: { $ref: '#/components/schemas/ExternalContactType' }
                                }
                            }
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Document creation timestamp'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Document last update timestamp'
                        }
                    }
                },
                
                // Category schema
                Category: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Category ID',
                            example: '507f1f77bcf86cd799439011'
                        },
                        name: {
                            type: 'string',
                            description: 'Category name',
                            example: 'Technical Documentation'
                        },
                        description: {
                            type: 'string',
                            description: 'Category description',
                            example: 'Technical specifications and documentation'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Category creation timestamp'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Category last update timestamp'
                        }
                    }
                },
                
                // File schema
                File: {
                    type: 'object',
                    required: ['filename', 'originalname', 'path', 'mimetype', 'size', 'documentId'],
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'File ID',
                            example: '507f1f77bcf86cd799439011'
                        },
                        filename: {
                            type: 'string',
                            description: 'Stored filename',
                            example: 'doc_1234567890.pdf'
                        },
                        originalname: {
                            type: 'string',
                            description: 'Original filename',
                            example: 'requirements.pdf'
                        },
                        path: {
                            type: 'string',
                            description: 'File storage path',
                            example: '/uploads/documents/doc_1234567890.pdf'
                        },
                        mimetype: {
                            type: 'string',
                            description: 'File MIME type',
                            example: 'application/pdf'
                        },
                        size: {
                            type: 'number',
                            description: 'File size in bytes',
                            example: 1048576
                        },
                        documentId: {
                            type: 'string',
                            description: 'Associated document ID',
                            example: '507f1f77bcf86cd799439011'
                        },
                        version: {
                            type: 'number',
                            description: 'File version number',
                            example: 1
                        },
                        versionLabel: {
                            type: 'string',
                            description: 'Version label',
                            example: 'Initial Version'
                        },
                        uploadedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'File upload timestamp'
                        },
                        uploadedBy: {
                            $ref: '#/components/schemas/User'
                        },
                        changelog: {
                            type: 'string',
                            description: 'Version changelog',
                            example: 'Initial document upload'
                        }
                    }
                },
                
                // Error schema
                Error: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Error message',
                            example: 'Resource not found'
                        },
                        error: {
                            type: 'string',
                            description: 'Detailed error information',
                            example: 'Document with ID 507f1f77bcf86cd799439011 not found'
                        },
                        statusCode: {
                            type: 'number',
                            description: 'HTTP status code',
                            example: 404
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: [
        './src/routes/*.js',
        './src/controllers/*.js',
        './src/models/*.js'
    ]
};

/**
 * Generate Swagger specification
 */
export const specs = swaggerJsdoc(options);

/**
 * Swagger UI options
 */
export const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        requestInterceptor: (req) => {
            // Add any request interceptors here
            return req;
        }
    },
    customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; }
    `,
    customSiteTitle: 'DocMan API Documentation'
};

export { swaggerUi };
