/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import RateLimitedUI from "../components/RateLimitedUI";
import api from "../lib/axios";
import toast from "react-hot-toast";
import DocCard from "../components/DocCard";
import DocTable from "../components/DocTable";
import DocsNotFound from "../components/DocsNotFound";
import { Link } from "react-router";
import { LogIn, ShieldQuestionMark } from 'lucide-react';

const HomePage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ email: "", password: "" });
    const [message, setMessage] = useState("");
    const limitDocCard = 6;

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
                setIsAuthenticated(true); // This will trigger the useEffect

                // Dispatch custom event to notify other components (like Navbar)
                window.dispatchEvent(new Event('authStateChanged'));

                setMessage("Login successful!");
                toast.success("Login successful!");
            } else {
                setMessage(data.message || "Login failed.");
                toast.error(data.message || "Login failed.");
            }
        } catch (err) {
            setMessage(`Network error: ${err.message}`);
        }
    };

    // Listen for auth state changes (like logout from Navbar)
    useEffect(() => {
        const handleAuthChange = () => {
            const token = localStorage.getItem("token");
            const wasAuthenticated = isAuthenticated;
            const nowAuthenticated = !!token;

            setIsAuthenticated(nowAuthenticated);

            // If user just logged out, clear the form
            if (wasAuthenticated && !nowAuthenticated) {
                setForm({ email: "", password: "" });
                setMessage("");
            }
        };

        window.addEventListener("authStateChanged", handleAuthChange);
        return () => window.removeEventListener("authStateChanged", handleAuthChange);
    }, [isAuthenticated]); // Add isAuthenticated as dependency to track changes

    // Move fetchDocs inside useEffect or make it a separate function
    useEffect(() => {
        const fetchDocs = async () => {
            setLoading(true); // Set loading when starting to fetch
            try {
                // Get fresh token and headers inside the effect
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get("/docs?limit=10", { headers });
                console.log(res.data);
                setDocs(res.data);
                setIsRateLimited(false);
            } catch (error) {
                console.log("Error fetching documents");
                console.log(error.response);
                if (error.response?.status === 429) {
                    setIsRateLimited(true);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDocs();
    }, [isAuthenticated]); // Add isAuthenticated as dependency

    return (
        <div className="min-h-screen">
            {isRateLimited && <RateLimitedUI />}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-screen-lg mx-auto">
                    {!isAuthenticated && ( // If the user is not authenticated, display the login form
                        <>
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
                                                {loading ? (
                                                    'Logging in...'
                                                ) : (
                                                    <>
                                                        <LogIn className="size-5" />
                                                        <span>Login</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </>
                    )}
                    {isAuthenticated && ( // If the user is authenticated, display the documents
                        <>
                            <h2 className="text-3xl mb-6">Documents That Need Review</h2>
                            {loading && <div className="text-center text-resdes-teal py-10">Loading docs...</div>}
                            {docs.length === 0 && !loading && !isRateLimited && <DocsNotFound />}
                            {docs.length > 0 && !isRateLimited && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                    {docs.slice(0, limitDocCard).map((doc) => (
                                        <DocCard key={doc._id} doc={doc} setDocs={setDocs} />
                                    ))}
                                </div>
                            )}
                            <h2 className="text-3xl mb-6">All Documents</h2>
                            <div className="relative flex flex-col w-full h-full overflow-scroll text-gray-700 bg-white shadow-md rounded-xl bg-clip-border">
                                <table className="w-full text-left table-auto min-w-max border-b border-resdes-orange">
                                    <thead className="bg-resdes-orange text-slate-950 font-mono font-bold">
                                        <tr>
                                            <th className="p-4">
                                                <p className="block text-sm antialiased leading-none">
                                                    Title
                                                </p>
                                            </th>
                                            <th className="p-4">
                                                <p className="block text-sm antialiased leading-none">
                                                    Author
                                                </p>
                                            </th>
                                            <th className="p-4">
                                                <p className="block text-sm antialiased leading-none">
                                                    Added On
                                                </p>
                                            </th>
                                            <th className="p-4">
                                                <p className="block text-sm antialiased leading-none float-right">
                                                    Actions
                                                </p>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="border border-resdes-orange">
                                        {docs.map((doc) => (
                                            <DocTable key={doc._id} doc={doc} setDocs={setDocs} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {loading && <div className="text-center text-resdes-teal py-10">Loading docs...</div>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;