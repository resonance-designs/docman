import { PenSquareIcon, Trash2Icon } from "lucide-react";
import { Link } from "react-router";
import { formatDate } from "../lib/utils";
import api from "../lib/axios";
import toast from "react-hot-toast";

const DocCard = ({ doc, setDocs }) => {
    const handleDelete = async (e, id) => {
        e.preventDefault(); // get rid of the navigation behavior

        if (!window.confirm("Are you sure you want to delete this document?")) return;

        try {
            await api.delete(`/docs/${id}`);
            setDocs((prev) => prev.filter((doc) => doc._id !== id)); // get rid of the deleted one
            toast.success("Document deleted successfully");
        } catch (error) {
            console.log("Error in handleDelete", error);
            toast.error("Failed to delete document");
        }
    };

    return (
        <Link
            to={`/doc/${doc._id}`}
            className="card bg-base-100 hover:shadow-lg transition-all duration-200 
            border-t-4 border-solid border-[#00FF9D]"
        >
            <div className="card-body">
                <h3 className="card-title text-base-content">{doc.title}</h3>
                <p className="text-base-content/70 line-clamp-3">{doc.description}</p>
                <div className="card-actions justify-between items-center mt-4">
                    <span className="text-sm text-base-content/60">
                        {formatDate(new Date(doc.createdAt))}
                    </span>
                    <div className="flex items-center gap-1">
                        <PenSquareIcon className="size-4" />
                        <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={(e) => handleDelete(e, doc._id)}
                        >
                            <Trash2Icon className="size-4" />
                        </button>
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
        title: PropTypes.string,
        description: PropTypes.string,
        createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    }).isRequired,
    setDocs: PropTypes.func.isRequired,
};

export default DocCard;