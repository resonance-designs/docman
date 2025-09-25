/*
 * @name EditBookPage
 * @file /docman/frontend/src/pages/EditBookPage.jsx
 * @page EditBookPage
 * @description Book editing page with form for updating existing books using shared design patterns
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import { useNavigate, useParams, Link } from "react-router";
import { ArrowLeftIcon, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { ensureArray } from "../lib/safeUtils";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Import shared components and hooks
import {
    useFormData,
    useDocumentManagement
} from "../hooks";
import BookBasicFields from "../components/forms/BookBasicFields";
import DocumentSelection from "../components/forms/DocumentSelection";
import InlineLoader from "../components/InlineLoader";
import { useState, useEffect } from "react";

// Book editing schema - temporarily make documents optional to debug
const editBookSchema = z.object({
    title: z.string().min(1, { message: "Book title is required" }),
    description: z.string().optional(),
    category: z.string().min(1, { message: "Category is required" }),
    documents: z.array(z.string()).optional(),
    owners: z.array(z.string()).optional(),
});

/**
 * Page component for editing existing books with document selection and metadata
 * @returns {JSX.Element} The edit book page component
 */
const EditBookPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);

    // Form setup with shared schema
    const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm({
        resolver: zodResolver(editBookSchema),
        defaultValues: {
            title: "",
            description: "",
            category: "",
            documents: [],
            owners: [],
        }
    });

    // Custom hooks for complex state management
    const formDataResult = useFormData({
        loadUsers: true,
        loadCategories: true,
        loadExternalContactTypes: false // Not needed for books
    });
    
    const { 
        users: rawUsers = [], 
        categories: rawCategories = [], 
        loading: formDataLoading 
    } = formDataResult || {};
    
    // Ensure arrays are always arrays to prevent .map() errors
    const users = Array.isArray(rawUsers) ? rawUsers : [];
    // Filter categories to only show Book type categories
    const allCategories = Array.isArray(rawCategories) ? rawCategories : [];
    const categories = allCategories.filter(cat => cat.type === 'Book');
    
    const documentManagement = useDocumentManagement(setValue);
    
    // Simple owner management state (Books don't have stakeholders, only owners)
    const [selectedOwners, setSelectedOwners] = useState([]);
    
    // Owner management functions
    const handleOwnerAdd = (userId) => {
        if (!selectedOwners.includes(userId)) {
            const newOwners = [...selectedOwners, userId];
            setSelectedOwners(newOwners);
            setValue('owners', newOwners);
        }
    };
    
    const handleOwnerRemove = (userId) => {
        const newOwners = selectedOwners.filter(id => id !== userId);
        setSelectedOwners(newOwners);
        setValue('owners', newOwners);
    };

    // Load book data
    useEffect(() => {
        const fetchBook = async () => {
            try {
                setInitialLoading(true);
                const response = await api.get(`/books/${id}`);
                const bookData = response.data.book;
                setBook(bookData);

                // Set form values
                setValue('title', bookData.title);
                setValue('description', bookData.description || '');
                setValue('category', bookData.category._id);
                
                // Initialize document and owner management with existing data
                const existingDocuments = bookData.documents?.map(doc => doc._id) || [];
                const existingOwners = bookData.owners?.map(owner => owner._id) || [];
                
                documentManagement.updateDocuments(existingDocuments);
                setSelectedOwners(existingOwners);
                setValue('owners', existingOwners);
                
            } catch (error) {
                console.error("Failed to fetch book:", error);
                toast.error("Failed to load book data");
                navigate("/books");
            } finally {
                setInitialLoading(false);
            }
        };

        if (id) {
            fetchBook();
        }
    }, [id]); // Only depend on id to prevent infinite loops

    /**
     * Handle form submission
     * @param {Object} data - Form data from react-hook-form
     */
    const onSubmit = async (data) => {
        try {
            // Ensure we have valid arrays for documents and owners
            const documentsToSubmit = Array.isArray(documentManagement.selectedDocuments) 
                ? documentManagement.selectedDocuments 
                : [];
            const ownersToSubmit = Array.isArray(selectedOwners) 
                ? selectedOwners 
                : [];
                
            // Validate required fields
            if (!data.title || !data.category) {
                toast.error("Title and category are required");
                return;
            }
                
            const payload = {
                title: data.title.trim(),
                description: data.description ? data.description.trim() : "",
                category: data.category,
                documents: documentsToSubmit,
                owners: ownersToSubmit
            };
            
            console.log("EditBookPage: Submitting data:", payload);
            console.log("EditBookPage: Form data:", data);
            console.log("EditBookPage: Book ID:", id);
            console.log("EditBookPage: API URL:", `/books/${id}`);
            console.log("EditBookPage: Document management state:", documentManagement);
            console.log("EditBookPage: Selected owners:", selectedOwners);
            
            const response = await api.put(`/books/${id}`, payload);

            toast.success("Book updated successfully");
            navigate(`/books/${id}`);
        } catch (err) {
            console.error("Book update failed", err);
            console.error("Book update error response:", err.response);
            console.error("Book update error data:", err.response?.data);
            toast.error(err?.response?.data?.message || "Book update failed");
        }
    };

    // Show loading state
    if (initialLoading || formDataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <InlineLoader message="Loading book data..." size="lg" color="teal" />
            </div>
        );
    }

    // Show error state if form data failed to load
    if (formDataResult?.error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="alert alert-error max-w-md">
                    <div>
                        <h3 className="font-bold">Failed to load form data</h3>
                        <div className="text-xs">Please refresh the page or check your connection.</div>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state if book not found
    if (!book) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center py-12">
                    <BookOpen className="size-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">Book not found</h3>
                    <Link to="/books" className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80">
                        Back to Books
                    </Link>
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
                                {/* Basic Book Fields - Using shared component pattern */}
                                <BookBasicFields
                                    register={register}
                                    control={control}
                                    errors={errors}
                                    categories={categories}
                                />

                                {/* Document Selection - Using shared component pattern */}
                                <DocumentSelection
                                    selectedDocuments={documentManagement.selectedDocuments}
                                    onDocumentAdd={documentManagement.handleDocumentAdd}
                                    onDocumentRemove={documentManagement.handleDocumentRemove}
                                    validationError={errors.documents?.message}
                                />

                                {/* Owners Selection - Using shared component pattern */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold">Owners</span>
                                    </label>
                                    <p className="text-sm text-gray-600 mb-2">
                                        Select users who have ownership responsibility for this book
                                    </p>
                                    
                                    {/* Owner Selection Dropdown */}
                                    <select 
                                        className="select select-bordered mb-3"
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleOwnerAdd(e.target.value);
                                                e.target.value = ""; // Reset selection
                                            }
                                        }}
                                    >
                                        <option value="">Add an owner...</option>
                                        {ensureArray(users).filter(user => !selectedOwners.includes(user._id)).map((user) => (
                                            <option key={user._id} value={user._id}>
                                                {`${user.firstname || ""} ${user.lastname || ""}`.trim()} ({user.email})
                                            </option>
                                        ))}
                                    </select>

                                    {/* Selected Owners Chips */}
                                    <div className="flex flex-wrap gap-2">
                                        {selectedOwners.map((ownerId) => {
                                            const user = ensureArray(users).find(u => u._id === ownerId);
                                            if (!user) return null;
                                            
                                            return (
                                                <div 
                                                    key={ownerId} 
                                                    className="badge badge-secondary gap-2 p-3"
                                                >
                                                    <span>{`${user.firstname || ""} ${user.lastname || ""}`.trim()}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOwnerRemove(ownerId)}
                                                        className="btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {selectedOwners.length === 0 && (
                                        <p className="text-sm text-gray-500 italic">No owners selected</p>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <div className="form-control mt-4">
                                    <button type="submit" className="uppercase font-mono btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300">
                                        <BookOpen className="size-5" />
                                        Update Book
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