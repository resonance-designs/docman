import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon, LoaderIcon, Trash2Icon } from "lucide-react";
import api from "../lib/axios";
import toast from "react-hot-toast";

const DocDetailPage = () => {
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await api.get(`/docs/${id}`);
                setDoc(res.data);
            } catch (error) {
                console.log("Error in fetching document", error);
                toast.error("Failed to fetch the document");
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this document?")) return;
        try {
            await api.delete(`/docs/${id}`);
            toast.success("Document deleted");
            navigate("/");
        } catch (error) {
            console.log("Error deleting the document:", error);
            toast.error("Failed to delete document");
        }
    };

    const handleSave = async () => {
        if (!doc.title.trim() || !doc.description.trim() || !doc.author.trim()) {
            toast.error("Please make sure all fields are filled out");
            return;
        }

        setSaving(true);

        try {
            await api.put(`/docs/${id}`, doc);
            toast.success("Document updated successfully");
            navigate("/");
        } catch (error) {
            console.log("Error saving the document:", error);
            toast.error("Failed to update document");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center">
                <LoaderIcon className="animate-spin size-10" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base-200">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <Link to="/" className="btn btn-ghost">
                            <ArrowLeftIcon className="h-5 w-5" />
                            Back to Documents
                        </Link>
                        <button onClick={handleDelete} className="btn btn-error btn-outline">
                            <Trash2Icon className="h-5 w-5" />
                            Delete Document
                        </button>
                    </div>

                    <div className="card bg-base-100">
                        <div className="card-body">
                            <div className="form-control mb-4">
                                <label className="label" htmlFor="doc-title">
                                    <span className="label-text">Title</span>
                                </label>
                                <input
                                    id="doc-title"
                                    type="text"
                                    placeholder="Document title"
                                    className="input input-bordered"
                                    value={doc.title}
                                    onChange={(e) => setDoc({ ...doc, title: e.target.value })}
                                />
                            </div>

                            <div className="form-control mb-4">
                                <label className="label" htmlFor="doc-author">
                                    <span className="label-text">Author</span>
                                </label>
                                <input
                                    id="doc-author"
                                    type="text"
                                    placeholder="Document author"
                                    className="input input-bordered"
                                    value={doc.author}
                                    onChange={(e) => setDoc({ ...doc, author: e.target.value })}
                                />
                            </div>

                            <div className="form-control mb-4">
                                <label className="label" htmlFor="doc-description">
                                    <span className="label-text">Description</span>
                                </label>
                                <textarea
                                    id="doc-description"
                                    placeholder="Write your description of the document here..."
                                    className="textarea textarea-bordered h-32"
                                    value={doc.description}
                                    onChange={(e) => setDoc({ ...doc, description: e.target.value })}
                                />
                            </div>

                            <div className="card-actions justify-end">
                                <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default DocDetailPage;