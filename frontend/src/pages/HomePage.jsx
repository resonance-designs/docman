/*
 * @name HomePage
 * @file /docman/frontend/src/pages/HomePage.jsx
 * @page HomePage
 * @description Main dashboard page displaying document overview, recent documents, and quick access to key features
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import RateLimitedUI from "../components/RateLimitedUI";
import api from "../lib/axios";
import toast from "react-hot-toast";
import DocCard from "../components/DocCard";
import PaginatedDocTable from "../components/PaginatedDocTable";
import LoadingSpinner from "../components/LoadingSpinner";
import { useUserRole } from "../hooks";

import { Link } from "react-router";
import { LogIn, ShieldQuestionMark, Search, LibraryBig } from 'lucide-react';
// Removed useAutoLogout import - handled by Navbar component

/**
 * Main home page component that displays either login form for unauthenticated users
 * or documents dashboard for authenticated users
 * @returns {JSX.Element} The home page component
 */
const HomePage = () => {
    const { isAuthenticated } = useUserRole();
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [docs, setDocs] = useState([]); // Always initialize as empty array
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ email: "", password: "" });
    const [pagination, setPagination] = useState(null);
    const [pageSize, setPageSize] = useState(10);

    console.log("🏠 HomePage render:", {
        isAuthenticated,
        loading,
        docsType: typeof docs,
        docsIsArray: Array.isArray(docs),
        docsCount: Array.isArray(docs) ? docs.length : 'not an array',
        docsValue: docs
    });

    // Auto logout functionality moved to Navbar component to avoid conflicts

    /**
     * Filter documents that need review (for DocCard section)
     * Get the 6 most recent documents that became overdue
     * Sort by review date descending (most recently overdue first)
     */
    const docsNeedingReview = (Array.isArray(docs) ? docs : [])
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
        try {
            // Clear any existing token before login
            console.log("🔑 Clearing old token before login");
            localStorage.removeItem("token");

            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                console.log("🔑 Login successful, storing NEW token:", data.token.substring(0, 20) + "...");
                console.log("🔑 Full login response:", data);
                localStorage.setItem("token", data.token);

                // Test the token immediately
                console.log("🔑 Token stored in localStorage:", localStorage.getItem("token") ? "YES" : "NO");

                // Test API call immediately after login
                setTimeout(async () => {
                    try {
                        console.log("🧪 Testing backend connectivity...");
                        // First test if backend is reachable at all
                        const healthCheck = await fetch("http://localhost:5001/api/auth/login", {
                            method: "OPTIONS"
                        });
                        console.log("🧪 Backend health check:", healthCheck.status);

                        console.log("🧪 Testing authenticated API call...");
                        const testResponse = await api.get("/docs");
                        console.log("🧪 Test API call successful:", testResponse.data);
                    } catch (testError) {
                        console.error("🧪 Test API call failed:", testError);
                        console.error("🧪 Error details:", {
                            message: testError.message,
                            status: testError.response?.status,
                            data: testError.response?.data
                        });
                    }
                }, 1000);

                // Dispatch custom event to notify other components (like Navbar)
                window.dispatchEvent(new Event('authStateChanged'));

                toast.success("Login successful!");
                // The useUserRole hook will automatically detect the authentication change
            } else {
                toast.error(data.message || "Login failed.");
            }
        } catch (err) {
            toast.error(`Network error: ${err.message}`);
        }
    };

    // Handle page change
    const handlePageChange = async (page) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('limit', pageSize);
            
            const res = await api.get(`/docs?${params.toString()}`);
            
            // Handle different response structures
            let docsArray = [];
            if (Array.isArray(res.data)) {
                docsArray = res.data;
            } else if (res.data && Array.isArray(res.data.docs)) {
                docsArray = res.data.docs;
            } else if (res.data && Array.isArray(res.data.documents)) {
                docsArray = res.data.documents;
            } else {
                console.warn("🏠 HomePage: Unexpected response structure:", res.data);
            }
            
            setDocs(docsArray);
            setPagination(res.data.pagination || null);
            setIsRateLimited(false);
        } catch (error) {
            console.error("🏠 HomePage: Error fetching documents:", error);
            if (error.response?.status === 429) {
                setIsRateLimited(true);
            }
            // Don't crash on error, just show empty state
            setDocs([]);
        } finally {
            setLoading(false);
        }
    };

    // Handle page size change
    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        // This will trigger the useEffect to refetch data with new page size
    };

    /**
     * Listen for auth state changes (like logout from Navbar)
     * This effect handles authentication state changes from other components
     */
    useEffect(() => {
        // Clear form when user logs out
        if (!isAuthenticated) {
            setForm({ email: "", password: "" });
        }
    }, [isAuthenticated]);

    /**
     * Fetch documents from the API
     * This effect fetches documents when the component mounts or when authentication state changes
     */
    useEffect(() => {
        if (!isAuthenticated) {
            console.log("🏠 HomePage: User not authenticated, skipping document fetch");
            setLoading(false);
            setDocs([]);
            return;
        }

        const fetchDocs = async () => {
            console.log("🏠 HomePage: Fetching documents...");
            setLoading(true); // Set loading when starting to fetch
            try {
                const params = new URLSearchParams();
                params.append('page', 1);
                params.append('limit', pageSize);
                
                const res = await api.get(`/docs?${params.toString()}`);
                console.log("🏠 HomePage: Raw API response:", res);
                console.log("🏠 HomePage: Response data:", res.data);
                console.log("🏠 HomePage: Response data type:", typeof res.data, "isArray:", Array.isArray(res.data));

                // Handle different response structures
                let docsArray = [];
                if (Array.isArray(res.data)) {
                    docsArray = res.data;
                } else if (res.data && Array.isArray(res.data.docs)) {
                    docsArray = res.data.docs;
                } else if (res.data && Array.isArray(res.data.documents)) {
                    docsArray = res.data.documents;
                } else {
                    console.warn("🏠 HomePage: Unexpected response structure:", res.data);
                }

                console.log("🏠 HomePage: Final docs array:", docsArray.length, "documents");
                console.log("🏠 HomePage: Sample doc:", docsArray[0]);
                setDocs(docsArray);
                setPagination(res.data.pagination || null);
                setIsRateLimited(false);
            } catch (error) {
                console.error("🏠 HomePage: Error fetching documents:", error);
                if (error.response?.status === 429) {
                    setIsRateLimited(true);
                }
                // Don't crash on error, just show empty state
                setDocs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDocs();
    }, [isAuthenticated, pageSize]); // Add isAuthenticated and pageSize as dependencies

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
                            {loading && <LoadingSpinner message="Loading documents..." size="md" color="teal" />}
                            {docsNeedingReview.length === 0 && !loading && !isRateLimited && (
                                <div className="text-center py-8 text-gray-500">
                                    No documents need review at this time.
                                    <br />
                                    <small>Total docs loaded: {docs.length}</small>
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
                            <div>
                                <p className="text-sm text-gray-500 mb-4">
                                    Debug: Passing {Array.isArray(docs) ? docs.length : 'non-array'} docs to table
                                </p>
                                <PaginatedDocTable
                                    docs={docs}
                                    setDocs={setDocs}
                                    pagination={pagination}
                                    onPageChange={handlePageChange}
                                    onPageSizeChange={handlePageSizeChange}
                                />
                            </div>
                            {loading && <LoadingSpinner message="Loading documents..." size="md" color="teal" />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;