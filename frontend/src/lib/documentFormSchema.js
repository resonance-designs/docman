/*
 * @name documentFormSchema
 * @file /docman/frontend/src/lib/documentFormSchema.js
 * @module documentFormSchema
 * @description Shared validation schemas and constants for document forms
 * @author Richard Bakos
 * @version 2.1.10
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
    opensForReview: z.date({ required_error: "Opens for review date is required" }),
    reviewInterval: z.enum(['monthly', 'quarterly', 'semiannually', 'annually', 'custom'], {
        required_error: "Review interval is required"
    }),
    reviewIntervalDays: z.number().min(1, "Custom interval must be at least 1 day").nullable().optional(),
    reviewPeriod: z.enum(['1week', '2weeks', '3weeks', '1month'], {
        required_error: "Review period is required"
    }),
    lastReviewedOn: z.date().nullable().optional(),
    nextReviewDueOn: z.date().nullable().optional(),
    stakeholders: z.array(z.string()).optional(),
    owners: z.array(z.string()).optional(),
    // Review assignments
    reviewAssignees: z.array(z.string()).optional(),
    reviewDueDate: z.date().nullable().optional(),
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
}).refine((data) => {
    // If reviewInterval is 'custom', reviewIntervalDays must be provided
    if (data.reviewInterval === 'custom' && (!data.reviewIntervalDays || data.reviewIntervalDays < 1)) {
        return false;
    }
    return true;
}, {
    message: "Custom interval days is required when review interval is set to custom",
    path: ["reviewIntervalDays"]
});

// Edit document schema (file is optional)
export const editDocumentSchema = z.object({
    ...baseDocumentSchema,
    file: fileValidation,
}).refine((data) => {
    // If reviewInterval is 'custom', reviewIntervalDays must be provided
    if (data.reviewInterval === 'custom' && (!data.reviewIntervalDays || data.reviewIntervalDays < 1)) {
        return false;
    }
    return true;
}, {
    message: "Custom interval days is required when review interval is set to custom",
    path: ["reviewIntervalDays"]
});

// Default form values
export const defaultFormValues = {
    title: "",
    author: "",
    description: "",
    category: "",
    opensForReview: null,
    reviewInterval: "quarterly",
    reviewIntervalDays: null,
    reviewPeriod: "2weeks",
    lastReviewedOn: null,
    nextReviewDueOn: null,
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
    opensForReview: {
        label: "Opens For Review",
        type: "date",
        required: true,
        placeholder: "Select when document opens for review"
    },
    reviewInterval: {
        label: "Review Interval",
        type: "select",
        required: true,
        options: [
            { value: "monthly", label: "Monthly" },
            { value: "quarterly", label: "Quarterly" },
            { value: "semiannually", label: "Semiannually" },
            { value: "annually", label: "Annually" },
            { value: "custom", label: "Custom" }
        ]
    },
    reviewIntervalDays: {
        label: "Custom Interval (Days)",
        type: "number",
        required: false,
        placeholder: "Enter number of days"
    },
    reviewPeriod: {
        label: "Review Period",
        type: "select",
        required: true,
        options: [
            { value: "1week", label: "1 Week" },
            { value: "2weeks", label: "2 Weeks" },
            { value: "3weeks", label: "3 Weeks" },
            { value: "1month", label: "1 Month" }
        ]
    },
    lastReviewedOn: {
        label: "Last Reviewed On",
        type: "date",
        required: false,
        disabled: true
    },
    nextReviewDueOn: {
        label: "Next Review Due On",
        type: "date",
        required: false,
        disabled: true
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
