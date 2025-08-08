import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
    {
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
        resetPasswordToken: String,
        resetPasswordExpires: Date,
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
