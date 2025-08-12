import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Eye, RotateCcwKey, PlusIcon, LogIn, LogOut, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import LogoPic from "../assets/imgs/logo.png";
import { decodeJWT } from "../lib/utils"

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

const Navbar = () => {
    const [role, setRole] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Function to check and update auth state
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

    useEffect(() => {
        updateAuthState();
    }, [location]); // Update when location changes (including when navigating after login)

    // Listen to storage changes for multiple tabs
    useEffect(() => {
        const onStorageChange = () => {
            updateAuthState();
        };

        window.addEventListener("storage", onStorageChange);
        return () => window.removeEventListener("storage", onStorageChange);
    }, []);

    // Listen to custom auth events (optional - see alternative solution below)
    useEffect(() => {
        const handleAuthChange = () => {
            updateAuthState();
        };

        window.addEventListener("authStateChanged", handleAuthChange);
        return () => window.removeEventListener("authStateChanged", handleAuthChange);
    }, []);

    const getLinkClass = (path, base = "btn") =>
        location.pathname === path
            ? `${base} bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300`
            : `${base} btn-ghost`;

    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setRole(null);
        fetch('/api/logout', { method: 'POST' });
        toast.success("You have been logged out");
        // Dispatch custom event to notify other components (like HomePage)
        window.dispatchEvent(new Event('authStateChanged'));
        navigate("/");
        // Remove the setTimeout and window.location.reload - not needed anymore!
    };

    return (
        <header className="bg-base-300 border-b-resdes-orange border-base-content/10 border-2">
            <div className="mx-auto max-w-screen-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flow-root w-full">
                        <div className="float-left">
                            <div className="flex items-center gap-4">
                                <img src={LogoPic} alt="Resonance Designs Logo" width={60} height={60} />
                                <h1 className="text-3xl font-bold text-resdes-orange font-mono tracking-tight">
                                    <Link to="/">DocMan</Link>
                                </h1>
                            </div>
                        </div>
                        <div className="float-right">
                            <div className="flex items-center gap-4">
                                { /* !isAuthenticated && (
                                    <Link to="/" className={getLinkClass("/")}>
                                        <LogIn className="size-5" />
                                        <span>Login</span>
                                    </Link>
                                ) */ }
                                {isAuthenticated && (
                                    <>
                                        {(role === "editor" || role === "admin") && (
                                            <Link to="/create" className={getLinkClass("/create")}>
                                                <PlusIcon className="size-5" />
                                                <span>Create Document</span>
                                            </Link>
                                        )}
                                        <Link to="/reset-password" className={getLinkClass("/reset-password")}>
                                            <RotateCcwKey className="size-5" />
                                            Reset Password
                                        </Link>
                                        {role === "admin" && (
                                            <Link to="/register" className={getLinkClass("/register")}>
                                                <UserPlus className="size-5" />
                                                <span>Register User</span>
                                            </Link>
                                        )}
                                        <button
                                            onClick={handleLogout}
                                            className="btn bg-resdes-yellow text-slate-950 hover:bg-resdes-yellow hover:opacity-[.8] transition-opacity duration-300"
                                        >
                                            <LogOut className="size-5" />
                                            Logout
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
