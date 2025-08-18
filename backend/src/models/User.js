/*
 * @name User
 * @file /docman/backend/src/models/User.js
 * @model User
 * @description User model schema for authentication, profile management, and role-based access control
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import mongoose from "mongoose";
import bcrypt from "bcrypt";

/**
 * User schema for storing user account information and authentication data
 * @typedef {Object} UserSchema
 * @property {string} firstname - User's first name (required)
 * @property {string} lastname - User's last name (required)
 * @property {string} email - User's email address (required, unique)
 * @property {string} username - User's username (required, unique)
 * @property {string} password - User's hashed password (required)
 * @property {string} role - User's role: admin, editor, or viewer (default: viewer)
 * @property {string} telephone - User's phone number (optional)
 * @property {string} title - User's job title (optional)
 * @property {string} department - User's department (optional)
 * @property {string} profilePicture - URL to user's profile picture (optional)
 * @property {string} backgroundImage - URL to user's background image (optional)
 * @property {string} theme - User's preferred theme (default: current)
 * @property {string} bio - User's biography (optional, max 500 chars)
 * @property {string} resetPasswordToken - Token for password reset (optional)
 * @property {Date} resetPasswordExpires - Expiration date for password reset token (optional)
 * @property {string} refreshTokenHash - Hashed refresh token for authentication (optional)
 * @property {ObjectId} lastUpdatedBy - ID of user who last updated this record (optional)
 * @property {Date} createdAt - Timestamp when user was created (auto-generated)
 * @property {Date} updatedAt - Timestamp when user was last updated (auto-generated)
 */
const userSchema = new mongoose.Schema(
    {
        firstname: {
            type: String,
            required: [true, "Your first name is required"],
        },
        lastname: {
            type: String,
            required: [true, "Your last name is required"],
        },
        email: {
            type: String,
            required: [true, "Your email address is required"],
            unique: true,
        },
        username: {
            type: String,
            required: [true, "Your username is required"],
            unique: true,
        },
        password: {
            type: String,
            required: [true, "Your password is required"],
        },
        role: {
            type: String,
            enum: ["admin", "editor", "viewer"],
            default: "viewer", // New users are read-only by default
        },
        telephone: {
            type: String,
            required: false,
        },
        title: {
            type: String,
            required: false,
        },
        department: {
            type: String,
            required: false,
        },
        profilePicture: {
            type: String,
            required: false,
        },
        backgroundImage: {
            type: String,
            required: false,
        },
        theme: {
            type: String,
            required: false,
            default: "current",
        },
        bio: {
            type: String,
            required: false,
            maxlength: 500,
        },
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        refreshTokenHash: { type: String },
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
    },
    { timestamps: true } // createdAt and updatedAt fields
);

/**
 * Pre-save middleware to hash password before saving to database
 * Only hashes the password if it has been modified
 * @param {Function} next - Callback to continue with save operation
 */
userSchema.pre("save", async function(next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

/**
 * User model for managing user accounts and authentication
 * @type {mongoose.Model}
 */
const User = mongoose.model("User", userSchema);

export default User;


