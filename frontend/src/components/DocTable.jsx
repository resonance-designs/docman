/*
 * @name Document Table Component
 * @file /docman/frontend/src/components/DocTable.jsx
 * @component DocTable
 * @description Component for displaying a document in a table row with actions.
 * @author Richard Bakos
 * @version 2.1.22
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
 * Component for displaying a document in a table row with actions
 * @param {Object} props - Component properties
 * @param {Object} props.doc - Document object to display
 * @param {Function} props.setDocs - Function to update the documents list
 * @returns {JSX.Element} The document table row component
 */
const DocTable = ({ doc, setDocs }) => {
    const { userRole } = useUserRole();
    const { confirm } = useConfirmationContext();

    /**
     * Handle document deletion
     * @param {Object} e - Event object from button click
     * @param {string} id - ID of the document to delete
     */
    const handleDelete = async (e, id) => {
        e.preventDefault(); // get rid of the navigation behavior
        
        confirm({
            title: "Delete Document",
            message: `Are you sure you want to delete "${doc.title}"?`,
            actionName: "Delete",
            onConfirm: async () => {
                try {
                    await api.delete(`/docs/${id}`);
                    setDocs((prev) => prev.filter((doc) => doc._id !== id)); // get rid of the deleted one
                    toast.success("Document deleted successfully");
                } catch (error) {
                    console.log("Error in handleDelete", error);
                    toast.error("Failed to delete document");
                }
            }
        });
    };

    /**
     * Helper function to format author name
     * @param {string|Object} author - Author information (string for backward compatibility or object with firstname/lastname)
     * @returns {string} Formatted author name
     */
    const getAuthorName = (author) => {
        if (typeof author === 'string') {
            return author; // Backward compatibility if some docs still have string authors
        }
        if (author && typeof author === 'object') {
            return `${author.firstname} ${author.lastname}`;
        }
        return 'Unknown Author'; // Fallback
    };

    // Check if document needs review (opens for review date is today or in the past)
    const needsReview = new Date(doc.opensForReview || doc.reviewDate) <= new Date();

    // Check if user is admin
    const isAdmin = userRole === "admin" || userRole === "superadmin";

    return (
        <tr className="bg-base-100 p-4 border-b border-resdes-orange text-base-content text-sm antialiased font-normal leading-normal">
            <td className="p-4">
                <p className="block">
                    {doc.title}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {getAuthorName(doc.author)}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {formatDate(new Date(doc.createdAt))}
                </p>
            </td>
            <td className="p-4">
                <p className={`block ${needsReview ? 'text-resdes-red font-semibold' : ''}`}>
                    {formatDate(new Date(doc.opensForReview || doc.reviewDate))}
                    {needsReview && <span className="ml-2 text-xs bg-red-100 text-resdes-red px-1 py-0.5 rounded">OVERDUE</span>}
                </p>
            </td>
            <td className="p-4 flex items-center gap-1 float-right">
                <Link
                    to={`/doc/${doc._id}`}
                    className="card hover:shadow-lg transition-all duration-200"
                    title="View Document"
                >
                    <EyeIcon className="size-4 text-resdes-teal" />
                </Link>
                {isAdmin && (
                    <button
                        className="btn btn-ghost btn-xs text-resdes-teal"
                        onClick={(e) => handleDelete(e, doc._id)}
                    >
                        <Trash2Icon className="size-4" />
                    </button>
                )}
            </td>
        </tr>
    );
};

import PropTypes from "prop-types";

DocTable.propTypes = {
    doc: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        author: PropTypes.oneOfType([
            PropTypes.string, // For backward compatibility
            PropTypes.shape({
                _id: PropTypes.string,
                firstname: PropTypes.string,
                lastname: PropTypes.string,
                email: PropTypes.string
            })
        ]).isRequired,
        description: PropTypes.string.isRequired,
        createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        reviewDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    }).isRequired,
    setDocs: PropTypes.func.isRequired,
};

export default DocTable;