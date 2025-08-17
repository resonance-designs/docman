/*
 * @name RegUserPage
 * @file /docman/frontend/src/pages/RegUserPage.jsx
 * @page RegUserPage
 * @description User registration page with form validation and account creation functionality
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeftIcon, UserPlus } from 'lucide-react';
import toast from "react-hot-toast";
import api from "../lib/axios";

/**
 * Page component for registering new users with role selection
 * @returns {JSX.Element} The register user page component
 */
function RegisterUser() {
    const [email, setEmail] = useState("");
    const [firstname, setFirstName] = useState("");
    const [lastname, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("viewer");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    /**
     * Handle user registration form submission
     * @param {Object} e - Event object from form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (!email.trim() || !firstname.trim() || !lastname.trim() || !username.trim() || !password.trim()) {
            toast.error("All fields are required");
            setLoading(false);
            return;
        }
        try {
            await api.post("/auth/register", {
                email,
                firstname,
                lastname,
                username,
                password,
                role,
            });
            toast.success("User registered successfully!");
            navigate("/");
        } catch (error) {
            console.log("Error creating user", error);
            if (error.response?.status === 429) {
                toast.error("Slow down! You're registering users too fast", {
                    duration: 4000,
                    icon: "💀",
                });
            } else if (error.response?.status === 409) {
                toast.error("User already exists with this email or username");
            } else if (error.response?.status === 400) {
                // Show specific validation errors if available
                const errorMessage = error.response?.data?.message || "Validation failed";
                const errors = error.response?.data?.errors;
                if (errors) {
                    // Show the first validation error
                    const firstError = Object.values(errors)[0];
                    toast.error(firstError);
                } else {
                    toast.error(errorMessage);
                }
            } else {
                toast.error("Failed to register user");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
                            <UserPlus className="size-8 text-resdes-orange" />
                            Register User
                        </h1>
                    </div>
                    <Link to={"/users"} className="btn btn-ghost mb-6">
                        <ArrowLeftIcon className="size-5" />
                        Back To Users
                    </Link>
                    <div className="card bg-base-100">
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>

                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="firstname">
                                        <span className="label-text">First Name</span>
                                    </label>
                                    <input
                                        id="firstname"
                                        type="text"
                                        name="firstname"
                                        placeholder="Enter the users first name"
                                        className="input input-bordered"
                                        value={firstname}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="lastname">
                                        <span className="label-text">Last Name</span>
                                    </label>
                                    <input
                                        id="lastname"
                                        type="text"
                                        name="lastname"
                                        placeholder="Enter the users last name"
                                        className="input input-bordered"
                                        value={lastname}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="email">
                                        <span className="label-text">Email</span>
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        placeholder="Enter the users email"
                                        className="input input-bordered"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="username">
                                        <span className="label-text">Username</span>
                                    </label>
                                    <input
                                        id="username"
                                        type="text"
                                        name="username"
                                        placeholder="Choose a username"
                                        className="input input-bordered"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="password">
                                        <span className="label-text">Password</span>
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        name="password"
                                        placeholder="Create a password"
                                        className="input input-bordered"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="role">
                                        <span className="label-text">Role</span>
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        className="select select-bordered w-full"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        required
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="card-actions justify-end">
                                    <button type="submit" className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300" disabled={loading}>
                                        {loading ? "Registering..." : "Register"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterUser;