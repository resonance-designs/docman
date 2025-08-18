/*
 * @name EditBookPage
 * @file /docman/frontend/src/pages/EditBookPage.jsx
 * @page EditBookPage
 * @description Book editing page with form for updating existing books
 * @author Richard Bakos
 * @version 2.1.3
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon, BookOpen, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import InlineLoader from "../components/InlineLoader";

const schema = z.object({
    title: z.string().min(1, { message: "Book title is required" }),
    description: z.string().optional(),
    category: z.string().min(1, { message: "Category is required" }),
    documents: z.array(z.string()).optional(),
    owners: z.array(z.string()).optional(),
});

const EditBookPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [users, setUsers] = useState([]);
    const [book, setBook] = useState(null);

    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            documents: [],
            owners: []
        }
    });

    useEffect(() => {
        fetchBookAndFormData();
    }, [id]);

    const fetchBookAndFormData = async () => {
        try {
            setInitialLoading(true);
            
            // Fetch data with individual error handling
            const results = await Promise.allSettled([
                api.get(`/books/${id}`),
                api.get("/categories"),
                api.get("/docs"),
                api.get("/users")
            ]);

            // Handle book data (required)
            if (results[0].status === 'fulfilled') {
                const bookData = results[0].value.data.book;
                setBook(bookData);

                // Set form values
                setValue('title', bookData.title);
                setValue('description', bookData.description || '');
                setValue('category', bookData.category._id);
                setValue('documents', bookData.documents?.map(doc => doc._id) || []);
                setValue('owners', bookData.owners?.map(owner => owner._id) || []);
            } else {
                console.error("Failed to fetch book:", results[0].reason);
                toast.error("Failed to load book data");
                navigate("/books");
                return;
            }

            // Handle categories
            if (results[1].status === 'fulfilled') {
                const categoriesData = results[1].value.data;
                setCategories(categoriesData.categories?.filter(cat => cat.type === 'Book') || []);
            } else {
                console.error("Failed to fetch categories:", results[1].reason);
            }

            // Handle documents
            if (results[2].status === 'fulfilled') {
                const documentsData = results[2].value.data;
                setDocuments(documentsData.docs || []);
            } else {
                console.error("Failed to fetch documents:", results[2].reason);
            }

            // Handle users
            if (results[3].status === 'fulfilled') {
                const usersData = results[3].value.data;
                setUsers(usersData.users || []);
            } else {
                console.error("Failed to fetch users:", results[3].reason);
            }

        } catch (error) {
            console.error("Error fetching book and form data:", error);
            toast.error("Failed to load book data");
            navigate("/books");
        } finally {
            setInitialLoading(false);
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const response = await api.put(`/books/${id}`, {
                title: data.title,
                description: data.description || "",
                category: data.category,
                documents: data.documents || [],
                owners: data.owners || []
            });

            toast.success("Book updated successfully");
            navigate(`/books/${id}`);
        } catch (err) {
            console.error("Book update failed", err);
            toast.error(err?.response?.data?.message || "Book update failed");
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="max-w-screen-xl mx-auto">
                        <InlineLoader message="Loading book..." size="lg" color="teal" />
                    </div>
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <div className="max-w-screen-xl mx-auto">
                        <div className="text-center py-12">
                            <BookOpen className="size-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">Book not found</h3>
                            <Link to="/books" className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80">
                                Back to Books
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
                            <BookOpen className="size-8 text-resdes-orange" />
                            Edit Book: {book.title}
                        </h1>
                    </div>
                    <Link to={`/books/${id}`} className="btn btn-ghost mb-4">
                        <ArrowLeftIcon />
                        Back to Book
                    </Link>
                    
                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left Column */}
                                    <div>
                                        {/* Book Title */}
                                        <div className="form-control mb-4">
                                            <label className="label" htmlFor="title">
                                                <span className="label-text">Book Title</span>
                                            </label>
                                            <input
                                                id="title"
                                                {...register("title")}
                                                className="input input-bordered"
                                                placeholder="Enter book title"
                                            />
                                            {errors.title && <p className="text-red-500 mt-1">{errors.title.message}</p>}
                                        </div>

                                        {/* Category */}
                                        <div className="form-control mb-4">
                                            <label className="label" htmlFor="category">
                                                <span className="label-text">Category</span>
                                            </label>
                                            <select
                                                id="category"
                                                {...register("category")}
                                                className="select select-bordered"
                                            >
                                                <option value="">Select a category</option>
                                                {categories.map(category => (
                                                    <option key={category._id} value={category._id}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.category && <p className="text-red-500 mt-1">{errors.category.message}</p>}
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
                                                placeholder="Enter book description"
                                            />
                                            {errors.description && <p className="text-red-500 mt-1">{errors.description.message}</p>}
                                        </div>

                                        {/* Documents */}
                                        <div className="form-control mb-4">
                                            <label className="label">
                                                <span className="label-text">Documents (Optional)</span>
                                            </label>
                                            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                                                {documents.map(doc => (
                                                    <label key={doc._id} className="flex items-center space-x-2 p-1">
                                                        <input
                                                            type="checkbox"
                                                            value={doc._id}
                                                            {...register("documents")}
                                                            className="checkbox checkbox-sm"
                                                        />
                                                        <span className="text-sm">{doc.title}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div>
                                        {/* Owners */}
                                        <div className="form-control mb-4">
                                            <label className="label">
                                                <span className="label-text">Owners (Optional)</span>
                                            </label>
                                            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                                                {users.map(user => (
                                                    <label key={user._id} className="flex items-center space-x-2 p-1">
                                                        <input
                                                            type="checkbox"
                                                            value={user._id}
                                                            {...register("owners")}
                                                            className="checkbox checkbox-sm"
                                                        />
                                                        <span className="text-sm">{user.name} ({user.email})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="form-control mt-6">
                                    <button
                                        type="submit"
                                        className="uppercase font-mono btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300" 
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            'Updating Book...'
                                        ) : (
                                            <>
                                                <Save className="size-5" />
                                                <span>Update Book</span>
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

export default EditBookPage;