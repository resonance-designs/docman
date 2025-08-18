/*
 * @name ExternalContactsManager
 * @file /docman/frontend/src/components/forms/ExternalContactsManager.jsx
 * @component ExternalContactsManager
 * @description Reusable component for managing external contacts with add, edit, and remove functionality
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import { X, Plus, Edit2, Check, XCircle } from "lucide-react";
import { useState } from "react";

/**
 * ExternalContactsManager component for managing external contacts
 * @param {Object} props - Component props
 * @param {Array} props.externalContactTypes - Array of available contact types
 * @param {Array} props.selectedExternalContacts - Array of selected external contacts
 * @param {string} props.newContactName - New contact name input value
 * @param {string} props.newContactEmail - New contact email input value
 * @param {string} props.newContactType - New contact type input value
 * @param {Function} props.onContactNameChange - Function to handle name change
 * @param {Function} props.onContactEmailChange - Function to handle email change
 * @param {Function} props.onContactTypeChange - Function to handle type change
 * @param {Function} props.onAddContact - Function to add new contact
 * @param {Function} props.onRemoveContact - Function to remove contact
 * @param {Function} props.onUpdateContact - Function to update contact
 * @param {boolean} props.isNewContactValid - Whether new contact form is valid
 * @returns {JSX.Element} ExternalContactsManager component
 */
export default function ExternalContactsManager({
    externalContactTypes = [],
    selectedExternalContacts = [],
    newContactName,
    newContactEmail,
    newContactType,
    onContactNameChange,
    onContactEmailChange,
    onContactTypeChange,
    onAddContact,
    onRemoveContact,
    onUpdateContact,
    isNewContactValid
}) {
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editingContact, setEditingContact] = useState({});

    /**
     * Start editing a contact
     * @param {number} index - Index of contact to edit
     */
    const startEditing = (index) => {
        setEditingIndex(index);
        setEditingContact({ ...selectedExternalContacts[index] });
    };

    /**
     * Cancel editing
     */
    const cancelEditing = () => {
        setEditingIndex(-1);
        setEditingContact({});
    };

    /**
     * Save edited contact
     */
    const saveEditing = () => {
        if (editingContact.name && editingContact.email && editingContact.type) {
            onUpdateContact(editingIndex, editingContact);
            setEditingIndex(-1);
            setEditingContact({});
        }
    };

    /**
     * Handle add contact
     */
    const handleAddContact = () => {
        if (isNewContactValid) {
            onAddContact();
        }
    };

    return (
        <div className="form-control mb-6">
            <label className="label">
                <span className="label-text font-semibold">External Contacts</span>
            </label>
            <p className="text-sm text-gray-600 mb-4">
                Add external contacts who should be notified about this document
            </p>

            {/* Add New Contact Form */}
            <div className="card bg-base-200 p-4 mb-4">
                <h4 className="font-semibold mb-3">Add New External Contact</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    {/* Contact Name */}
                    <div className="form-control">
                        <label className="label" htmlFor="newContactName">
                            <span className="label-text-alt">Name</span>
                        </label>
                        <input
                            id="newContactName"
                            type="text"
                            className="input input-bordered input-sm"
                            placeholder="Contact name"
                            value={newContactName}
                            onChange={(e) => onContactNameChange(e.target.value)}
                        />
                    </div>

                    {/* Contact Email */}
                    <div className="form-control">
                        <label className="label" htmlFor="newContactEmail">
                            <span className="label-text-alt">Email</span>
                        </label>
                        <input
                            id="newContactEmail"
                            type="email"
                            className="input input-bordered input-sm"
                            placeholder="contact@example.com"
                            value={newContactEmail}
                            onChange={(e) => onContactEmailChange(e.target.value)}
                        />
                    </div>

                    {/* Contact Type */}
                    <div className="form-control">
                        <label className="label" htmlFor="newContactType">
                            <span className="label-text-alt">Type</span>
                        </label>
                        <select
                            id="newContactType"
                            className="select select-bordered select-sm"
                            value={newContactType}
                            onChange={(e) => onContactTypeChange(e.target.value)}
                        >
                            <option value="">Select type...</option>
                            {externalContactTypes.map((type) => (
                                <option key={type._id} value={type._id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    type="button"
                    className={`btn btn-sm ${isNewContactValid ? 'btn-primary' : 'btn-disabled'}`}
                    onClick={handleAddContact}
                    disabled={!isNewContactValid}
                >
                    <Plus size={16} />
                    Add Contact
                </button>
            </div>

            {/* Selected External Contacts List */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text">Selected External Contacts</span>
                </label>
                
                {selectedExternalContacts.length > 0 ? (
                    <div className="space-y-2">
                        {selectedExternalContacts.map((contact, index) => (
                            <div key={index} className="card bg-base-100 border p-3">
                                {editingIndex === index ? (
                                    // Editing mode
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm"
                                            value={editingContact.name || ''}
                                            onChange={(e) => setEditingContact({
                                                ...editingContact,
                                                name: e.target.value
                                            })}
                                            placeholder="Contact name"
                                        />
                                        <input
                                            type="email"
                                            className="input input-bordered input-sm"
                                            value={editingContact.email || ''}
                                            onChange={(e) => setEditingContact({
                                                ...editingContact,
                                                email: e.target.value
                                            })}
                                            placeholder="contact@example.com"
                                        />
                                        <div className="flex gap-2">
                                            <select
                                                className="select select-bordered select-sm flex-1"
                                                value={editingContact.type || ''}
                                                onChange={(e) => setEditingContact({
                                                    ...editingContact,
                                                    type: e.target.value
                                                })}
                                            >
                                                <option value="">Select type...</option>
                                                {externalContactTypes.map((type) => (
                                                    <option key={type._id} value={type._id}>
                                                        {type.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="btn btn-success btn-sm"
                                                onClick={saveEditing}
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={cancelEditing}
                                            >
                                                <XCircle size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // Display mode
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <div className="font-medium">{contact.name}</div>
                                            <div className="text-sm text-gray-600">{contact.email}</div>
                                            <div className="text-xs text-gray-500">
                                                {externalContactTypes.find(t => t._id === contact.type)?.name || 'Unknown Type'}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => startEditing(index)}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm text-red-500"
                                                onClick={() => onRemoveContact(index)}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                        <p>No external contacts added</p>
                        <p className="text-sm">Add contacts using the form above</p>
                    </div>
                )}
            </div>
        </div>
    );
}
