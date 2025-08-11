import { Link, useNavigate, useLocation } from "react-router";
import { Eye, RotateCcwKey, PlusIcon, LogIn, LogOut, UserPlus  } from "lucide-react";
import LogoPic from "../assets/imgs/logo.png";

const Navbar = () => {
    const isAuthenticated = !!localStorage.getItem("token");
    const navigate = useNavigate();
    const location = useLocation();

    const getLinkClass = (path, base = "btn") =>
        location.pathname === path ? `${base} bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300` : `${base} btn-ghost`;

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/");
    };

    return (
        <header className="bg-base-300 border-b-resdes-orange border-base-content/10 border-2">
            <div className="mx-auto max-w-screen-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flow-root w-full">
                        <div className="float-left">
                            <div className="flex items-center gap-4">
                                <img src={LogoPic} alt="Resonance Designs Logo" width={60} height={60} />
                                <h1 className="text-3xl font-bold text-resdes-orange font-mono tracking-tight"><Link to="/" >DocMan</Link></h1>
                            </div>
                        </div>
                        <div className="float-right">
                            <div className="flex items-center gap-4">
                                {!isAuthenticated && (
                                <>
                                    <Link to="/" className={getLinkClass("/login")}>
                                        <LogIn className="size-5" />
                                        <span>Login</span>
                                    </Link>
                                    <Link to="/register" className={getLinkClass("/register")}>
                                        <UserPlus className="size-5" />
                                        <span>Register</span>
                                    </Link>
                                </>
                                )}
                                {isAuthenticated && (
                                <>
                                    {/*<Link to="/view" className={getLinkClass("/view")}>
                                        <Eye className="size-5" />
                                        <span>View Documents</span>
                                    </Link>*/}
                                    <Link to="/create" className={getLinkClass("/create")}>
                                        <PlusIcon className="size-5" />
                                        <span>Create Document</span>
                                    </Link>
                                    <Link to="/reset-password" className={getLinkClass("/reset-password")}>
                                        <RotateCcwKey className="size-5" />
                                        Reset Password
                                    </Link>
                                    <button onClick={handleLogout} className="btn bg-resdes-yellow text-slate-950 hover:bg-resdes-yellow hover:opacity-[.8] transition-opacity duration-300">
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
}
export default Navbar;
