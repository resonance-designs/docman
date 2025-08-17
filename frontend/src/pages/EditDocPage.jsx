/*
 * @name EditDocPage
 * @file /docman/frontend/src/pages/EditDocPage.jsx
 * @page EditDocPage
 * @description Document editing page with form validation for updating document metadata, stakeholders, and file versions
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Import shared components and hooks
import { editDocumentSchema, defaultFormValues } from "../lib/documentFormSchema";
import { useStakeholderManagement } from "../hooks/useStakeholderManagement";
import { useExternalContacts } from "../hooks/useExternalContacts";
import { useReviewManagement } from "../hooks/useReviewManagement";
import DocumentBasicFields from "../components/forms/DocumentBasicFields";
import StakeholderSelection from "../components/forms/StakeholderSelection";
import ExternalContactsManager from "../components/forms/ExternalContactsManager";
import ReviewAssignments from "../components/forms/ReviewAssignments";

/**
 * Get full name from user object
 * @param {Object} user - User object
 * @returns {string} Full name
 */
const getFullName = (user) => {
    if (!user) return "";
    return `${user.firstname || ""} ${user.lastname || ""}`.trim();
};

const EditDocPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Basic state
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [externalContactTypes, setExternalContactTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Form setup with shared schema
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
        setValue,
    } = useForm({
        resolver: zodResolver(editDocumentSchema),
        defaultValues: defaultFormValues,
    });

    // Custom hooks for complex state management
    const stakeholderManagement = useStakeholderManagement(setValue);
    const externalContactsManagement = useExternalContacts();
    const reviewManagement = useReviewManagement(setValue);

    // State for version upload
    const [versionLabel, setVersionLabel] = useState("");
    const [changelog, setChangelog] = useState("");

    // Initial load: doc + lists
    useEffect(() => {
        (async () => {
            try {
                const [docRes, usersRes, catsRes, typesRes] = await Promise.all([
                    api.get(`/docs/${id}`),
                    api.get("/users"),
                    api.get("/categories"),
                    api.get("/external-contacts/types"),
                ]);
                const doc = docRes.data;
                setUsers(usersRes.data || []);
                setCategories(catsRes.data || []);
                setExternalContactTypes(typesRes.data || []);

                // Normalize incoming values - extract _id from populated objects
                const mappedStakeholders = (doc.stakeholders || []).map(stakeholder =>
                    stakeholder?._id ? String(stakeholder._id) : String(stakeholder || "")
                );
                const mappedOwners = (doc.owners || []).map(owner =>
                    owner?._id ? String(owner._id) : String(owner || "")
                );
                const mappedReviewAssignees = (doc.reviewAssignees || []).map(assignee =>
                    assignee?._id ? String(assignee._id) : String(assignee || "")
                );

                // Reset form with document data
                reset({
                    title: doc.title || "",
                    author: doc.author?._id ? String(doc.author._id) : String(doc.author || ""),
                    description: doc.description || "",
                    category: doc.category?._id ? String(doc.category._id) : String(doc.category || ""),
                    reviewDate: doc.reviewDate ? new Date(doc.reviewDate) : null,
                    stakeholders: mappedStakeholders,
                    owners: mappedOwners,
                    reviewAssignees: mappedReviewAssignees,
                    reviewNotes: doc.reviewNotes || "",
                });

                // Update hook states
                stakeholderManagement.updateStakeholdersAndOwners(mappedStakeholders, mappedOwners);
                reviewManagement.updateReviewAssignments(
                    mappedReviewAssignees,
                    doc.reviewDueDate ? new Date(doc.reviewDueDate) : null,
                    doc.reviewNotes || ""
                );
                externalContactsManagement.updateExternalContacts(doc.externalContacts || []);
            } catch (err) {
                console.error("Failed to load edit data", err);
                toast.error(err?.response?.data?.message || "Failed to load document");
                navigate("/");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate, reset]);

    // Version upload handler

// Handle version upload
    const handleVersionUpload = async (file) => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("versionLabel", versionLabel || "");
            formData.append("changelog", changelog || "");
            
            const res = await api.post(`/docs/${id}/upload`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            
            toast.success("New version uploaded successfully");
            
            // Reset version fields
            setVersionLabel("");
            setChangelog("");
            
            // Refresh the document data to show the new version
            // This would typically involve refetching the document or updating state
        } catch (err) {
            console.error("Version upload failed", err);
            toast.error(err?.response?.data?.message || "Version upload failed");
        }
    };


    const onSubmit = async (data) => {
        setSaving(true);
        try {
            // Handle version upload first if there's a version file
            // Note: In a real implementation, you might want to handle this separately
            // from the main document update
            
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

            // Create review assignments if specified
            if (reviewManagement.reviewAssignees.length > 0 && reviewManagement.reviewDueDate) {
                try {
                    const reviewData = {
                        documentId: id,
                        assignments: reviewManagement.reviewAssignees.map(assignee => ({
                            assignee,
                            dueDate: reviewManagement.reviewDueDate.toISOString(),
                            notes: reviewManagement.reviewNotes || ""
                        }))
                    };

                    await api.post("/reviews", reviewData);
                    toast.success("Review assignments created successfully");
                } catch (reviewErr) {
                    console.error("Failed to create review assignments", reviewErr);
                    toast.error("Document updated but failed to create review assignments");
                }
            }

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
                                {/* Basic Document Fields - Replaced with shared component */}
                                <DocumentBasicFields
                                    register={register}
                                    control={control}
                                    errors={errors}
                                    users={users}
                                    categories={categories}
                                    showFileUpload={true}
                                    fileRequired={false}
                                />

                                {/* Stakeholders and Owners - Replaced with shared component */}
                                <StakeholderSelection
                                    users={users}
                                    selectedStakeholders={stakeholderManagement.selectedStakeholders}
                                    selectedOwners={stakeholderManagement.selectedOwners}
                                    onStakeholderAdd={stakeholderManagement.handleStakeholderAdd}
                                    onStakeholderRemove={stakeholderManagement.handleStakeholderRemove}
                                    onOwnerAdd={stakeholderManagement.handleOwnerAdd}
                                    onOwnerRemove={stakeholderManagement.handleOwnerRemove}
                                />

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

                                {/* Review Assignments - Replaced with shared component */}
                                <ReviewAssignments
                                    control={control}
                                    users={users}
                                    reviewAssignees={reviewManagement.reviewAssignees}
                                    reviewDueDate={reviewManagement.reviewDueDate}
                                    reviewNotes={reviewManagement.reviewNotes}
                                    onAssigneeAdd={reviewManagement.handleReviewAssigneeAdd}
                                    onAssigneeRemove={reviewManagement.handleReviewAssigneeRemove}
                                    onDueDateChange={reviewManagement.handleReviewDueDateChange}
                                    onNotesChange={reviewManagement.handleReviewNotesChange}
                                    validationError={reviewManagement.getReviewValidationError()}
                                />
                                {/* External Contacts - Replaced with shared component */}
                                <ExternalContactsManager
                                    externalContactTypes={externalContactTypes}
                                    selectedExternalContacts={externalContactsManagement.selectedExternalContacts}
                                    newContactName={externalContactsManagement.newContactName}
                                    newContactEmail={externalContactsManagement.newContactEmail}
                                    newContactType={externalContactsManagement.newContactType}
                                    onContactNameChange={externalContactsManagement.setNewContactName}
                                    onContactEmailChange={externalContactsManagement.setNewContactEmail}
                                    onContactTypeChange={externalContactsManagement.setNewContactType}
                                    onAddContact={externalContactsManagement.handleAddExternalContact}
                                    onRemoveContact={externalContactsManagement.handleRemoveExternalContact}
                                    onUpdateContact={externalContactsManagement.handleUpdateExternalContact}
                                    isNewContactValid={externalContactsManagement.isNewContactValid()}
                                />

                                {/* Optional File Replace */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="file">Replace File (optional)</label>
                                    <input id="file" type="file" {...register("file")} className="file-input" />
                                    {errors.file && <p className="text-red-500 mt-1">{errors.file.message}</p>}
                                </div>

                                {/* Optional File Replace */}
                                <div className="form-control mb-4">
                                    <label className="label" htmlFor="file">Replace File (optional)</label>
                                    <input id="file" type="file" {...register("file")} className="file-input" />
                                    {errors.file && <p className="text-red-500 mt-1">{errors.file.message}</p>}
                                </div>
                                
                                {/* Version Upload Section */}
                                <div className="form-control mb-4">
                                    <label className="label font-semibold">Upload New Version</label>
                                    <p className="text-sm text-gray-600 mb-2">Upload a new version of this document</p>
                                    
                                    {/* Version Label */}
                                    <div className="form-control mb-4">
                                        <label className="label" htmlFor="versionLabel">Version Label (optional)</label>
                                        <input
                                            id="versionLabel"
                                            type="text"
                                            value={versionLabel}
                                            onChange={(e) => setVersionLabel(e.target.value)}
                                            className="input input-bordered"
                                            placeholder="e.g., Version 2.1, Updated Requirements, etc."
                                        />
                                    </div>
                                    
                                    {/* Changelog */}
                                    <div className="form-control mb-4">
                                        <label className="label" htmlFor="changelog">Changelog (optional)</label>
                                        <textarea
                                            id="changelog"
                                            value={changelog}
                                            onChange={(e) => setChangelog(e.target.value)}
                                            className="textarea textarea-bordered"
                                            rows="3"
                                            placeholder="Describe what changes were made in this version..."
                                        />
                                    </div>
                                    
                                    {/* Version File Upload */}
                                    <div className="form-control mb-4">
                                        <label className="label" htmlFor="versionFile">Upload New Version File</label>
                                        <input
                                            id="versionFile"
                                            type="file"
                                            onChange={(e) => {
                                                // Handle version file upload separately
                                                if (e.target.files && e.target.files.length > 0) {
                                                    handleVersionUpload(e.target.files[0]);
                                                }
                                            }}
                                            className="file-input"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">Upload a new version of the document file</p>
                                    </div>
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
