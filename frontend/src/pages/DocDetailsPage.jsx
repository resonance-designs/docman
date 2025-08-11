import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon, LoaderIcon, Trash2Icon } from "lucide-react";
import api from "../lib/axios";
import toast from "react-hot-toast";

const DocDetailPage = () => {
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [file, setFile] = useState(null); // <-- New state for file
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await api.get(`/docs/${id}`);
                setDoc(res.data.doc || res.data); // Adjust if you changed API response shape
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
            // Update doc fields first
            await api.put(`/docs/${id}`, doc);

            // If a new file selected, upload it as new version
            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                await api.post(`/docs/${id}/upload`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }

            toast.success("Document updated successfully");
            navigate(`/doc/${id}`); // Or wherever you want
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
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-screen-lg mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <Link to="/" className="btn btn-ghost mb-4">
                            <ArrowLeftIcon />
                            Back To Documents
                        </Link>
                        <button onClick={handleDelete} className="btn bg-resdes-red btn-outline">
                            <Trash2Icon className="h-5 w-5" />
                            Delete Document
                        </button>
                    </div>

                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <h2 className="card-title text-2xl mb-4">Edit Document</h2>
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

                        {/* New file input */}
                        <div className="form-control mb-4">
                            <label className="label" htmlFor="doc-file">
                                <span className="label-text">Upload New Version</span>
                            </label>
                            <input
                                id="doc-file"
                                type="file"
                                className="file-input file-input-bordered"
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                        </div>

                        <div className="card-actions justify-end">
                            <button className="btn bg-resdes-green text-slate-950" disabled={saving} onClick={handleSave}>
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
