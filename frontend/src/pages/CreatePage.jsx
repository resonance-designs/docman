import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";


const CreatePage = () => {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
  async function fetchUsers() {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    }
  }
  fetchUsers();
}, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim() || !author.trim() || !description.trim()) {
            toast.error("All fields are required");
            return;
        }

        if (!file) {
            toast.error("Please select a file to upload");
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("author", author);
            formData.append("description", description);
            formData.append("file", file);

            await api.post("/docs", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(percentCompleted);
                },
            });

            toast.success("Document and file uploaded successfully!");
            navigate("/view");
        } catch (error) {
            console.error("Error creating document with file upload:", error);
            if (error.response?.status === 429) {
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
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-screen-lg mx-auto">
                    <Link to={"/view"} className="btn btn-ghost mb-6">
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
                                    <select
  id="author"
  className="select select-bordered"
  value={author}
  onChange={(e) => setAuthor(e.target.value)}
>
  <option value="">Select Author</option>
  {users.map((user) => (
    <option key={user._id} value={`${user.firstname} ${user.lastname}`}>
      {user.firstname} {user.lastname}
    </option>
  ))}
</select>
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

                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="doc-file">
                                        <span className="label-text">Upload Document File</span>
                                    </label>
                                    <input
                                        id="doc-file"
                                        type="file"
                                        className="file-input file-input-bordered"
                                        onChange={(e) => setFile(e.target.files[0])}
                                    />
                                </div>

                                <div className="card-actions justify-end">
                                    <button
                                        type="submit"
                                        className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300"
                                        disabled={loading}
                                    >
                                        {loading ? "Creating..." : "Create Document"}
                                    </button>
                                </div>

                                <div className="w-full bg-gray-200 rounded h-4 mb-4">
                                    <div
                                        className="bg-resdes-orange h-4 rounded"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
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
