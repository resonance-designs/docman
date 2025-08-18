/*
 * @name CreateBookPage
 * @file /docman/frontend/src/pages/CreateBookPage.jsx
 * @page CreateBookPage
 * @description Book creation page with form for adding new books using shared design patterns
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import { useNavigate, Link } from "react-router";
import { ArrowLeftIcon, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";

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
import StakeholderSelection from "../components/forms/StakeholderSelection";
import InlineLoader from "../components/InlineLoader";

// Book creation schema with required documents
const createBookSchema = z.object({
    title: z.string().min(1, { message: "Book title is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    category: z.string().min(1, { message: "Category is required" }),
    documents: z.array(z.string()).min(1, { message: "At least one document must be selected" }),
    owners: z.array(z.string()).optional(),
});

// Default form values
const defaultFormValues = {
    title: "",
    description: "",
    category: "",
    documents: [],
    owners: [],
};

/**
 * Page component for creating new books with document selection and metadata
 * @returns {JSX.Element} The create book page component
 */
const CreateBookPage = () => {
    const navigate = useNavigate();

    // Form setup with shared schema
    const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm({
        resolver: zodResolver(createBookSchema),
        defaultValues: defaultFormValues,
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

    /**
     * Handle form submission
     * @param {Object} data - Form data from react-hook-form
     */
    const onSubmit = async (data) => {
        try {
            const response = await api.post("/books", {
                title: data.title,
                description: data.description,
                category: data.category,
                documents: documentManagement.selectedDocuments,
                owners: selectedOwners
            });

            toast.success("Book created successfully");
            reset();
            setSelectedOwners([]);
            documentManagement?.resetDocuments?.();
            navigate(`/books/${response.data.book._id}`);
        } catch (err) {
            console.error("Book creation failed", err);
            toast.error(err?.response?.data?.message || "Book creation failed");
        }
    };

    // Show loading state
    if (formDataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <InlineLoader message="Loading form data..." size="lg" color="teal" />
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

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
                            <BookOpen className="size-8 text-resdes-orange" />
                            Create Book
                        </h1>
                    </div>
                    <Link to="/books" className="btn btn-ghost mb-4">
                        <ArrowLeftIcon />
                        Back To Books
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
                                        {users.filter(user => !selectedOwners.includes(user._id)).map((user) => (
                                            <option key={user._id} value={user._id}>
                                                {`${user.firstname || ""} ${user.lastname || ""}`.trim()} ({user.email})
                                            </option>
                                        ))}
                                    </select>

                                    {/* Selected Owners Chips */}
                                    <div className="flex flex-wrap gap-2">
                                        {selectedOwners.map((ownerId) => {
                                            const user = users.find(u => u._id === ownerId);
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
                                        Create Book
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

export default CreateBookPage;