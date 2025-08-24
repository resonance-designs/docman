/*
 * @name Document Card Component
 * @file /docman/frontend/src/components/DocCard.jsx
 * @component DocCard
 * @description Component for displaying a document card with title, author, description, and review date.
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */

import { EyeIcon, Trash2Icon } from "lucide-react";
import { Link } from "react-router";
import { formatDate, truncate } from "../lib/utils";
import api from "../lib/axios";
import toast from "react-hot-toast";

import { useUserRole } from "../hooks";
import { useConfirmationContext } from "../context/ConfirmationContext";

/**
 * Component for displaying a document card with title, author, description, and review date
 * @param {Object} props - Component properties
 * @param {Object} props.doc - Document object to display
 * @param {Function} props.setDocs - Function to update the documents list
 * @returns {JSX.Element} The document card component
 */
const DocCard = ({ doc, setDocs }) => {
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

    // Check if document needs review (review date is today or in the past)
    const needsReview = new Date(doc.reviewDate) <= new Date();

    // Check if user is admin
    const isAdmin = userRole === "admin" || userRole === "superadmin";

    return (
        <Link
            to={`/doc/${doc._id}`}
            className="card bg-base-100 hover:shadow-lg transition-all duration-200
            border-t-4 border-solid border-resdes-orange"
        >
            <div className="card-body">
                <h3 className="card-title text-base-content">{doc.title}</h3>
                <p className="text-base-content/70 line-clamp-3 text-xs">
                    By <i>{getAuthorName(doc.author)}</i>
                </p>
                <p className="text-base-content/70 line-clamp-3">{truncate(doc.description, 120)}</p>
                <p className={`line-clamp-3 ${needsReview ? 'text-resdes-red font-semibold' : 'text-base-content/70'}`}>
                    Review: {formatDate(new Date(doc.reviewDate))}
                    {needsReview && <span className="ml-2 text-xs bg-red-100 text-resdes-red px-1 py-0.5 rounded">OVERDUE</span>}
                </p>
                <div className="card-actions justify-between items-center mt-4">
                    <span className="text-sm text-base-content/60">
                        Added On: {formatDate(new Date(doc.createdAt))}
                    </span>
                    <div className="flex items-center gap-1">
                        <EyeIcon className="size-4 text-resdes-teal" />
                        {isAdmin && (
                            <button
                                className="btn btn-ghost btn-xs text-resdes-teal"
                                onClick={(e) => handleDelete(e, doc._id)}
                            >
                                <Trash2Icon className="size-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

import PropTypes from "prop-types";

DocCard.propTypes = {
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

export default DocCard;