/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeftIcon, FilePlus2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/html",
    "application/xml",
    "text/xml",
    "text/rtf",
    "text/plain",
    "text/markdown",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
];

// Review interval options
const REVIEW_INTERVALS = [
    { value: "1mo", label: "1 Month", months: 1 },
    { value: "3mo", label: "3 Months", months: 3 },
    { value: "6mo", label: "6 Months", months: 6 },
    { value: "1yr", label: "1 Year", months: 12 }
];

const schema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    author: z.string().min(1, { message: "Author is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    category: z.string().min(1, { message: "Category is required" }),
    reviewInterval: z.string().min(1, { message: "Review interval is required" }),
    stakeholders: z.array(z.string()).optional(),
    owners: z.array(z.string()).optional(),
    file: z
        .any()
        .refine((f) => f?.length === 1, "File is required")
        .refine((f) => f && f[0] && ALLOWED_TYPES.includes(f[0].type), "Unsupported file type. Please upload a PDF, Word document, Excel spreadsheet, or image file.")
        .refine((f) => f && f[0] && f[0].size <= MAX_FILE_SIZE, "File too large. Maximum size is 10MB."),
    // Review assignments
    reviewAssignees: z.array(z.string()).optional(),
    reviewDueDate: z.date().optional(),
    reviewNotes: z.string().optional(),
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

    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            stakeholders: [],
            owners: [],
            reviewAssignees: [],
            reviewNotes: ""
        }
    });

    // State for review assignments
    const [reviewAssignees, setReviewAssignees] = useState([]);
    const [reviewDueDate, setReviewDueDate] = useState(null);

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

    // Calculate review date based on interval
    const calculateReviewDate = (intervalValue) => {
        const interval = REVIEW_INTERVALS.find(i => i.value === intervalValue);
        if (!interval) return new Date();

        const reviewDate = new Date();
        reviewDate.setMonth(reviewDate.getMonth() + interval.months);
        return reviewDate;
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

    // Review assignment handlers
    const handleReviewAssigneeAdd = (userId) => {
        if (!userId) return;
        if (!reviewAssignees.includes(userId)) {
            const next = [...reviewAssignees, userId];
            setReviewAssignees(next);
            setValue('reviewAssignees', next);
        }
    };

    const handleReviewAssigneeRemove = (userId) => {
        const next = reviewAssignees.filter(id => id !== userId);
        setReviewAssignees(next);
        setValue('reviewAssignees', next);
    };

    const handleReviewDueDateChange = (date) => {
        setReviewDueDate(date);
        setValue('reviewDueDate', date);
    };

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("title", data.title);
            formData.append("author", data.author);
            formData.append("description", data.description);
            formData.append("category", data.category);

            // Calculate and append reviewDate based on interval
            const reviewDate = calculateReviewDate(data.reviewInterval);
            formData.append("reviewDate", reviewDate.toISOString());

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

            // Create review assignments if specified
            if (reviewAssignees.length > 0 && reviewDueDate) {
                try {
                    const reviewData = {
                        documentId: res.data.doc._id,
                        assignments: reviewAssignees.map(assignee => ({
                            assignee,
                            dueDate: reviewDueDate.toISOString(),
                            notes: data.reviewNotes || ""
                        }))
                    };
                    
                    await api.post("/reviews", reviewData);
                    toast.success("Review assignments created successfully");
                } catch (reviewErr) {
                    console.error("Failed to create review assignments", reviewErr);
                    toast.error("Document created but failed to create review assignments");
                }
            }

            toast.success("Document uploaded successfully");
            reset();
            setSelectedStakeholders([]);
            setSelectedOwners([]);
            setReviewAssignees([]);
            setReviewDueDate(null);
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
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
                            <FilePlus2 className="size-8 text-resdes-orange" />
                            Create Document
                        </h1>
                    </div>
                    <Link to="/" className="btn btn-ghost mb-4">
                        <ArrowLeftIcon />
                        Back To Documents
                    </Link>
                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <form onSubmit={handleSubmit(onSubmit)}>
                                {/* Title */}
                                <div className="form-control mb-4">
                                    <label className="label font-semibold" htmlFor="title">Title</label>
                                    <input id="title" {...register("title")} className="input input-bordered" placeholder="Enter document title" />
                                    {errors.title && <p className="text-red-500 mt-1">{errors.title.message}</p>}
                                </div>

                                {/* Author Dropdown */}
                                <div className="form-control mb-4">
                                    <label className="label font-semibold" htmlFor="author">Author</label>
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
                                    <label className="label font-semibold" htmlFor="category">Category</label>
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

                                {/* Review Interval Dropdown */}
                                <div className="form-control mb-4">
                                    <label className="label font-semibold" htmlFor="reviewInterval">Review Every</label>
                                    <select id="reviewInterval" {...register("reviewInterval")} className="select select-bordered">
                                        <option value="">Select review interval</option>
                                        {REVIEW_INTERVALS.map((interval) => (
                                            <option key={interval.value} value={interval.value}>
                                                {interval.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.reviewInterval && <p className="text-red-500 mt-1">{errors.reviewInterval.message}</p>}
                                </div>

                                {/* Description */}
                                <div className="form-control mb-4">
                                    <label className="label font-semibold" htmlFor="description">Description</label>
                                    <textarea id="description" {...register("description")} className="textarea textarea-bordered" rows="4" placeholder="Enter document description" />
                                    {errors.description && <p className="text-red-500 mt-1">{errors.description.message}</p>}
                                </div>

                                {/* Stakeholders Multi-select */}
                                <div className="form-control mb-4">
                                    <label className="label font-semibold">Stakeholders</label>
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
                                    <label className="label font-semibold">Owners</label>
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

                                {/* Review Assignments Section */}
                                <div className="form-control mb-4">
                                    <label className="label font-semibold">Review Assignments</label>
                                    <p className="text-sm text-gray-600 mb-2">Schedule reviewers for this document</p>
                                    
                                    {/* Review Due Date */}
                                    <div className="form-control mb-4">
                                        <label className="label" htmlFor="reviewDueDate">Review Due Date</label>
                                        <input
                                            id="reviewDueDate"
                                            type="date"
                                            {...register("reviewDueDate")}
                                            onChange={(e) => handleReviewDueDateChange(e.target.value ? new Date(e.target.value) : null)}
                                            className="input input-bordered"
                                        />
                                    </div>
                                    
                                    {/* Review Assignees Multi-select */}
                                    <div className="form-control mb-4">
                                        <label className="label">Review Assignees</label>
                                        <select
                                            className="select select-bordered"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleReviewAssigneeAdd(e.target.value);
                                                    e.target.value = "";
                                                }
                                            }}
                                        >
                                            <option value="">Add a reviewer</option>
                                            {users
                                                .filter(user => !reviewAssignees.includes(user._id))
                                                .map((user) => (
                                                    <option key={user._id} value={user._id}>
                                                        {getFullName(user)}
                                                    </option>
                                                ))}
                                        </select>

                                        {/* Selected Review Assignees */}
                                        {reviewAssignees.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-600 mb-2">Selected reviewers:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {reviewAssignees.map((userId) => {
                                                        const user = users.find(u => u._id === userId);
                                                        return user ? (
                                                            <div key={userId} className="badge badge-accent gap-2">
                                                                {getFullName(user)}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleReviewAssigneeRemove(userId)}
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
                                    
                                    {/* Review Notes */}
                                    <div className="form-control mb-4">
                                        <label className="label" htmlFor="reviewNotes">Review Notes (Optional)</label>
                                        <textarea
                                            id="reviewNotes"
                                            {...register("reviewNotes")}
                                            className="textarea textarea-bordered"
                                            rows="3"
                                            placeholder="Add any notes for the reviewers..."
                                        />
                                    </div>
                                </div>

                                {/* File Upload */}
                                <div className="form-control mb-4">
                                    <label className="label font-semibold" htmlFor="file">File</label>
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