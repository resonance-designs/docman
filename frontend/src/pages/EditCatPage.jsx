/*
 * @name EditCatPage
 * @file /docman/frontend/src/pages/EditCatPage.jsx
 * @page EditCatPage
 * @description Category editing page with form for updating existing categories
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon, FolderIcon, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import InlineLoader from "../components/InlineLoader";

const schema = z.object({
    name: z.string().min(1, { message: "Category name is required" }),
    description: z.string().optional(),
    type: z.enum(["Document", "Book"], { message: "Category type is required" }),
});

const EditCatPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [category, setCategory] = useState(null);

    const { register, handleSubmit, formState: { errors }, setValue } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            description: "",
            type: "Document"
        }
    });

    useEffect(() => {
        fetchCategory();
    }, [id]);

    const fetchCategory = async () => {
        try {
            setInitialLoading(true);
            const response = await api.get(`/categories`);
            const categories = response.data.categories || [];
            const foundCategory = categories.find(cat => cat._id === id);

            if (!foundCategory) {
                toast.error("Category not found");
                navigate("/categories");
                return;
            }

            setCategory(foundCategory);
            setValue('name', foundCategory.name);
            setValue('description', foundCategory.description || '');
            setValue('type', foundCategory.type || 'Document');
        } catch (error) {
            console.error("Error fetching category:", error);
            toast.error("Failed to load category");
            navigate("/categories");
        } finally {
            setInitialLoading(false);
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            await api.put(`/categories/${id}`, {
                name: data.name,
                description: data.description || "",
                type: data.type
            });

            toast.success("Category updated successfully");
            navigate("/categories");
        } catch (err) {
            console.error("Category update failed", err);

            // Handle specific error messages
            if (err?.response?.status === 409) {
                toast.error("Category name already exists");
            } else {
                toast.error(err?.response?.data?.message || "Category update failed");
            }
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="max-w-screen-xl mx-auto">
                        <InlineLoader message="Loading category..." size="lg" color="teal" />
                    </div>
                </div>
            </div>
        );
    }

    if (!category) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="max-w-screen-xl mx-auto">
                        <div className="text-center py-12">
                            <FolderIcon className="size-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">Category not found</h3>
                            <Link to="/categories" className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80">
                                Back to Categories
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
                            <FolderIcon className="size-8 text-resdes-orange" />
                            Edit Category: {category.name}
                        </h1>
                    </div>
                    <Link to="/categories" className="btn btn-ghost mb-4">
                        <ArrowLeftIcon />
                        Back to Categories
                    </Link>

                    <div className="card bg-base-100 shadow-lg max-w-screen-xl">
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
                                            'Updating Category...'
                                        ) : (
                                            <>
                                                <Save className="size-5" />
                                                <span>Update Category</span>
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

export default EditCatPage;