/*
 * @name DocumentSelection
 * @file /docman/frontend/src/components/forms/DocumentSelection.jsx
 * @component DocumentSelection
 * @description Reusable component for selecting documents using TeamDetailPage pattern with table-based selection
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { FolderIcon, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router";
import api from "../../lib/axios";
import toast from "react-hot-toast";
import { ensureArray } from "../../lib/safeUtils";
import TeamDocumentsTable from "../teams/TeamDocumentsTable";

/**
 * DocumentSelection component for managing document selection using table pattern
 * @param {Object} props - Component props
 * @param {Array} props.selectedDocuments - Array of selected document IDs
 * @param {Function} props.onDocumentAdd - Function to add document
 * @param {Function} props.onDocumentRemove - Function to remove document
 * @param {string} props.validationError - Validation error message
 * @returns {JSX.Element} DocumentSelection component
 */
export default function DocumentSelection({
    selectedDocuments = [],
    onDocumentAdd,
    onDocumentRemove,
    validationError
}) {
    const [allDocuments, setAllDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAvailableDocuments, setSelectedAvailableDocuments] = useState([]);
    const [selectedBookDocuments, setSelectedBookDocuments] = useState([]);

    // Load documents on component mount
    useEffect(() => {
        const loadDocuments = async () => {
            try {
                setLoading(true);
                const response = await api.get("/docs");
                
                // Handle different response structures like HomePage does
                let documentsData = [];
                if (Array.isArray(response.data)) {
                    documentsData = response.data;
                } else if (response.data && Array.isArray(response.data.docs)) {
                    documentsData = response.data.docs;
                } else if (response.data && Array.isArray(response.data.documents)) {
                    documentsData = response.data.documents;
                } else {
                    console.warn("DocumentSelection: Unexpected response structure:", response.data);
                    documentsData = [];
                }
                
                setAllDocuments(Array.isArray(documentsData) ? documentsData : []);
            } catch (error) {
                console.error("DocumentSelection: Failed to load documents:", error);
                toast.error(`Failed to load documents: ${error.response?.data?.message || error.message}`);
                setAllDocuments([]);
            } finally {
                setLoading(false);
            }
        };

        loadDocuments();
    }, []);

    // Get selected documents (documents that are part of the book)
    const safeSelectedDocuments = ensureArray(selectedDocuments);
    const bookDocuments = allDocuments.filter(doc => safeSelectedDocuments.includes(doc._id));

    // Get available documents (documents not yet selected)
    const availableDocuments = allDocuments.filter(doc => !safeSelectedDocuments.includes(doc._id));

    // Handle individual document selection for book documents (to remove)
    const handleBookDocumentSelect = (documentId) => {
        setSelectedBookDocuments(prev => 
            prev.includes(documentId) 
                ? prev.filter(id => id !== documentId)
                : [...prev, documentId]
        );
    };

    // Handle individual document selection for available documents (to add)
    const handleAvailableDocumentSelect = (documentId) => {
        setSelectedAvailableDocuments(prev => 
            prev.includes(documentId) 
                ? prev.filter(id => id !== documentId)
                : [...prev, documentId]
        );
    };

    // Handle select all for book documents
    const handleBookDocumentsSelectAll = (documentIds, selectAll) => {
        if (selectAll) {
            setSelectedBookDocuments(prev => [...new Set([...prev, ...documentIds])]);
        } else {
            setSelectedBookDocuments(prev => prev.filter(id => !documentIds.includes(id)));
        }
    };

    // Handle select all for available documents
    const handleAvailableDocumentsSelectAll = (documentIds, selectAll) => {
        if (selectAll) {
            setSelectedAvailableDocuments(prev => [...new Set([...prev, ...documentIds])]);
        } else {
            setSelectedAvailableDocuments(prev => prev.filter(id => !documentIds.includes(id)));
        }
    };

    // Handle removing documents from book
    const handleRemoveDocumentsFromBook = () => {
        if (selectedBookDocuments.length === 0) {
            toast.error("Please select documents to remove");
            return;
        }

        selectedBookDocuments.forEach(docId => {
            onDocumentRemove(docId);
        });
        setSelectedBookDocuments([]);
        toast.success(`${selectedBookDocuments.length} document(s) removed from book`);
    };

    // Handle adding documents to book
    const handleAddDocumentsToBook = () => {
        if (selectedAvailableDocuments.length === 0) {
            toast.error("Please select documents to add");
            return;
        }

        selectedAvailableDocuments.forEach(docId => {
            onDocumentAdd(docId);
        });
        setSelectedAvailableDocuments([]);
        toast.success(`${selectedAvailableDocuments.length} document(s) added to book`);
    };

    if (loading) {
        return (
            <div className="space-y-6 mb-6">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-semibold">Documents *</span>
                    </label>
                    <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
                        <span className="loading loading-spinner loading-sm"></span>
                        <span className="ml-2">Loading documents...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 mb-6">
            <div className="form-control">
                <label className="label">
                    <span className="label-text font-semibold">Documents *</span>
                </label>
                <p className="text-sm text-gray-600 mb-4">
                    Select documents to include in this book. At least one document is required.
                </p>

                {/* Validation Error */}
                {validationError && (
                    <div className="alert alert-error mb-4">
                        <span>{validationError}</span>
                    </div>
                )}

                {/* Book Documents Section */}
                <div className="space-y-8">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Selected Documents</h3>
                            {selectedBookDocuments.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleRemoveDocumentsFromBook}
                                    className="btn btn-sm bg-red-500 text-white hover:bg-red-600"
                                >
                                    Remove Selected ({selectedBookDocuments.length})
                                </button>
                            )}
                        </div>
                        
                        {bookDocuments.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                                <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h4 className="text-lg font-medium text-gray-900 mb-2">No documents selected</h4>
                                <p className="text-gray-500">
                                    Select documents from the available list below to include in this book.
                                </p>
                            </div>
                        ) : (
                            <TeamDocumentsTable
                                documents={bookDocuments}
                                selectedDocuments={selectedBookDocuments}
                                onDocumentSelect={handleBookDocumentSelect}
                                onSelectAll={handleBookDocumentsSelectAll}
                                actionType="ungroup"
                            />
                        )}
                    </div>

                    {/* Add Documents Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Available Documents</h3>
                            {selectedAvailableDocuments.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleAddDocumentsToBook}
                                    className="btn btn-sm bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                >
                                    Add Selected ({selectedAvailableDocuments.length})
                                </button>
                            )}
                        </div>
                        
                        {availableDocuments.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                                <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h4 className="text-lg font-medium text-gray-900 mb-2">No available documents</h4>
                                <p className="text-gray-500 mb-4">
                                    {allDocuments.length === 0 
                                        ? "No documents exist yet. Create some documents first."
                                        : "All documents are already selected for this book."
                                    }
                                </p>
                                {allDocuments.length === 0 && (
                                    <Link
                                        to="/doc/create"
                                        className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                    >
                                        <LinkIcon className="size-4" />
                                        Create Document
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <TeamDocumentsTable
                                documents={availableDocuments}
                                selectedDocuments={selectedAvailableDocuments}
                                onDocumentSelect={handleAvailableDocumentSelect}
                                onSelectAll={handleAvailableDocumentsSelectAll}
                                actionType="group"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}