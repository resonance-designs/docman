/*
 * @name AnalyticsPage
 * @file /docman/frontend/src/pages/CreateCatPage.jsx
 * @page CreateCatPage
 * @description Category creation page with form for adding new document categories
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeftIcon, FolderPlus } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
    name: z.string().min(1, { message: "Category name is required" }),
    description: z.string().optional(),
    type: z.enum(["Document", "Book"], { message: "Category type is required" }),
});

const CreateCatPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset } = useForm({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const res = await api.post("/categories", {
                name: data.name,
                description: data.description || "",
                type: data.type
            });

            toast.success("Category created successfully");
            reset();
            navigate("/"); // Or navigate to a categories list page if you have one
        } catch (err) {
            console.error("Category creation failed", err);

            // Handle specific error messages
            if (err?.response?.status === 409) {
                toast.error("Category already exists");
            } else {
                toast.error(err?.response?.data?.message || "Category creation failed");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
                            <FolderPlus className="size-8 text-resdes-orange" />
                            Create Category
                        </h1>
                    </div>
                    <Link to="/categories" className="btn btn-ghost mb-4">
                        <ArrowLeftIcon />
                        Back To Categories
                    </Link>
                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <form onSubmit={handleSubmit(onSubmit)}>
                                {/* Category Name */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="name">
                                        <span className="label-text">Category Name</span>
                                    </label>
                                    <input
                                        id="name"
                                        {...register("name")}
                                        className="input input-bordered"
                                        placeholder="Enter category name"
                                    />
                                    {errors.name && <p className="text-red-500 mt-1">{errors.name.message}</p>}
                                </div>

                                {/* Type */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="type">
                                        <span className="label-text">Type</span>
                                    </label>
                                    <select
                                        id="type"
                                        {...register("type")}
                                        className="select select-bordered"
                                        defaultValue="Document"
                                    >
                                        <option value="Document">Document</option>
                                        <option value="Book">Book</option>
                                    </select>
                                    {errors.type && <p className="text-red-500 mt-1">{errors.type.message}</p>}
                                </div>

                                {/* Description */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="description">
                                        <span className="label-text">Description (Optional)</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        {...register("description")}
                                        className="textarea textarea-bordered"
                                        rows="4"
                                        placeholder="Enter category description"
                                    />
                                    {errors.description && <p className="text-red-500 mt-1">{errors.description.message}</p>}
                                </div>

                                {/* Submit Button */}
                                <div className="form-control mt-6">
                                    <button
                                        type="submit"
                                        className="uppercase font-mono btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300" 
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            'Creating Category...'
                                        ) : (
                                            <>
                                                <FolderPlus className="size-5" />
                                                <span>Create Category</span>
                                            </>
                                        )}
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

export default CreateCatPage;