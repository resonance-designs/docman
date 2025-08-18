/*
 * @name documentFormSchema
 * @file /docman/frontend/src/lib/documentFormSchema.js
 * @module documentFormSchema
 * @description Shared validation schemas and constants for document forms
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import { z } from "zod";

// File upload constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/html",
    "application/xml",
    "text/xml",
    "text/rtf",
    "text/plain",
    "text/markdown",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
];

// File validation refinements
const fileValidation = z
    .any()
    .optional()
    .refine(
        (f) => !f || f.length === 0 || f.length === 1,
        "Only one file allowed"
    )
    .refine(
        (f) => !f || !f[0] || ALLOWED_FILE_TYPES.includes(f[0].type),
        "Unsupported file type. Please upload a PDF, Word document, Excel spreadsheet, or image file."
    )
    .refine(
        (f) => !f || !f[0] || f[0].size <= MAX_FILE_SIZE,
        "File too large. Maximum size is 10MB."
    );

// Base document schema (shared fields)
const baseDocumentSchema = {
    title: z.string().min(1, { message: "Title is required" }),
    author: z.string().min(1, { message: "Author is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    category: z.string().min(1, { message: "Category is required" }),
    reviewDate: z.date({ required_error: "Review date is required" }),
    stakeholders: z.array(z.string()).optional(),
    owners: z.array(z.string()).optional(),
    // Review assignments
    reviewAssignees: z.array(z.string()).optional(),
    reviewDueDate: z.date().optional(),
    reviewNotes: z.string().optional(),
};

// Create document schema (file is required)
export const createDocumentSchema = z.object({
    ...baseDocumentSchema,
    file: z
        .any()
        .refine((f) => f && f.length > 0, "File is required")
        .refine(
            (f) => f && f.length === 1,
            "Only one file allowed"
        )
        .refine(
            (f) => f && f[0] && ALLOWED_FILE_TYPES.includes(f[0].type),
            "Unsupported file type. Please upload a PDF, Word document, Excel spreadsheet, or image file."
        )
        .refine(
            (f) => f && f[0] && f[0].size <= MAX_FILE_SIZE,
            "File too large. Maximum size is 10MB."
        ),
});

// Edit document schema (file is optional)
export const editDocumentSchema = z.object({
    ...baseDocumentSchema,
    file: fileValidation,
});

// Default form values
export const defaultFormValues = {
    title: "",
    author: "",
    description: "",
    category: "",
    reviewDate: null,
    stakeholders: [],
    owners: [],
    reviewAssignees: [],
    reviewNotes: "",
    file: undefined,
};

// Form field configurations
export const formFieldConfig = {
    title: {
        label: "Title",
        type: "text",
        required: true,
        placeholder: "Enter document title"
    },
    description: {
        label: "Description",
        type: "textarea",
        required: true,
        placeholder: "Enter document description"
    },
    reviewDate: {
        label: "Review Date",
        type: "date",
        required: true,
        placeholder: "Select review date"
    },
    author: {
        label: "Author",
        type: "select",
        required: true,
        placeholder: "Select an author"
    },
    category: {
        label: "Category",
        type: "select",
        required: true,
        placeholder: "Select a category"
    },
    file: {
        label: "File",
        type: "file",
        required: false, // Varies by form type
        accept: ALLOWED_FILE_TYPES.join(",")
    }
};
