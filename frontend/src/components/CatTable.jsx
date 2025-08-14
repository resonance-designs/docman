/*
 * @name Category Table Component
 * @file /docman/frontend/src/components/CatTable.jsx
 * @component CatTable
 * @description Category table component for displaying and managing document categories
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */

import { EyeIcon, Trash2Icon } from "lucide-react";
import { formatDate, decodeJWT } from "../lib/utils";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import PropTypes from "prop-types";

/**
 * Component for displaying a category in a table row with actions
 * @param {Object} props - Component properties
 * @param {Object} props.category - Category object to display
 * @param {Function} props.setCategories - Function to update the categories list
 * @returns {JSX.Element} The category table row component
 */
const CatTable = ({ category, setCategories }) => {
    const [userRole, setUserRole] = useState(null);

    /**
     * Get user role from token when component mounts
     */
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
        }
    }, []);

    /**
     * Handle category deletion
     * @param {Object} e - Event object from button click
     * @param {string} id - ID of the category to delete
     */
    const handleDelete = async (e, id) => {
        e.preventDefault(); // get rid of the navigation behavior
        if (!window.confirm("Are you sure you want to delete this category?")) return;
        try {
            await api.delete(`/categories/${id}`);
            setCategories((prev) => prev.filter((cat) => cat._id !== id)); // get rid of the deleted one
            toast.success("Category deleted successfully");
        } catch (error) {
            console.log("Error in handleDelete", error);
            toast.error("Failed to delete category");
        }
    };

    // Check if user is admin
    const isAdmin = userRole === "admin";

    return (
        <tr className="bg-base-100 p-4 border-b border-resdes-orange text-base-content text-sm antialiased font-normal leading-normal">
            <td className="p-4">
                <p className="block font-semibold leading-normal">
                    {category.name}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {category.description || "No description"}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {formatDate(new Date(category.createdAt))}
                </p>
            </td>
            <td className="p-4 flex items-center gap-1 float-right">
                <div className="flex items-center gap-1">
                    <EyeIcon className="size-4 text-resdes-teal" title="View Category" />
                    {isAdmin && (
                        <button
                            className="btn btn-ghost btn-xs text-resdes-teal"
                            onClick={(e) => handleDelete(e, category._id)}
                            title="Delete Category"
                        >
                            <Trash2Icon className="size-4" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

CatTable.propTypes = {
    category: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    }).isRequired,
    setCategories: PropTypes.func.isRequired,
};

export default CatTable;
