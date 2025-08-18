/*
 * @name Account Navigation Component
 * @file /docman/frontend/src/components/AccountNav.jsx
 * @component AccountNav
 * @description Account navigation dropdown component with profile, teams, and projects links
 * @author Richard Bakos
 * @version 2.1.3
 * @license UNLICENSED
 */

import { useState } from "react";
import { Link, useLocation } from "react-router";
import { UserIcon, Users2Icon, FolderIcon, ChevronDownIcon } from "lucide-react";
import { getLinkClass } from "../lib/utils";
import { useUserRole } from "../hooks";

/**
 * Account navigation dropdown component
 * @returns {JSX.Element} The account navigation component
 */
const AccountNav = () => {
    const { userRole: role } = useUserRole();
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    // Check if any account-related page is active
    const isAccountPageActive = ["/my-profile", "/teams", "/projects"].includes(location.pathname);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    relative p-2 rounded-full transition-colors flex items-center gap-2
                    ${isAccountPageActive 
                        ? 'bg-resdes-orange text-slate-950' 
                        : 'hover:bg-base-200 text-base-content'
                    }
                `}
                aria-label="Account menu"
            >
                <div className={`
                    p-1 rounded-full
                    ${isAccountPageActive 
                        ? 'bg-slate-950/20' 
                        : 'bg-resdes-orange'
                    }
                `}>
                    <UserIcon 
                        size={16} 
                        className={isAccountPageActive ? 'text-slate-950' : 'text-slate-950'} 
                    />
                </div>
                <ChevronDownIcon 
                    size={14} 
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-base-100 rounded-lg shadow-lg z-50 border border-base-300">
                        <div className="py-2">
                            <Link
                                to="/my-profile"
                                className={`
                                    flex items-center gap-3 px-4 py-2 text-sm transition-colors
                                    ${location.pathname === "/my-profile" 
                                        ? 'bg-resdes-orange text-slate-950' 
                                        : 'text-base-content hover:bg-base-200'
                                    }
                                `}
                                onClick={() => setIsOpen(false)}
                            >
                                <UserIcon size={16} />
                                <span>Profile</span>
                            </Link>
                            
                            {(role === "editor" || role === "admin") && (
                                <>
                                    <Link
                                        to="/teams"
                                        className={`
                                            flex items-center gap-3 px-4 py-2 text-sm transition-colors
                                            ${location.pathname === "/teams" 
                                                ? 'bg-resdes-orange text-slate-950' 
                                                : 'text-base-content hover:bg-base-200'
                                            }
                                        `}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Users2Icon size={16} />
                                        <span>Teams</span>
                                    </Link>
                                    
                                    <Link
                                        to="/projects"
                                        className={`
                                            flex items-center gap-3 px-4 py-2 text-sm transition-colors
                                            ${location.pathname === "/projects" 
                                                ? 'bg-resdes-orange text-slate-950' 
                                                : 'text-base-content hover:bg-base-200'
                                            }
                                        `}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <FolderIcon size={16} />
                                        <span>Projects</span>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AccountNav;