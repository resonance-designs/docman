// controllers/usersController.js
import User from "../models/User.js";

export async function getAllUsers(req, res) {
    try {
        // Fetch _id, firstname, lastname, and email
        const users = await User.find({}, "_id firstname lastname email").sort({ firstname: 1 });
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
