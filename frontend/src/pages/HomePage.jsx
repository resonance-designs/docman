/*
 * @name HomePage
 * @file /docman/frontend/src/pages/HomePage.jsx
 * @page HomePage
 * @description Main dashboard page displaying document overview, recent documents, and quick access to key features
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import RateLimitedUI from "../components/RateLimitedUI";
import api from "../lib/axios";
import toast from "react-hot-toast";
import DocCard from "../components/DocCard";
import PaginatedDocTable from "../components/PaginatedDocTable";

import { Link } from "react-router";
import { LogIn, ShieldQuestionMark, Search, LibraryBig } from 'lucide-react';
// Removed useAutoLogout import - handled by Navbar component

/**
 * Main home page component that displays either login form for unauthenticated users
 * or documents dashboard for authenticated users
 * @returns {JSX.Element} The home page component
 */
const HomePage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ email: "", password: "" });
    const [message, setMessage] = useState("");

    // Auto logout functionality moved to Navbar component to avoid conflicts

    /**
     * Filter documents that need review (for DocCard section)
     * Get the 6 most recent documents that became overdue
     * Sort by review date descending (most recently overdue first)
     */
    const docsNeedingReview = docs
        .filter(doc => {
            const needsReview = new Date(doc.reviewDate) <= new Date();
            return needsReview;
        })
        .sort((a, b) => {
            // Sort by review date descending (most recently overdue first)
            return new Date(b.reviewDate) - new Date(a.reviewDate);
        })
        .slice(0, 6); // Limit to 6 results

    /**
     * Handle form input changes
     * @param {Object} e - Event object from input change
     */
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    /**
     * Handle login form submission
     * @param {Object} e - Event object from form submission
     */
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
                // Don't navigate here - let the useEffect handle the content update
            } else {
                setMessage(data.message || "Login failed.");
                toast.error(data.message || "Login failed.");
            }
        } catch (err) {
            setMessage(`Network error: ${err.message}`);
        }
    };

    /**
     * Listen for auth state changes (like logout from Navbar)
     * This effect handles authentication state changes from other components
     */
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

    /**
     * Fetch documents from the API
     * This effect fetches documents when the component mounts or when authentication state changes
     */
    useEffect(() => {
        const fetchDocs = async () => {
            setLoading(true); // Set loading when starting to fetch
            try {
                // Get fresh token and headers inside the effect
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get("/docs", { headers });
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
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
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
                            {/* Header */}
                            <div className="flex justify-between items-center">
                                <h1 className="text-4xl font-bold mb-8 flex items-center gap-2">
                                    <Search className="size-8 text-resdes-orange" />
                                    Documents That Need Review
                                </h1>
                            </div>
                            {loading && <div className="text-center text-resdes-teal py-10">Loading docs...</div>}
                            {docsNeedingReview.length === 0 && !loading && !isRateLimited && (
                                <div className="text-center py-8 text-gray-500">
                                    No documents need review at this time.
                                </div>
                            )}
                            {docsNeedingReview.length > 0 && !isRateLimited && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                    {docsNeedingReview.map((doc) => (
                                        <DocCard key={doc._id} doc={doc} setDocs={setDocs} />
                                    ))}
                                </div>
                            )}
                            {/* Header */}
                            <div className="flex justify-between items-center">
                                <h1 className="text-4xl font-bold mb-8 flex items-center gap-2">
                                    <LibraryBig className="size-8 text-resdes-orange" />
                                    All Documents
                                </h1>
                            </div>
                            <PaginatedDocTable docs={docs} setDocs={setDocs} />
                            {loading && <div className="text-center text-resdes-teal py-10">Loading docs...</div>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;