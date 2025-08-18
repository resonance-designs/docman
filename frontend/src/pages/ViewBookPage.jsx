/*
 * @name ViewBookPage
 * @file /docman/frontend/src/pages/ViewBookPage.jsx
 * @page ViewBookPage
 * @description Individual book view page showing book details and contained documents
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeftIcon, BookOpen, Edit, Trash2, FileText, Users, Briefcase, Calendar, User } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { useUserRole } from "../hooks";
import { useConfirmationContext } from "../context/ConfirmationContext";
import InlineLoader from "../components/InlineLoader";

const ViewBookPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userRole } = useUserRole();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBook();
    }, [id]);

    const fetchBook = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/books/${id}`);
            setBook(response.data.book);
        } catch (error) {
            console.error("Error fetching book:", error);
            toast.error("Failed to fetch book details");
            navigate("/books");
        } finally {
            setLoading(false);
        }
    };

    const { confirm } = useConfirmationContext();
    
    const handleDeleteBook = async () => {
        confirm({
            title: "Delete Book",
            message: `Are you sure you want to delete "${book?.title}"? This action cannot be undone.`,
            actionName: "Delete",
            onConfirm: async () => {
                try {
                    await api.delete(`/books/${id}`);
                    toast.success("Book deleted successfully");
                    navigate("/books");
                } catch (error) {
                    console.error("Error deleting book:", error);
                    toast.error("Failed to delete book");
                }
            }
        });
    };

    const canEditBook = userRole === 'admin' || userRole === 'editor' || book?.isOwner;

    if (loading) {
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
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <Link to="/books" className="btn btn-ghost mb-2">
                                <ArrowLeftIcon />
                                Back to Books
                            </Link>
                            <h1 className="text-4xl font-bold flex items-center gap-2">
                                <BookOpen className="size-8 text-resdes-orange" />
                                {book.title}
                            </h1>
                        </div>
                        {canEditBook && (
                            <div className="flex gap-2">
                                <Link to={`/books/${book._id}/edit`} className="btn btn-ghost">
                                    <Edit className="size-4" />
                                    Edit
                                </Link>
                                <button
                                    onClick={handleDeleteBook}
                                    className="btn btn-ghost text-red-500 hover:text-red-700"
                                >
                                    <Trash2 className="size-4" />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2">
                            {/* Book Details */}
                            <div className="card bg-base-100 shadow-lg mb-6">
                                <div className="card-body">
                                    <h2 className="card-title text-2xl mb-4">Book Details</h2>
                                    
                                    {book.description && (
                                        <div className="mb-4">
                                            <h3 className="font-semibold mb-2">Description</h3>
                                            <p className="text-gray-700">{book.description}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="flex items-center gap-2 mb-2">
                                                <User className="size-4 text-gray-500" />
                                                <strong>Author:</strong> {book.author?.name}
                                            </p>
                                            <p className="flex items-center gap-2 mb-2">
                                                <BookOpen className="size-4 text-gray-500" />
                                                <strong>Category:</strong> {book.category?.name}
                                            </p>
                                            <p className="flex items-center gap-2 mb-2">
                                                <FileText className="size-4 text-gray-500" />
                                                <strong>Documents:</strong> {book.documentCount || 0}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="flex items-center gap-2 mb-2">
                                                <Calendar className="size-4 text-gray-500" />
                                                <strong>Created:</strong> {new Date(book.createdAt).toLocaleDateString()}
                                            </p>
                                            <p className="flex items-center gap-2 mb-2">
                                                <Calendar className="size-4 text-gray-500" />
                                                <strong>Updated:</strong> {new Date(book.updatedAt).toLocaleDateString()}
                                            </p>
                                            {book.lastUpdatedBy && (
                                                <p className="flex items-center gap-2 mb-2">
                                                    <User className="size-4 text-gray-500" />
                                                    <strong>Last Updated By:</strong> {book.lastUpdatedBy.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            <div className="card bg-base-100 shadow-lg">
                                <div className="card-body">
                                    <h2 className="card-title text-xl mb-4">
                                        <FileText className="size-5 text-resdes-orange" />
                                        Documents ({book.documents?.length || 0})
                                    </h2>
                                    
                                    {book.documents && book.documents.length > 0 ? (
                                        <div className="space-y-3">
                                            {book.documents.map(doc => (
                                                <div key={doc._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-lg mb-1">
                                                                <Link to={`/doc/${doc._id}`} className="hover:text-resdes-orange transition-colors">
                                                                    {doc.title}
                                                                </Link>
                                                            </h3>
                                                            {doc.description && (
                                                                <p className="text-gray-600 text-sm mb-2">
                                                                    {doc.description.length > 150 
                                                                        ? `${doc.description.substring(0, 150)}...` 
                                                                        : doc.description
                                                                    }
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                                <span>Review Date: {new Date(doc.reviewDate).toLocaleDateString()}</span>
                                                                <span className={`px-2 py-1 rounded-full ${
                                                                    doc.reviewCompleted 
                                                                        ? 'bg-green-100 text-green-800' 
                                                                        : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                    {doc.reviewCompleted ? 'Reviewed' : 'Pending Review'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Link to={`/doc/${doc._id}`} className="btn btn-sm btn-ghost">
                                                            View
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <FileText className="size-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500">No documents in this book yet</p>
                                            {canEditBook && (
                                                <Link to={`/books/${book._id}/edit`} className="btn btn-sm bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80 mt-3">
                                                    Add Documents
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">


                            {/* Owners */}
                            {book.owners && book.owners.length > 0 && (
                                <div className="card bg-base-100 shadow-lg">
                                    <div className="card-body">
                                        <h3 className="card-title text-lg">
                                            <User className="size-5 text-resdes-orange" />
                                            Owners
                                        </h3>
                                        <div className="space-y-2">
                                            {book.owners.map(owner => (
                                                <div key={owner._id} className="flex items-center justify-between">
                                                    <div>
                                                        <span className="block">{owner.name}</span>
                                                        <span className="text-xs text-gray-500">{owner.email}</span>
                                                    </div>
                                                    <Link to={`/user/${owner._id}`} className="btn btn-xs btn-ghost">
                                                        View
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewBookPage;