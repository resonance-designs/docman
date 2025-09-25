/*
 * @name Book Table Component
 * @file /docman/frontend/src/components/BookTable.jsx
 * @component BookTable
 * @description Component for displaying a book in a table row with actions.
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */

import { EyeIcon, Trash2Icon } from "lucide-react";
import { Link } from "react-router";
import { formatDate } from "../lib/utils";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { useUserRole } from "../hooks";
import { useConfirmationContext } from "../context/ConfirmationContext";

/**
 * Component for displaying a book in a table row with actions
 * @param {Object} props - Component properties
 * @param {Object} props.book - Book object to display
 * @param {Function} props.setBooks - Function to update the books list
 * @returns {JSX.Element} The book table row component
 */
const BookTable = ({ book, setBooks }) => {
    const { userRole } = useUserRole();
    const { confirm } = useConfirmationContext();

    /**
     * Handle book deletion
     * @param {Object} e - Event object from button click
     * @param {string} id - ID of the book to delete
     */
    const handleDelete = async (e, id) => {
        e.preventDefault(); // get rid of the navigation behavior
        
        confirm({
            title: "Delete Book",
            message: `Are you sure you want to delete "${book.title}"?`,
            actionName: "Delete",
            onConfirm: async () => {
                try {
                    await api.delete(`/books/${id}`);
                    setBooks((prev) => prev.filter((book) => book._id !== id)); // get rid of the deleted one
                    toast.success("Book deleted successfully");
                } catch (error) {
                    console.log("Error in handleDelete", error);
                    toast.error("Failed to delete book");
                }
            }
        });
    };

    /**
     * Helper function to format author name
     * @param {string|Object} author - Author information (string for backward compatibility or object with name/firstname/lastname)
     * @returns {string} Formatted author name
     */
    const getAuthorName = (author) => {
        if (typeof author === 'string') {
            return author; // Backward compatibility if some books still have string authors
        }
        if (author && typeof author === 'object') {
            if (author.name) {
                return author.name;
            }
            if (author.firstname && author.lastname) {
                return `${author.firstname} ${author.lastname}`;
            }
        }
        return 'Unknown Author'; // Fallback
    };

    /**
     * Helper function to get category name
     * @param {string|Object} category - Category information
     * @returns {string} Category name
     */
    const getCategoryName = (category) => {
        if (typeof category === 'string') {
            return category;
        }
        if (category && typeof category === 'object' && category.name) {
            return category.name;
        }
        return 'Uncategorized';
    };

    // Check if user is admin, editor, or superadmin
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const canEdit = userRole === "admin" || userRole === "editor" || userRole === "superadmin";

    return (
        <tr className="bg-base-100 p-4 border-b border-resdes-orange text-base-content text-sm antialiased font-normal leading-normal">
            <td className="p-4">
                <p className="block">
                    {book.title}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {getAuthorName(book.author)}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {getCategoryName(book.category)}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {book.documentCount || 0}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {formatDate(new Date(book.createdAt))}
                </p>
            </td>
            <td className="p-4 flex items-center gap-1 float-right">
                <Link
                    to={`/books/${book._id}`}
                    className="card hover:shadow-lg transition-all duration-200"
                    title="View Book"
                >
                    <EyeIcon className="size-4 text-resdes-teal" />
                </Link>
                {isAdmin && (
                    <button
                        className="btn btn-ghost btn-xs text-resdes-teal"
                        onClick={(e) => handleDelete(e, book._id)}
                    >
                        <Trash2Icon className="size-4" />
                    </button>
                )}
            </td>
        </tr>
    );
};

import PropTypes from "prop-types";

BookTable.propTypes = {
    book: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        author: PropTypes.oneOfType([
            PropTypes.string, // For backward compatibility
            PropTypes.shape({
                _id: PropTypes.string,
                name: PropTypes.string,
                firstname: PropTypes.string,
                lastname: PropTypes.string,
                email: PropTypes.string
            })
        ]),
        category: PropTypes.oneOfType([
            PropTypes.string, // For backward compatibility
            PropTypes.shape({
                _id: PropTypes.string,
                name: PropTypes.string
            })
        ]),
        description: PropTypes.string,
        documentCount: PropTypes.number,
        createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        updatedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    }).isRequired,
    setBooks: PropTypes.func.isRequired,
};

export default BookTable;