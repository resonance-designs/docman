/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeftIcon, X } from "lucide-react";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from "react-hot-toast";
import api from "../lib/axios";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const schema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    author: z.string().min(1, { message: "Author is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    category: z.string().min(1, { message: "Category is required" }),
    reviewDate: z.date({ required_error: "Review date is required" }),
    stakeholders: z.array(z.string()).optional(),
    owners: z.array(z.string()).optional(),
    file: z
        .any()
        .refine((f) => f?.length === 1, "File is required")
        .refine((f) => f && f[0] && ALLOWED_TYPES.includes(f[0].type), "Unsupported file type")
        .refine((f) => f && f[0] && f[0].size <= MAX_FILE_SIZE, "File too large"),
});

const CreateDocPage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // State for multi-select stakeholders and owners
    const [selectedStakeholders, setSelectedStakeholders] = useState([]);
    const [selectedOwners, setSelectedOwners] = useState([]);

    const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            stakeholders: [],
            owners: []
        }
    });

    // Load users and categories on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load users - using your existing endpoint
                const usersRes = await api.get("/users");
                setUsers(usersRes.data || []);
                
                // Load categories - new endpoint
                const categoriesRes = await api.get("/categories");
                setCategories(categoriesRes.data || []);
            } catch (err) {
                console.error("Could not load data", err);
                toast.error("Failed to load form data");
            }
        };
        loadData();
    }, []);

    // Helper function to get full name from your User model
    const getFullName = (user) => {
        return `${user.firstname || ''} ${user.lastname || ''}`.trim();
    };

    // Handle stakeholder selection
    const handleStakeholderAdd = (userId) => {
        if (!selectedStakeholders.includes(userId)) {
            const newStakeholders = [...selectedStakeholders, userId];
            setSelectedStakeholders(newStakeholders);
            setValue('stakeholders', newStakeholders);
        }
    };

    // Handle stakeholder removal
    const handleStakeholderRemove = (userId) => {
        const newStakeholders = selectedStakeholders.filter(id => id !== userId);
        setSelectedStakeholders(newStakeholders);
        setValue('stakeholders', newStakeholders);
    };

    // Handle owner selection
    const handleOwnerAdd = (userId) => {
        if (!selectedOwners.includes(userId)) {
            const newOwners = [...selectedOwners, userId];
            setSelectedOwners(newOwners);
            setValue('owners', newOwners);
        }
    };

    // Handle owner removal
    const handleOwnerRemove = (userId) => {
        const newOwners = selectedOwners.filter(id => id !== userId);
        setSelectedOwners(newOwners);
        setValue('owners', newOwners);
    };

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("title", data.title);
            formData.append("author", data.author);
            formData.append("description", data.description);
            formData.append("category", data.category);

            // Append reviewDate as ISO string
            if (data.reviewDate) {
                formData.append("reviewDate", data.reviewDate.toISOString());
            }

            // Append stakeholders and owners as JSON strings
            if (data.stakeholders && data.stakeholders.length > 0) {
                formData.append("stakeholders", JSON.stringify(data.stakeholders));
            }
            if (data.owners && data.owners.length > 0) {
                formData.append("owners", JSON.stringify(data.owners));
            }

            // File
            if (data.file && data.file.length) {
                formData.append("file", data.file[0]);
            }

            // Debug logging
            for (const [key, value] of formData.entries()) {
                console.log("formData", key, value);
            }

            const res = await api.post("/docs", formData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                },
            });

            toast.success("Document uploaded successfully");
            reset();
            setSelectedStakeholders([]);
            setSelectedOwners([]);
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
                                {/* Title */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="title">Title</label>
                                    <input id="title" {...register("title")} className="input input-bordered" />
                                    {errors.title && <p className="text-red-500 mt-1">{errors.title.message}</p>}
                                </div>

                                {/* Author Dropdown */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="author">Author</label>
                                    <select id="author" {...register("author")} className="select select-bordered">
                                        <option value="">Select an author</option>
                                        {users.map((user) => (
                                            <option key={user._id} value={user._id}>
                                                {getFullName(user)}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.author && <p className="text-red-500 mt-1">{errors.author.message}</p>}
                                </div>

                                {/* Category Dropdown */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="category">Category</label>
                                    <select id="category" {...register("category")} className="select select-bordered">
                                        <option value="">Select a category</option>
                                        {categories.map((category) => (
                                            <option key={category._id} value={category._id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.category && <p className="text-red-500 mt-1">{errors.category.message}</p>}
                                </div>

                                {/* Description */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="description">Description</label>
                                    <textarea id="description" {...register("description")} className="textarea textarea-bordered" rows="4" />
                                    {errors.description && <p className="text-red-500 mt-1">{errors.description.message}</p>}
                                </div>

                                {/* Stakeholders Multi-select */}
                                <div className="form-control mb-4">
                                    <label className="label">Stakeholders</label>
                                    <select 
                                        className="select select-bordered"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleStakeholderAdd(e.target.value);
                                                e.target.value = "";
                                            }
                                        }}
                                    >
                                        <option value="">Add a stakeholder</option>
                                        {users
                                            .filter(user => !selectedStakeholders.includes(user._id))
                                            .map((user) => (
                                                <option key={user._id} value={user._id}>
                                                    {getFullName(user)}
                                                </option>
                                            ))}
                                    </select>
                                    
                                    {/* Selected Stakeholders */}
                                    {selectedStakeholders.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-600 mb-2">Selected stakeholders:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedStakeholders.map((userId) => {
                                                    const user = users.find(u => u._id === userId);
                                                    return user ? (
                                                        <div key={userId} className="badge badge-primary gap-2">
                                                            {getFullName(user)}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStakeholderRemove(userId)}
                                                                className="btn btn-xs btn-circle btn-ghost"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Owners Multi-select */}
                                <div className="form-control mb-4">
                                    <label className="label">Owners</label>
                                    <select 
                                        className="select select-bordered"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleOwnerAdd(e.target.value);
                                                e.target.value = "";
                                            }
                                        }}
                                    >
                                        <option value="">Add an owner</option>
                                        {users
                                            .filter(user => !selectedOwners.includes(user._id))
                                            .map((user) => (
                                                <option key={user._id} value={user._id}>
                                                    {getFullName(user)}
                                                </option>
                                            ))}
                                    </select>
                                    
                                    {/* Selected Owners */}
                                    {selectedOwners.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-600 mb-2">Selected owners:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedOwners.map((userId) => {
                                                    const user = users.find(u => u._id === userId);
                                                    return user ? (
                                                        <div key={userId} className="badge badge-secondary gap-2">
                                                            {getFullName(user)}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOwnerRemove(userId)}
                                                                className="btn btn-xs btn-circle btn-ghost"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Review Date */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="reviewDate">Review For</label>
                                    <Controller
                                        name="reviewDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                placeholderText="Select review date"
                                                selected={field.value}
                                                onChange={(date) => field.onChange(date)}
                                                className="input input-bordered w-full"
                                            />
                                        )}
                                    />
                                    {errors.reviewDate && <p className="text-red-500 mt-1">{errors.reviewDate.message}</p>}
                                </div>

                                {/* File Upload */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="file">File</label>
                                    <input id="file" type="file" {...register("file")} className="file-input" />
                                    {errors.file && <p className="text-red-500 mt-1">{errors.file.message}</p>}
                                </div>

                                {/* Submit Button */}
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

export default CreateDocPage;