/*
 * @name uploadMid
 * @file /docman/backend/src/middleware/uploadMid.js
 * @middleware uploadMid
 * @description File upload middleware for handling multipart form data and file validation
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Ensure uploads folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed file types with their MIME types and extensions
const ALLOWED_FILE_TYPES = {
    // Documents
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],

    // Images
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],

    // Archives (be cautious with these)
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar'],
    'application/x-7z-compressed': ['.7z']
};

// Maximum file sizes by category (in bytes)
const MAX_FILE_SIZES = {
    document: 10 * 1024 * 1024, // 10MB for documents
    image: 5 * 1024 * 1024,     // 5MB for images
    archive: 50 * 1024 * 1024   // 50MB for archives
};

// Get file category based on MIME type
const getFileCategory = (mimetype) => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z')) return 'archive';
    return 'document';
};

// File filter function for security
const fileFilter = (req, file, cb) => {
    try {
        // Check if MIME type is allowed
        if (!ALLOWED_FILE_TYPES[file.mimetype]) {
            return cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: PDF, Word, Excel, PowerPoint, images, and text files.`), false);
        }

        // Get file extension from original name
        const fileExt = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ALLOWED_FILE_TYPES[file.mimetype];

        // Check if extension matches MIME type
        if (!allowedExtensions.includes(fileExt)) {
            return cb(new Error(`File extension ${fileExt} does not match the detected file type.`), false);
        }

        // Check for suspicious file names
        const suspiciousPatterns = [
            /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)$/i,
            /\.\w+\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)$/i, // Double extensions
            /%00/, // Null byte injection
            /\.\./  // Directory traversal
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
            return cb(new Error('Suspicious file name detected.'), false);
        }

        cb(null, true);
    } catch (error) {
        cb(new Error('File validation error.'), false);
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate secure random filename to prevent conflicts and directory traversal
        const randomName = crypto.randomBytes(16).toString('hex');
        const fileExt = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${randomName}${fileExt}`;
        cb(null, uniqueName);
    },
});

// Create multer instance with security configurations
const uploadMid = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: Math.max(...Object.values(MAX_FILE_SIZES)), // Use the largest limit, we'll check specific limits in fileFilter
        files: 1, // Only allow one file at a time
        fields: 20, // Limit number of form fields
        fieldNameSize: 100, // Limit field name size
        fieldSize: 1024 * 1024 // 1MB limit for field values
    }
});

// Enhanced error handling middleware
export const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    message: 'File too large. Maximum size is 50MB.'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    message: 'Too many files. Only one file allowed per upload.'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    message: 'Unexpected file field.'
                });
            default:
                return res.status(400).json({
                    message: 'File upload error: ' + error.message
                });
        }
    } else if (error) {
        return res.status(400).json({
            message: error.message || 'File upload failed.'
        });
    }
    next();
};

export default uploadMid;

