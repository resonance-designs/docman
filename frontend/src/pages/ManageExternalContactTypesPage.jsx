/*
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PlusIcon, EditIcon, TrashIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";

const ManageExternalContactTypesPage = () => {
    const [contactTypes, setContactTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [newContactType, setNewContactType] = useState({ name: "", description: "" });
    const [editingContactType, setEditingContactType] = useState(null);

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = decodeJWT(token);
            setUserRole(decoded?.role);
        }
    }, []);

    // Fetch initial contact types
    useEffect(() => {
        const fetchContactTypes = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const res = await api.get("/external-contacts/types", { headers });
                setContactTypes(res.data);
            } catch (error) {
                console.error("Error fetching contact types:", error);
                toast.error("Failed to load contact types");
            } finally {
                setLoading(false);
            }
        };

        fetchContactTypes();
    }, []);

    // Check if user can manage contact types (admin only)
    const canManageContactTypes = userRole === "admin";

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (editingContactType) {
            setEditingContactType(prev => ({ ...prev, [name]: value }));
        } else {
            setNewContactType(prev => ({ ...prev, [name]: value }));
        }
    };

    // Handle form submission for creating a new contact type
    const handleCreateContactType = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await api.post("/external-contacts/types", newContactType, { headers });
            setContactTypes(prev => [...prev, res.data]);
            setNewContactType({ name: "", description: "" });
            toast.success("Contact type created successfully");
        } catch (error) {
            console.error("Error creating contact type:", error);
            toast.error("Failed to create contact type");
        }
    };

    // Handle form submission for updating a contact type
    const handleUpdateContactType = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await api.put(`/external-contacts/types/${editingContactType._id}`, editingContactType, { headers });
            setContactTypes(prev => prev.map(ct => ct._id === editingContactType._id ? res.data : ct));
            setEditingContactType(null);
            toast.success("Contact type updated successfully");
        } catch (error) {
            console.error("Error updating contact type:", error);
            toast.error("Failed to update contact type");
        }
    };

    // Handle deleting a contact type
    const handleDeleteContactType = async (id) => {
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await api.delete(`/external-contacts/types/${id}`, { headers });
            setContactTypes(prev => prev.filter(ct => ct._id !== id));
            toast.success("Contact type deleted successfully");
        } catch (error) {
            console.error("Error deleting contact type:", error);
            toast.error("Failed to delete contact type");
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-4xl font-bold mb-4">Manage External Contact Types</h1>
                        <Link to="/" className="btn btn-ghost">
                            Back To Dashboard
                        </Link>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center text-resdes-teal py-10">
                            Loading contact types...
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && contactTypes.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-lg mb-4">No contact types found.</p>
                            {canManageContactTypes && (
                                <button
                                    onClick={() => setEditingContactType({ name: "", description: "" })}
                                    className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                >
                                    <PlusIcon size={16} />
                                    Create First Contact Type
                                </button>
                            )}
                        </div>
                    )}

                    {/* Create/Edit Form */}
                    {canManageContactTypes && (
                        <div className="card bg-base-100 shadow-lg mb-6">
                            <div className="card-body">
                                <h2 className="card-title text-2xl mb-4">
                                    {editingContactType ? "Edit Contact Type" : "Create New Contact Type"}
                                </h2>
                                <form onSubmit={editingContactType ? handleUpdateContactType : handleCreateContactType}>
                                    <div className="form-control mb-4">
                                        <label className="label font-semibold" htmlFor="name">Name</label>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            className="input input-bordered"
                                            value={editingContactType ? editingContactType.name : newContactType.name}
                                            onChange={handleInputChange}
                                            placeholder="Enter contact type name"
                                            required
                                        />
                                    </div>
                                    <div className="form-control mb-4">
                                        <label className="label font-semibold" htmlFor="description">Description</label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            className="textarea textarea-bordered"
                                            value={editingContactType ? editingContactType.description : newContactType.description}
                                            onChange={handleInputChange}
                                            placeholder="Enter contact type description"
                                            rows="3"
                                        />
                                    </div>
                                    <div className="form-control mt-4">
                                        <button
                                            type="submit"
                                            className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                        >
                                            {editingContactType ? "Update Contact Type" : "Create Contact Type"}
                                        </button>
                                        {editingContactType && (
                                            <button
                                                type="button"
                                                className="btn btn-ghost mt-2"
                                                onClick={() => setEditingContactType(null)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Contact Types Table */}
                    {!loading && contactTypes.length > 0 && (
                        <div className="card bg-base-100 shadow-lg">
                            <div className="card-body">
                                <h2 className="card-title text-2xl mb-4">Existing Contact Types</h2>
                                <div className="overflow-x-auto">
                                    <table className="table table-zebra">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Description</th>
                                                <th>Created</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contactTypes.map((contactType) => (
                                                <tr key={contactType._id}>
                                                    <td>{contactType.name}</td>
                                                    <td>{contactType.description || "No description"}</td>
                                                    <td>{formatDate(contactType.createdAt)}</td>
                                                    <td>
                                                        {canManageContactTypes && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    className="btn btn-xs btn-ghost"
                                                                    onClick={() => setEditingContactType(contactType)}
                                                                >
                                                                    <EditIcon size={12} />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="btn btn-xs btn-ghost text-red-500"
                                                                    onClick={() => handleDeleteContactType(contactType._id)}
                                                                >
                                                                    <TrashIcon size={12} />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageExternalContactTypesPage;