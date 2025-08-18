/*
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import User from "../models/User.js";
import fs from "fs";
import path from "path";

/**
 * Upload a profile picture for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with upload status or error message
 */
export async function uploadProfilePicture(req, res) {
    try {
        const userId = req.params.id;
        const currentUserId = req.user.id;
        const currentUserRole = req.user.role;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Authorization check: users can only upload their own profile picture, admins can upload for anyone
        if (userId !== currentUserId && currentUserRole !== "admin") {
            return res.status(403).json({ message: "You can only upload your own profile picture." });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            // Delete the uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                message: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
            });
        }

        // Validate file size (2MB = 2 * 1024 * 1024 bytes)
        const maxSize = 2 * 1024 * 1024;
        if (req.file.size > maxSize) {
            // Delete the uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                message: "File size too large. Maximum size is 2MB." 
            });
        }

        // Delete old profile picture if it exists
        if (user.profilePicture) {
            const oldPicturePath = path.join(process.cwd(), 'uploads', user.profilePicture);
            if (fs.existsSync(oldPicturePath)) {
                fs.unlinkSync(oldPicturePath);
            }
        }

        // Update user with new profile picture filename
        const filename = req.file.filename;
        user.profilePicture = filename;
        await user.save();

        res.status(200).json({ 
            message: "Profile picture uploaded successfully",
            profilePicture: filename,
            url: `/uploads/${filename}`
        });
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        
        // Clean up uploaded file if there was an error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Delete a user's profile picture
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with deletion status or error message
 */
export async function deleteProfilePicture(req, res) {
    try {
        const userId = req.params.id;
        const currentUserId = req.user.id;
        const currentUserRole = req.user.role;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Authorization check: users can only delete their own profile picture, admins can delete for anyone
        if (userId !== currentUserId && currentUserRole !== "admin") {
            return res.status(403).json({ message: "You can only delete your own profile picture." });
        }

        // Check if user has a profile picture
        if (!user.profilePicture) {
            return res.status(400).json({ message: "No profile picture to delete." });
        }

        // Delete the file from filesystem
        const picturePath = path.join(process.cwd(), 'uploads', user.profilePicture);
        if (fs.existsSync(picturePath)) {
            fs.unlinkSync(picturePath);
        }

        // Remove profile picture from user record
        user.profilePicture = null;
        await user.save();

        res.status(200).json({ message: "Profile picture deleted successfully" });
    } catch (error) {
        console.error("Error deleting profile picture:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Upload a background image for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with upload status or error message
 */
export async function uploadBackgroundImage(req, res) {
    try {
        const userId = req.params.id;
        const currentUserId = req.user.id;
        const currentUserRole = req.user.role;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Authorization check: users can only upload their own background image, admins can upload for anyone
        if (userId !== currentUserId && currentUserRole !== "admin") {
            return res.status(403).json({ message: "You can only upload your own background image." });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            // Delete the uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                message: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
            });
        }

        // Validate file size (5MB = 5 * 1024 * 1024 bytes)
        const maxSize = 5 * 1024 * 1024;
        if (req.file.size > maxSize) {
            // Delete the uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                message: "File size too large. Maximum size is 5MB."
            });
        }

        // Delete old background image if it exists
        if (user.backgroundImage) {
            const oldImagePath = path.join(process.cwd(), 'uploads', user.backgroundImage);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Update user with new background image filename
        const filename = req.file.filename;
        user.backgroundImage = filename;
        await user.save();

        res.status(200).json({
            message: "Background image uploaded successfully",
            backgroundImage: filename,
            url: `/uploads/${filename}`
        });
    } catch (error) {
        console.error("Error uploading background image:", error);

        // Clean up uploaded file if there was an error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Delete a user's background image
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with deletion status or error message
 */
export async function deleteBackgroundImage(req, res) {
    try {
        const userId = req.params.id;
        const currentUserId = req.user.id;
        const currentUserRole = req.user.role;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Authorization check: users can only delete their own background image, admins can delete for anyone
        if (userId !== currentUserId && currentUserRole !== "admin") {
            return res.status(403).json({ message: "You can only delete your own background image." });
        }

        // Check if user has a background image
        if (!user.backgroundImage) {
            return res.status(400).json({ message: "No background image to delete." });
        }

        // Delete the file from filesystem
        const imagePath = path.join(process.cwd(), 'uploads', user.backgroundImage);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        // Remove background image from user record
        user.backgroundImage = null;
        await user.save();

        res.status(200).json({ message: "Background image deleted successfully" });
    } catch (error) {
        console.error("Error deleting background image:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
