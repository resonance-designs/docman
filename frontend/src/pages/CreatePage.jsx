/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const schema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    author: z.string().optional(),
    description: z.string().optional(),
    file: z
        .any()
        .refine((f) => f?.length === 1, "File is required")
        .refine((f) => f && f[0] && ALLOWED_TYPES.includes(f[0].type), "Unsupported file type")
        .refine((f) => f && f[0] && f[0].size <= MAX_FILE_SIZE, "File too large"),
});

const CreatePage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset } = useForm({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const res = await api.get("/users");
                setUsers(res.data || []);
            } catch (err) {
                console.error("Could not load users", err);
            }
        };
        loadUsers();
    }, []);

    const onSubmit = async (data) => {
        setLoading(true);
            try {
            const formData = new FormData();
            formData.append("title", data.title);
            formData.append("author", data.author || "");
            formData.append("description", data.description || "");
            formData.append("file", data.file[0]);

            const res = await api.post("/docs", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                },
            });
            toast.success("Document uploaded");
            reset();
            navigate("/");
        } catch (err) {
            console.error("Upload failed", err);
            toast.error(err?.response?.data?.message || "Upload failed");
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-screen-lg mx-auto">
                    <Link to="/" className="btn btn-ghost mb-4">
                        <ArrowLeftIcon />
                        Back To Documents
                    </Link>
                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <h2 className="card-title text-2xl mb-4">Create Document</h2>
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="title">Title</label>
                                    <input id="title" {...register("title")} className="input input-bordered" />
                                    {errors.title && <p className="text-red-500 mt-1">{errors.title.message}</p>}
                                </div>
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="author">Author</label>
                                    <input id="author" {...register("author")} className="input input-bordered" />
                                    {errors.author && <p className="text-red-500 mt-1">{errors.author.message}</p>}
                                </div>
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="description">Description</label>
                                    <textarea id="description" {...register("description")} className="textarea textarea-bordered" rows="4" />
                                    {errors.description && <p className="text-red-500 mt-1">{errors.description.message}</p>}
                                </div>
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="file">File</label>
                                    <input id="file" type="file" {...register("file")} className="file-input" />
                                    {errors.file && <p className="text-red-500 mt-1">{errors.file.message}</p>}
                                </div>
                                <div className="form-control mt-4">
                                    <button type="submit" className="uppercase font-mono btn bg-resdes-green text-slate-950 hover:bg-resdes-green hover:opacity-[.8] transition-opacity duration-300" disabled={loading}>
                                        {loading ? `Uploading (${uploadProgress}%)` : "Upload Document"}
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
