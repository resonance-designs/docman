/* eslint-disable no-unused-vars */
import { useState } from "react";
import { Link } from "react-router";
import { ShieldQuestionMark } from 'lucide-react';

function LoginPage() {
    const [loading] = useState(false);
    const [form, setForm] = useState({ email: "", password: "" });
    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem("token", data.token);
            setMessage("Login successful!");
        } else {
            setMessage(data.message || "Login failed.");
        }
        } catch (err) {
        setMessage(`Network error: ${err.message}`);
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
                            <h2 className="card-title text-2xl mb-4">Login</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="email">
                                        <span className="label-text">Email</span>
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        placeholder="Your Email"
                                        className="input input-bordered"
                                        value={form.email}
                                        onChange={handleChange}
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
                                        placeholder="Your Password"
                                        className="input input-bordered"
                                        value={form.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="card-actions justify-end">
                                    <button type="submit" className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300" disabled={loading}>
                                        {loading ? "Logging in..." : "Login"}
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

export default LoginPage;