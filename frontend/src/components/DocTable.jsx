import { PenSquareIcon, Trash2Icon } from "lucide-react";
import { Link } from "react-router";
import { formatDate } from "../lib/utils";
import api from "../lib/axios";
import toast from "react-hot-toast";

const DocTable = ({ doc, setDocs }) => {
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
        <tr className="bg-base-100 p-4 border-b border-resdes-orange text-base-content text-sm antialiased font-normal leading-normal">
            <td className="p-4">
                <p className="block">
                    {doc.title}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {doc.author}
                </p>
            </td>
            <td className="p-4">
                <p className="block">
                    {formatDate(new Date(doc.createdAt))}
                </p>
            </td>
            <td className="p-4 flex items-center gap-1 float-right">
                <Link
                    to={`/doc/${doc._id}`}
                    className="card hover:shadow-lg transition-all duration-200"
                >
                    <PenSquareIcon className="size-4 text-resdes-teal" />
                </Link>
                <button
                    className="btn btn-ghost btn-xs text-resdes-teal"
                    onClick={(e) => handleDelete(e, doc._id)}
                >
                    <Trash2Icon className="size-4" />
                </button>
            </td>
        </tr>
    );
};

import PropTypes from "prop-types";

DocTable.propTypes = {
    doc: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        author: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    }).isRequired,
    setDocs: PropTypes.func.isRequired,
};

export default DocTable;