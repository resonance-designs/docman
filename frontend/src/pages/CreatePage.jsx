import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";

const CreatePage = () => {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) {
            toast.error("All fields are required");
            return;
        }
        setLoading(true);
        try {
            await api.post("/docs", {
                title,
                author,
                description,
            });
            toast.success("Document created successfully!");
            navigate("/");
        } catch (error) {
            console.log("Error creating document", error);
            if (error.response.status === 429) {
                toast.error("Slow down! You're creating documents too fast", {
                    duration: 4000,
                    icon: "💀",
                });
            } else {
                toast.error("Failed to create document");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-base-200">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <Link to={"/"} className="btn btn-ghost mb-6">
                        <ArrowLeftIcon className="size-5" />
                        Back to Documents
                    </Link>

                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h2 className="card-title text-2xl mb-4">Create New Document</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="title">
                                        <span className="label-text">Title</span>
                                    </label>
                                    <input
                                        id="title"
                                        type="text"
                                        placeholder="Document Title"
                                        className="input input-bordered"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="author">
                                        <span className="label-text">Author</span>
                                    </label>
                                    <input
                                        id="author"
                                        type="text"
                                        placeholder="Document Author"
                                        className="input input-bordered"
                                        value={author}
                                        onChange={(e) => setAuthor(e.target.value)}
                                    />
                                </div>

                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="description">
                                        <span className="label-text">Description</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        placeholder="Write your description here..."
                                        className="textarea textarea-bordered h-32"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>

                                <div className="card-actions justify-end">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? "Creating..." : "Create Document"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default CreatePage;