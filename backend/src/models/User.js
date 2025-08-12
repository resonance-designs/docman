import mongoose from "mongoose";
import bcrypt from "bcrypt";

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
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        refreshTokenHash: { type: String },
    },
    { timestamps: true } // createdAt and updatedAt fields
);

userSchema.pre("save", async function(next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

const User = mongoose.model("User", userSchema);

export default User;


