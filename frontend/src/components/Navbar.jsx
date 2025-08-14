/*
 * @name Navigation Bar Component
 * @file /docman/frontend/src/components/Navbar.jsx
 * @component Navbar
 * @description Component for the main navigation bar with responsive menu and authentication handling.
 * @author Richard Bakos
 * @version 1.1.8
 * @license UNLICENSED
 */

import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { LogOut, FolderIcon, UsersIcon, FileTextIcon, UserIcon, MenuIcon, XIcon, Users2Icon, BarChart3Icon } from "lucide-react";
import toast from "react-hot-toast";
import LogoPic from "../assets/imgs/logo.png";
import { decodeJWT, getLinkClass } from "../lib/utils";
import useAutoLogout from "../hooks/useAutoLogout";
import NotificationBell from "./NotificationBell";

/**
 * Get user role from JWT token in localStorage
 * @returns {string|null} User role or null if not authenticated
 */
const getUserRole = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
        const decoded = decodeJWT(token);
        return decoded?.role ?? null;
    } catch {
        return null;
    }
};

/**
 * Navigation bar component with responsive menu and authentication handling
 * @returns {JSX.Element} The navigation bar component
 */
const Navbar = () => {
    const [role, setRole] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * Auto logout functionality handler
     * Removes token, updates state, and navigates to home page
     */
    const handleAutoLogout = () => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setRole(null);
        fetch('/api/logout', { method: 'POST' });
        window.dispatchEvent(new Event('authStateChanged'));
        navigate("/");
    };

    /**
     * Use auto logout hook (15 minutes timeout to match token expiry)
     * To enable debugging: useAutoLogout(isAuthenticated, handleAutoLogout, 15, 'Navbar', true);
     */
    useAutoLogout(isAuthenticated, handleAutoLogout, 15, 'Navbar');

    /**
     * Function to check and update authentication state
     */
    const updateAuthState = () => {
        const token = localStorage.getItem("token");
        const authenticated = !!token;
        setIsAuthenticated(authenticated);

        if (token) {
            const r = getUserRole();
            setRole(r);
        } else {
            setRole(null);
        }
    };

    /**
     * Initial auth state check on component mount
     */
    useEffect(() => {
        updateAuthState();
    }, []); // Run once on mount

    /**
     * Update auth state when location changes (including when navigating after login)
     */
    useEffect(() => {
        updateAuthState();
    }, [location]); // Update when location changes (including when navigating after login)

    /**
     * Listen to storage changes for multiple tabs
     */
    useEffect(() => {
        const onStorageChange = () => {
            updateAuthState();
        };

        window.addEventListener("storage", onStorageChange);
        return () => window.removeEventListener("storage", onStorageChange);
    }, []);

    /**
     * Listen to custom auth events (optional - see alternative solution below)
     */
    useEffect(() => {
        const handleAuthChange = () => {
            updateAuthState();
        };

        window.addEventListener("authStateChanged", handleAuthChange);
        return () => window.removeEventListener("authStateChanged", handleAuthChange);
    }, []);

    /**
     * Handle user logout
     */
    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setRole(null);
        fetch('/api/logout', { method: 'POST' });
        toast.success("You have been logged out");

        // Dispatch custom event to notify other components (like HomePage)
        window.dispatchEvent(new Event('authStateChanged'));

        navigate("/");
    };

    return (
        <header className="bg-base-300 border-b-resdes-orange border-base-content/10 border-2">
            <div className="mx-auto max-w-screen-xl pt-4 pb-4">
                <div className="flex items-center justify-between">
                    {/* Logo and Title */}
                    <div className="flex items-center gap-4">
                        <img src={LogoPic} alt="Resonance Designs Logo" width={60} height={60} />
                        <h1 className="text-3xl font-bold text-resdes-orange font-mono tracking-tight">
                            <Link to="/">DocMan</Link>
                        </h1>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-4">
                        {isAuthenticated && (
                            <>
                                <Link to="/documents" className={getLinkClass(location.pathname, "/documents")}>
                                    <FileTextIcon className="size-5" />
                                    <span>Documents</span>
                                </Link>
                                <Link to="/categories" className={getLinkClass(location.pathname, "/categories")}>
                                    <FolderIcon className="size-5" />
                                    <span>Categories</span>
                                </Link>
                                <Link to="/users" className={getLinkClass(location.pathname, "/users")}>
                                    <UsersIcon className="size-5" />
                                    <span>Users</span>
                                </Link>
                                <Link to="/analytics" className={getLinkClass(location.pathname, "/analytics")}>
                                    <BarChart3Icon className="size-5" />
                                    <span>Analytics</span>
                                </Link>
                                {(role === "editor" || role === "admin") && (
                                    <>
                                        <Link to="/teams" className={getLinkClass(location.pathname, "/teams")}>
                                            <Users2Icon className="size-5" />
                                            <span>Teams</span>
                                        </Link>
                                        <Link to="/projects" className={getLinkClass(location.pathname, "/projects")}>
                                            <FolderIcon className="size-5" />
                                            <span>Projects</span>
                                        </Link>
                                    </>
                                )}
                                <Link to="/my-profile" className={getLinkClass(location.pathname, "/my-profile")}>
                                    <UserIcon className="size-5" />
                                    <span>My Profile</span>
                                </Link>
                                <NotificationBell />
                                <button
                                    onClick={handleLogout}
                                    className="btn px-3 py-3 font-semibold text-sm bg-resdes-yellow text-slate-950 hover:bg-resdes-yellow hover:opacity-[.8] transition-opacity duration-300"
                                >
                                    <LogOut className="size-5" />
                                    Logout
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    {isAuthenticated && (
                        <div className="lg:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="btn btn-ghost"
                                aria-label="Toggle mobile menu"
                            >
                                {isMobileMenuOpen ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile Navigation */}
                {isAuthenticated && isMobileMenuOpen && (
                    <div className="lg:hidden mt-4 border-t border-base-content/10 pt-4">
                        <div className="flex flex-col gap-2">
                            <Link
                                to="/documents"
                                className={getLinkClass(location.pathname, "/documents", "btn w-full justify-start")}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <FileTextIcon className="size-5" />
                                <span>Documents</span>
                            </Link>
                            <Link
                                to="/categories"
                                className={getLinkClass(location.pathname, "/categories", "btn w-full justify-start")}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <FolderIcon className="size-5" />
                                <span>Categories</span>
                            </Link>
                            <Link
                                to="/users"
                                className={getLinkClass(location.pathname, "/users", "btn w-full justify-start")}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <UsersIcon className="size-5" />
                                <span>Users</span>
                            </Link>
                            <Link
                                to="/analytics"
                                className={getLinkClass(location.pathname, "/analytics", "btn w-full justify-start")}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <BarChart3Icon className="size-5" />
                                <span>Analytics</span>
                            </Link>
                            {(role === "editor" || role === "admin") && (
                                <>
                                    <Link
                                        to="/teams"
                                        className={getLinkClass(location.pathname, "/teams", "btn w-full justify-start")}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <Users2Icon className="size-5" />
                                        <span>Teams</span>
                                    </Link>
                                    <Link
                                        to="/projects"
                                        className={getLinkClass(location.pathname, "/projects", "btn w-full justify-start")}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <FolderIcon className="size-5" />
                                        <span>Projects</span>
                                    </Link>
                                </>
                            )}
                            <Link
                                to="/my-profile"
                                className={getLinkClass(location.pathname, "/my-profile", "btn w-full justify-start")}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <UserIcon className="size-5" />
                                <span>My Profile</span>
                            </Link>
                            <div className="flex justify-center py-2">
                                <NotificationBell />
                            </div>
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setIsMobileMenuOpen(false);
                                }}
                                className="btn bg-resdes-yellow text-slate-950  hover:bg-resdes-yellow hover:opacity-[.8] transition-opacity duration-300 w-full justify-start"
                            >
                                <LogOut className="size-5" />
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Navbar;