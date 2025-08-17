/*
 * @name Hooks Index
 * @file /docman/frontend/src/hooks/index.js
 * @description Centralized export for all custom React hooks
 * @author Richard Bakos
 * @version 2.0.2
 * @license UNLICENSED
 */

// Authentication & User Management
export { default as useAutoLogout } from "./useAutoLogout";
export { useUserRole } from "./useUserRole";

// Form Management
export { useStakeholderManagement } from "./useStakeholderManagement";
export { useExternalContacts } from "./useExternalContacts";
export { useReviewManagement } from "./useReviewManagement";
export { useFormData } from "./useFormData";

// File & Upload Management
export { useFileUpload } from "./useFileUpload";

// Document Management
export { useDocument } from "./useDocument";

// API & Data Management
export { useApi } from "./useApi";
