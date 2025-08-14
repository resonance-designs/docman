// controllers/usersController.js
import User from "../models/User.js";
import bcrypt from "bcrypt";
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

export async function getAllUsers(req, res) {
    try {
        const {
            search,
            role,
            sortBy = 'firstname',
            sortOrder = 'asc'
        } = req.query;

        // Build filter object
        const filter = {};

        // Search filter - search in firstname, lastname, email, and username
        if (search) {
            filter.$or = [
                { firstname: { $regex: search, $options: 'i' } },
                { lastname: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        // Role filter
        if (role) {
            filter.role = role;
        }

        // Build sort object
        const validSortFields = ['firstname', 'lastname', 'email', 'role', 'createdAt'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'firstname';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const sortObj = { [sortField]: sortDirection };

        // Fetch users with filtering and sorting
        const users = await User.find(filter, "_id firstname lastname email role profilePicture backgroundImage createdAt").sort(sortObj);
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getUserById(req, res) {
    try {
        const user = await User.findById(req.params.id, "_id firstname lastname email telephone title department bio role profilePicture backgroundImage theme createdAt updatedAt");
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function updateUser(req, res) {
    try {
        console.log("Update user request received");
        console.log("Request body:", req.body);

        console.log("Current user ID:", req.user._id.toString());
        console.log("Current user role:", req.user.role);

        const { firstname, lastname, email, telephone, title, department, bio, password, role, theme } = req.body;
        const userId = req.params.id;
        console.log("User ID from params:", req.params.id);
        const currentUserId = req.user._id.toString();
        const currentUserRole = req.user.role;

        // Validation
        const validationErrors = [];

        if (userId === currentUserId) {
            // Validate fields for self-editing
            if (firstname !== undefined) {
                const firstnameError = validateName(firstname, "First name");
                if (firstnameError) validationErrors.push({ field: "firstname", message: firstnameError });
            }

            if (lastname !== undefined) {
                const lastnameError = validateName(lastname, "Last name");
                if (lastnameError) validationErrors.push({ field: "lastname", message: lastnameError });
            }

            if (email !== undefined) {
                const emailError = validateEmail(email);
                if (emailError) validationErrors.push({ field: "email", message: emailError });
            }

            if (telephone !== undefined) {
                const phoneError = validatePhone(telephone);
                if (phoneError) validationErrors.push({ field: "telephone", message: phoneError });
            }

            if (title !== undefined) {
                const titleError = validateTitle(title);
                if (titleError) validationErrors.push({ field: "title", message: titleError });
            }

            if (department !== undefined) {
                const departmentError = validateTitle(department); // Use same validation as title
                if (departmentError) validationErrors.push({ field: "department", message: departmentError });
            }

            if (bio !== undefined) {
                if (bio.length > 500) {
                    validationErrors.push({ field: "bio", message: "Bio must be 500 characters or less" });
                }
            }
        } else if (currentUserRole === "admin") {
            // Validate role for admin editing
            if (role !== undefined) {
                const roleError = validateRole(role);
                if (roleError) validationErrors.push({ field: "role", message: roleError });
            }
        }

        // Validate password if provided
        if (password !== undefined) {
            const passwordError = validatePassword(password);
            if (passwordError) validationErrors.push({ field: "password", message: passwordError });
        }

        // Return validation errors if any
        console.log("Validation errors:", validationErrors);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationErrors.reduce((acc, error) => {
                    acc[error.field] = error.message;
                    return acc;
                }, {})
            });
        }

        console.log("Checking if user exists with ID:", userId);
        // Check if user exists
        const user = await User.findById(userId);
        console.log("User found:", user);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        console.log("Authorization check - userId:", userId, "currentUserId:", currentUserId, "currentUserRole:", currentUserRole);
        // Authorization check: users can only edit themselves, admins can edit anyone
        if (userId !== currentUserId && currentUserRole !== "admin") {
            return res.status(403).json({ message: "You can only edit your own profile." });
        }

        // Prepare update data based on who is editing
        const updateData = {};

        if (userId === currentUserId) {
            // User editing their own profile - can edit all fields except role
            if (firstname !== undefined) updateData.firstname = sanitizeString(firstname);
            if (lastname !== undefined) updateData.lastname = sanitizeString(lastname);
            if (email !== undefined) updateData.email = sanitizeEmail(email);
            if (telephone !== undefined) updateData.telephone = sanitizeString(telephone);
            if (title !== undefined) updateData.title = sanitizeString(title);
            if (department !== undefined) updateData.department = sanitizeString(department);
            if (bio !== undefined) updateData.bio = sanitizeString(bio);
            if (theme !== undefined) updateData.theme = theme;
        } else if (currentUserRole === "admin") {
            // Admin editing another user - can only edit role and password
            if (role !== undefined) updateData.role = role;
        }

        // Handle password update (both self and admin can update passwords)
        if (password) {
            updateData.password = await bcrypt.hash(password, 12);
        }

        console.log("Checking email uniqueness - email:", email, "user.email:", user.email);
        // Check for email uniqueness if email is being changed
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            console.log("Existing user with same email:", existingUser);
            if (existingUser) {
                return res.status(409).json({ message: "Email already in use." });
            }
        }

        console.log("Update data being sent to database:", updateData);

        // Add last updated by field
        updateData.lastUpdatedBy = currentUserId;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, select: "_id firstname lastname email telephone title department bio role profilePicture backgroundImage theme createdAt updatedAt lastUpdatedBy" }
        );

        console.log("Updated user:", updatedUser);

        console.log("User updated successfully:", updatedUser);
        res.status(200).json({
            message: "User updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function deleteUser(req, res) {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ message: "User not found." });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
