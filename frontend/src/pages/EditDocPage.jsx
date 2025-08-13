/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon, X } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import api from "../lib/axios";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

/** Edit schema: file is optional */
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
        .optional()
        .refine(
            (f) => !f || f.length === 0 || f.length === 1,
            "Only one file allowed"
        )
        .refine(
            (f) => !f || !f[0] || ALLOWED_TYPES.includes(f[0].type),
            "Unsupported file type"
        )
        .refine(
            (f) => !f || !f[0] || f[0].size <= MAX_FILE_SIZE,
            "File too large"
        ),
});

const EditDocPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);

    // chips state
    const [selectedStakeholders, setSelectedStakeholders] = useState([]);
    const [selectedOwners, setSelectedOwners] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isDirty, dirtyFields },
        reset,
        setValue,
        getValues,
    } = useForm({
            resolver: zodResolver(schema),
            defaultValues: {
                title: "",
                author: "",
                description: "",
                category: "",
                reviewDate: null,
                stakeholders: [],
                owners: [],
                file: undefined,
            },
    });

    const getFullName = (user) => `${user.firstname || ""} ${user.lastname || ""}`.trim();

    // Initial load: doc + lists
    useEffect(() => {
        (async () => {
            try {
                const [docRes, usersRes, catsRes] = await Promise.all([
                    api.get(`/docs/${id}`),
                    api.get("/users"),
                    api.get("/categories"),
                ]);
                const doc = docRes.data;
                setUsers(usersRes.data || []);
                setCategories(catsRes.data || []);

                // Debug: Log the structure of stakeholders and owners
                console.log("Document stakeholders:", doc.stakeholders);
                console.log("Document owners:", doc.owners);

                // Normalize incoming values - extract _id from populated User objects
                const mappedStakeholders = (doc.stakeholders || []).map(stakeholder =>
                    stakeholder?._id ? String(stakeholder._id) : String(stakeholder || "")
                );
                const mappedOwners = (doc.owners || []).map(owner =>
                    owner?._id ? String(owner._id) : String(owner || "")
                );

                console.log("Mapped stakeholders:", mappedStakeholders);
                console.log("Mapped owners:", mappedOwners);

                reset({
                    title: doc.title || "",
                    author: doc.author?._id ? String(doc.author._id) : String(doc.author || ""),
                    description: doc.description || "",
                    category: doc.category?._id ? String(doc.category._id) : String(doc.category || ""),
                    reviewDate: doc.reviewDate ? new Date(doc.reviewDate) : null,
                    stakeholders: mappedStakeholders,
                    owners: mappedOwners,
                });

                setSelectedStakeholders(mappedStakeholders);
                setSelectedOwners(mappedOwners);
            } catch (err) {
                console.error("Failed to load edit data", err);
                toast.error(err?.response?.data?.message || "Failed to load document");
                navigate("/");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate, reset]);

    // Stakeholders handlers
    const handleStakeholderAdd = (userId) => {
        if (!userId) return;
        if (!selectedStakeholders.includes(userId)) {
            const next = [...selectedStakeholders, userId];
            setSelectedStakeholders(next);
            setValue("stakeholders", next, { shouldDirty: true });
        }
    };
    const handleStakeholderRemove = (userId) => {
        const next = selectedStakeholders.filter((id) => id !== userId);
        setSelectedStakeholders(next);
        setValue("stakeholders", next, { shouldDirty: true });
    };

    // Owners handlers
    const handleOwnerAdd = (userId) => {
        if (!userId) return;
        if (!selectedOwners.includes(userId)) {
            const next = [...selectedOwners, userId];
            setSelectedOwners(next);
            setValue("owners", next, { shouldDirty: true });
        }
    };
    const handleOwnerRemove = (userId) => {
        const next = selectedOwners.filter((id) => id !== userId);
        setSelectedOwners(next);
        setValue("owners", next, { shouldDirty: true });
    };

    const onSubmit = async (data) => {
        setSaving(true);
        try {
            const formData = new FormData();

            // Minimal send: only changed fields (nice-to-have)
            // We’ll still be safe to include required fields if changed.
            const maybeAppend = (key, value) => {
                // if dirty tracking fails for arrays/controllers, just append when present
                if (dirtyFields[key] || key === "stakeholders" || key === "owners") {
                    if (value !== undefined && value !== null && value !== "") {
                        formData.append(key, value);
                    }
                }
            };

            maybeAppend("title", data.title);
            maybeAppend("author", data.author);
            maybeAppend("description", data.description);
            maybeAppend("category", data.category);

            if (data.reviewDate) {
                formData.append("reviewDate", data.reviewDate.toISOString());
            }

            if (data.stakeholders && data.stakeholders.length > 0) {
                formData.append("stakeholders", JSON.stringify(data.stakeholders));
            } else if (dirtyFields.stakeholders) {
                // Explicitly clear if user removed all
                formData.append("stakeholders", JSON.stringify([]));
            }

            if (data.owners && data.owners.length > 0) {
                formData.append("owners", JSON.stringify(data.owners));
            } else if (dirtyFields.owners) {
                formData.append("owners", JSON.stringify([]));
            }

            // Optional file replace
            if (data.file && data.file.length) {
                formData.append("file", data.file[0]);
            }

            // Debug
            // for (const [k, v] of formData.entries()) console.log("PUT fd", k, v);

            await api.put(`/docs/${id}`, formData, {
                onUploadProgress: (evt) => {
                    const pct = Math.round((evt.loaded * 100) / (evt.total || 1));
                    setUploadProgress(pct);
                },
            });

            toast.success("Document updated");
            navigate(`/doc/${id}`);
        } catch (err) {
            console.error("Update failed", err);
            toast.error(err?.response?.data?.message || "Update failed");
        } finally {
            setSaving(false);
            setUploadProgress(0);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                <p className="text-center text-resdes-teal">Loading document…</p>
                </div>
            </div>
        );
    }

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
                            <h2 className="card-title text-2xl mb-4">Edit Document</h2>

                            <form onSubmit={handleSubmit(onSubmit)}>
                                {/* Title */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="title">Title</label>
                                    <input id="title" {...register("title")} className="input input-bordered" />
                                    {errors.title && <p className="text-red-500 mt-1">{errors.title.message}</p>}
                                </div>

                                {/* Author */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="author">Author</label>
                                    <select id="author" {...register("author")} className="select select-bordered">
                                        <option value="">Select an author</option>
                                        {users.map((u) => (
                                        <option key={u._id} value={u._id}>{getFullName(u)}</option>
                                        ))}
                                    </select>
                                    {errors.author && <p className="text-red-500 mt-1">{errors.author.message}</p>}
                                </div>

                                {/* Category */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="category">Category</label>
                                    <select id="category" {...register("category")} className="select select-bordered">
                                        <option value="">Select a category</option>
                                        {categories.map((c) => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
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

                                {/* Stakeholders */}
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
                                            .filter((u) => !selectedStakeholders.includes(u._id))
                                            .map((u) => (
                                                <option key={u._id} value={u._id}>{getFullName(u)}</option>
                                            ))
                                        }
                                    </select>

                                    {selectedStakeholders.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-600 mb-2">Selected stakeholders:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedStakeholders.map((uid) => {
                                                    const u = users.find((x) => x._id === uid);
                                                    return u ? (
                                                        <div key={uid} className="badge badge-primary gap-2">
                                                            {getFullName(u)}
                                                            <button type="button" onClick={() => handleStakeholderRemove(uid)} className="btn btn-xs btn-circle btn-ghost">
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Owners */}
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
                                            .filter((u) => !selectedOwners.includes(u._id))
                                            .map((u) => (
                                                <option key={u._id} value={u._id}>{getFullName(u)}</option>
                                            ))
                                        }
                                    </select>

                                    {selectedOwners.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-600 mb-2">Selected owners:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedOwners.map((uid) => {
                                                    const u = users.find((x) => x._id === uid);
                                                    return u ? (
                                                        <div key={uid} className="badge badge-secondary gap-2">
                                                            {getFullName(u)}
                                                            <button type="button" onClick={() => handleOwnerRemove(uid)} className="btn btn-xs btn-circle btn-ghost">
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
                                    <label className="label" htmlFor="reviewDate">Opens For Review:</label>
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

                                {/* Optional File Replace */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="file">Replace File (optional)</label>
                                    <input id="file" type="file" {...register("file")} className="file-input" />
                                    {errors.file && <p className="text-red-500 mt-1">{errors.file.message}</p>}
                                </div>

                                {/* Submit */}
                                <div className="form-control mt-4">
                                    <button
                                        type="submit"
                                        className="uppercase font-mono btn bg-resdes-green text-slate-950 hover:bg-resdes-green hover:opacity-[.8] transition-opacity duration-300"
                                        disabled={saving}
                                    >
                                        {saving ? `Saving (${uploadProgress}%)` : "Save Changes"}
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

export default EditDocPage;
