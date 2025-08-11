import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ShieldQuestionMark } from 'lucide-react';
import toast from "react-hot-toast";
import api from "../lib/axios";

function RegPage() {
    const [email, setEmail] = useState("");
    const [firstname, setFirstName] = useState("");
    const [lastname, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (!email.trim() || !username.trim() || !password.trim()) {
            toast.error("All fields are required");
            return;
        }
        try {
            await api.post("/auth/register", {
                email,
                firstname,
                lastname,
                username,
                password,
            });
            toast.success("User registered successfully!");
            navigate("/");
        } catch (error) {
            console.log("Error creating user", error);
            if (error.response.status === 429) {
                toast.error("Slow down! You're registering users too fast", {
                    duration: 4000,
                    icon: "💀",
                });
            } else {
                toast.error("Failed to register user");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-screen-lg mx-auto">
                    <Link to={"/forgot-password"} className="btn btn-ghost mb-6">
                        <ShieldQuestionMark className="size-5" />
                        Forgot Password
                    </Link>
                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h2 className="card-title text-2xl mb-4">Register</h2>
                            <form onSubmit={handleSubmit}>

                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="firstname">
                                        <span className="label-text">First Name</span>
                                    </label>
                                    <input
                                        id="firstname"
                                        type="test"
                                        name="firstname"
                                        placeholder="Enter your first name"
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
                                        type="test"
                                        name="lastname"
                                        placeholder="Enter your last name"
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
                                        placeholder="Enter your email"
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
                                        type="username"
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

export default RegPage;