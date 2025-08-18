/*
 * @name usersController
 * @file /docman/backend/src/controllers/usersController.js
 * @controller usersController
 * @description User management controller for CRUD operations, profile updates, and user administration
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import bcrypt from "bcrypt";
import * as userService from "../services/userService.js";
import {
    validateName,
    validateEmail,
    validatePassword,
    validatePhone,
    validateTitle,
    validateRole,
    sanitizeString,
    sanitizeEmail
} from "../lib/validation.js";

/**
 * Get all users with optional filtering and sorting
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of users or error message
 */
export async function getAllUsers(req, res) {
    try {
        const result = await userService.getUsers(req.query, req.user);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching users:", error);
        const statusCode = error.message.includes("Access denied") ? 403 : 500;
        res.status(statusCode).json({
            message: error.message || "Failed to retrieve users"
        });
    }
}

/**
 * Get a specific user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user data or error message
 */
export async function getUserById(req, res) {
    try {
        const user = await userService.getUserById(req.params.id, req.user);
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        const statusCode = error.message.includes("not found") ? 404 :
                          error.message.includes("Access denied") ? 403 : 500;
        res.status(statusCode).json({
            message: error.message || "Failed to retrieve user"
        });
    }
}

/**
 * Update user information (users can update themselves, admins can update anyone)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated user data or error message
 */
export async function updateUser(req, res) {
    try {
        const updatedUser = await userService.updateUser(req.params.id, req.body, req.user);
        res.status(200).json({
            message: "User updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error updating user:", error);
        const statusCode = error.message.includes("not found") ? 404 :
                          error.message.includes("Access denied") ? 403 :
                          error.message.includes("Validation failed") ? 400 :
                          error.message.includes("Email already in use") ? 409 : 500;
        res.status(statusCode).json({
            message: error.message || "Failed to update user"
        });
    }
}

/**
 * Delete a user (only admins can delete users)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function deleteUser(req, res) {
    try {
        await userService.deleteUser(req.params.id, req.user);
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        const statusCode = error.message.includes("not found") ? 404 :
                          error.message.includes("Insufficient permissions") ? 403 :
                          error.message.includes("Cannot delete your own account") ? 400 : 500;
        res.status(statusCode).json({
            message: error.message || "Failed to delete user"
        });
    }
}
