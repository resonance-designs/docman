/*
 * @name update-superadmin
 * @file /docman/update-superadmin.js
 * @script update-superadmin
 * @description Script to update the user with resonance.designs.com@gmail.com to superadmin role
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.dev' });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.prod' });
} else {
    dotenv.config(); // Loads .env by default
}

// User schema (simplified for this script)
const userSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    email: String,
    username: String,
    password: String,
    role: {
        type: String,
        enum: ["superadmin", "admin", "editor", "viewer"],
        default: "viewer"
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

async function updateSuperAdmin() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/docman";
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Find and update the user
        const email = "resonance.designs.com@gmail.com";
        const user = await User.findOne({ email: email });

        if (!user) {
            console.log(`❌ User with email ${email} not found`);
            process.exit(1);
        }

        console.log(`📧 Found user: ${user.firstname} ${user.lastname} (${user.email})`);
        console.log(`🔒 Current role: ${user.role}`);

        // Update role to superadmin
        user.role = "superadmin";
        await user.save();

        console.log(`✅ Successfully updated user role to: ${user.role}`);
        console.log(`🎉 User ${user.email} is now a Super Admin!`);

    } catch (error) {
        console.error("❌ Error updating user role:", error);
        process.exit(1);
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log("🔌 Disconnected from MongoDB");
        process.exit(0);
    }
}

// Run the script
updateSuperAdmin();