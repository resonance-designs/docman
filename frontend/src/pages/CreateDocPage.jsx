/*
 * @name CreateDocPage
 * @file /docman/frontend/src/pages/CreateDocPage.jsx
 * @page CreateDocPage
 * @description Document creation page with form for uploading files, setting metadata, assigning stakeholders and owners
 * @author Richard Bakos
 * @version 2.1.3
 * @license UNLICENSED
 */
import { useNavigate, Link } from "react-router";
import { ArrowLeftIcon, FilePlus2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";


import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Import shared components and hooks
import { createDocumentSchema, defaultFormValues } from "../lib/documentFormSchema";
import {
    useStakeholderManagement,
    useExternalContacts,
    useReviewManagement,
    useFormData,
    useFileUpload
} from "../hooks";
import DocumentBasicFields from "../components/forms/DocumentBasicFields";
import StakeholderSelection from "../components/forms/StakeholderSelection";
import ExternalContactsManager from "../components/forms/ExternalContactsManager";
import ReviewAssignments from "../components/forms/ReviewAssignments";
import InlineLoader from "../components/InlineLoader";





/**
 * Page component for creating new documents with file upload and metadata
 * @returns {JSX.Element} The create document page component
 */
const CreateDocPage = () => {
    const navigate = useNavigate();

    // Form setup with shared schema
    const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm({
        resolver: zodResolver(createDocumentSchema),
        defaultValues: defaultFormValues,
    });

    // Custom hooks for complex state management
    const formDataResult = useFormData();
    const { 
        users: rawUsers = [], 
        categories: rawCategories = [], 
        externalContactTypes: rawExternalContactTypes = [], 
        loading: formDataLoading 
    } = formDataResult || {};
    
    // Ensure arrays are always arrays to prevent .map() errors
    const users = Array.isArray(rawUsers) ? rawUsers : [];
    const categories = Array.isArray(rawCategories) ? rawCategories : [];
    const externalContactTypes = Array.isArray(rawExternalContactTypes) ? rawExternalContactTypes : [];
    
    const stakeholderManagement = useStakeholderManagement(setValue);
    const externalContactsManagement = useExternalContacts();
    const reviewManagement = useReviewManagement(setValue);
    const fileUpload = useFileUpload({
        onSuccess: () => {
            toast.success("Document uploaded successfully");
            reset();
            stakeholderManagement?.resetStakeholdersAndOwners?.();
            externalContactsManagement?.resetExternalContacts?.();
            reviewManagement?.resetReviewAssignments?.();
            navigate("/");
        },
        onError: (error) => {
            console.error("Upload failed:", error);
            toast.error("Failed to upload document");
        }
    });







    /**
     * Handle form submission using fileUpload hook
     * @param {Object} data - Form data from react-hook-form
     */
    const onSubmit = async (data) => {
        const uploadFunction = async (_, options) => {
            const formData = new FormData();
            formData.append("title", data.title);
            formData.append("author", data.author);
            formData.append("description", data.description);
            formData.append("category", data.category);

            // Use reviewDate from form data directly
            if (data.reviewDate) {
                formData.append("reviewDate", data.reviewDate.toISOString());
            }

            // Use hook state for stakeholders and owners
            formData.append("stakeholders", JSON.stringify(stakeholderManagement.selectedStakeholders));
            formData.append("owners", JSON.stringify(stakeholderManagement.selectedOwners));

            // File
            if (data.file?.length) {
                formData.append("file", data.file[0]);
            }

            // Use hook state for external contacts
            if (externalContactsManagement.selectedExternalContacts.length > 0) {
                formData.append("externalContacts", JSON.stringify(externalContactsManagement.selectedExternalContacts));
            }

            // Use hook state for review assignments
            if (reviewManagement.reviewAssignees.length > 0) {
                formData.append("reviewAssignees", JSON.stringify(reviewManagement.reviewAssignees));
                if (reviewManagement.reviewDueDate) {
                    formData.append("reviewDueDate", reviewManagement.reviewDueDate.toISOString());
                }
                if (reviewManagement.reviewNotes) {
                    formData.append("reviewNotes", reviewManagement.reviewNotes);
                }
            }

            const res = await api.post("/docs", formData, options);

            // Create review assignments if specified
            if (reviewManagement.reviewAssignees.length > 0 && reviewManagement.reviewDueDate) {
                try {
                    const reviewData = {
                        documentId: res.data.doc._id,
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
                    toast.error("Document created but failed to create review assignments");
                }
            }

            return res;
        };

        await fileUpload.startUpload(uploadFunction, null);
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
                            <FilePlus2 className="size-8 text-resdes-orange" />
                            Create Document
                        </h1>
                    </div>
                    <Link to="/" className="btn btn-ghost mb-4">
                        <ArrowLeftIcon />
                        Back To Documents
                    </Link>
                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <form onSubmit={handleSubmit(onSubmit)}>
                                {/* Basic Document Fields - Replaced with shared component */}
                                <DocumentBasicFields
                                    register={register}
                                    control={control}
                                    errors={errors}
                                    users={users}
                                    categories={categories}
                                    showFileUpload={true}
                                    fileRequired={true}
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

                                {/* Submit Button */}
                                <div className="form-control mt-4">
                                    <button type="submit" className="uppercase font-mono btn bg-resdes-green text-slate-950 hover:bg-resdes-green hover:opacity-[.8] transition-opacity duration-300" disabled={fileUpload.uploading}>
                                        {fileUpload.uploading ? `Uploading (${fileUpload.uploadProgress}%)` : "Upload Document"}
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

export default CreateDocPage;