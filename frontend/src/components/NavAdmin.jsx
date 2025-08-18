/*
 * @name Navigation Admin Component
 * @file /docman/frontend/src/components/NavAdmin.jsx
 * @component NavAdmin
 * @description Component for displaying navigation links for the admin panel.
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import { Link } from "react-router";
import { UserPlus, FolderPlus, Shield, MonitorIcon, BarChartIcon } from "lucide-react";
import PropTypes from "prop-types";

const NavAdmin = ({ role }) => {
    // Only render if user is admin
    if (role !== "admin") {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-resdes-orange to-orange-400 rounded-lg p-4 mb-6 shadow-lg w-fit">
            <div className="flex items-center gap-2 mb-3">
                <Shield className="size-5 text-slate-950" />
                <h3 className="text-lg font-bold text-slate-950 font-mono">Admin Quick Actions</h3>
            </div>
            <div className="flex flex-wrap gap-3">
                <Link
                    to="/register"
                    className="btn btn-sm bg-slate-950 text-resdes-orange hover:bg-slate-800 transition-colors duration-300"
                >
                    <UserPlus className="size-4" />
                    <span>Register User</span>
                </Link>
                <Link
                    to="/create-category"
                    className="btn btn-sm bg-slate-950 text-resdes-orange hover:bg-slate-800 transition-colors duration-300"
                >
                    <FolderPlus className="size-4" />
                    <span>Create Category</span>
                </Link>
                <Link
                    to="/system-info"
                    className="btn btn-sm bg-slate-950 text-resdes-orange hover:bg-slate-800 transition-colors duration-300"
                >
                    <MonitorIcon className="size-4" />
                    <span>System Info</span>
                </Link>
                <Link
                    to="/custom-charts"
                    className="btn btn-sm bg-slate-950 text-resdes-orange hover:bg-slate-800 transition-colors duration-300"
                >
                    <BarChartIcon className="size-4" />
                    <span>Custom Charts</span>
                </Link>
                <Link
                    to="/manage-external-contact-types"
                    className="btn btn-sm bg-slate-950 text-resdes-orange hover:bg-slate-800 transition-colors duration-300"
                >
                    <UserPlus className="size-4" />
                    <span>External Contacts</span>
                </Link>

            </div>
        </div>
    );
};

NavAdmin.propTypes = {
    role: PropTypes.string.isRequired
};

export default NavAdmin;