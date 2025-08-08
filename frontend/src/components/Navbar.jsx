import { Link, useNavigate } from "react-router";
import { PlusIcon } from "lucide-react";

const Navbar = () => {
    const isAuthenticated = !!localStorage.getItem("token");
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <header className="bg-base-300 border-b-red-600 border-base-content/10">
            <div className="mx-auto max-w-6xl p-4">
                <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-primary font-mono tracking-tight">DocMan</h1>
                <div className="flex items-center gap-4">
                    <Link to="/create" className="btn btn-primary">
                        <PlusIcon className="size-5" />
                        <span>Create Document</span>
                    </Link>
                    {!isAuthenticated && (
                    <>
                        <Link to="/login" className="btn btn-ghost">Login</Link>
                        <Link to="/register" className="btn btn-ghost">Register</Link>
                    </>
                    )}
                    <Link to="/forgot-password" className="btn btn-ghost">Forgot Password</Link>
                    {isAuthenticated && (
                    <>
                        <Link to="/reset-password" className="btn btn-ghost">Reset Password</Link>
                        <button onClick={handleLogout} className="btn btn-error">Logout</button>
                    </>
                    )}
                </div>
                </div>
            </div>
        </header>
    );
}
export default Navbar;
