/*
 * @name ViewDocPage
 * @file /docman/frontend/src/pages/ViewDocPage.jsx
 * @page ViewDocPage
 * @description Document detail page displaying document information, version history, file downloads, and review management
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon, PenSquareIcon, DownloadIcon, FileIcon, CalendarIcon, UserIcon, TagIcon, UsersIcon, CrownIcon, Text, ClipboardCheckIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { formatDate } from "../lib/utils";
import { useDocument, useUserRole, useFormData, useReviewAssignments } from "../hooks";
import ReviewCompletionToggle from "../components/ReviewCompletionToggle";
import ReviewStatusSummary from "../components/ReviewStatusSummary";
import PaginatedFileVersionTable from "../components/PaginatedFileVersionTable";
import LoadingSpinner from "../components/LoadingSpinner";

const ViewDocPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Use custom hooks for data management
    const { document: doc, files, versionHistory, loading, isOwner, isAuthor, isStakeholder, isReviewAssignee, refreshDocument } = useDocument(id);
    const { userRole, userId, canEdit } = useUserRole();
    const {
        assignments,
        loading: assignmentsLoading,
        currentUserAssignment,
        allCompleted,
        completionStatus,
        updateAssignmentStatus
    } = useReviewAssignments(id, userId, refreshDocument);
    const { getFullName } = useFormData({
        loadUsers: true,
        loadCategories: false,
        loadExternalContactTypes: false
    });

    // Helper function to format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Function to compare versions
    const compareVersions = async (version1, version2) => {
        try {
            const res = await api.get(`/docs/${id}/compare?version1=${version1}&version2=${version2}`);
            // For now, we'll just show a toast with basic comparison info
            // In a more advanced implementation, we might show a detailed diff
            toast.success(`Comparing version ${version1} with version ${version2}. Size difference: ${res.data.differences.sizeDifference} bytes`);
        } catch (err) {
            console.error("Failed to compare versions", err);
            toast.error("Failed to compare versions");
        }
    };
// Function to download calendar event
    const downloadCalendarEvent = (doc) => {
        try {
            // Create calendar event content
            const event = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'BEGIN:VEVENT',
                `UID:${doc._id}`,
                `DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d+/g, '')}`,
                `DTSTART:${new Date(doc.opensForReview || doc.reviewDate).toISOString().replace(/-|:|\.\d+/g, '')}`,
                `DTEND:${new Date(doc.opensForReview || doc.reviewDate).toISOString().replace(/-|:|\.\d+/g, '')}`,
                `SUMMARY:Review Document: ${doc.title}`,
                `DESCRIPTION:Review document "${doc.title}" for category ${doc.category?.name || 'Uncategorized'}`,
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\n');

            // Create blob and download
            const blob = new Blob([event], { type: 'text/calendar;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `document-review-${doc._id}.ics`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to generate calendar event", err);
            toast.error("Failed to generate calendar event");
        }
    };


    // Check if document needs review (opens for review date is today or in the past)
    const needsReview = doc && new Date(doc.opensForReview || doc.reviewDate) <= new Date();

    if (loading) {
        return (
            <LoadingSpinner message="Loading document..." size="lg" color="teal" fullScreen />
        );
    }

    if (!doc) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <p className="text-center text-red-500">Document not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header with navigation */}
                    <div className="flex justify-between items-center mb-6">
                        <Link to="/documents" className="btn btn-ghost">
                            <ArrowLeftIcon />
                            Back To Documents
                        </Link>

                        {canEdit && (
                            <Link to={`/edit/${id}`} className="btn bg-resdes-teal text-slate-950 hover:bg-resdes-teal hover:opacity-80">
                                <PenSquareIcon size={16} />
                                Edit Document
                            </Link>
                        )}
                    </div>

                    {/* Document Details Card */}
                    <div className="card bg-base-100 shadow-lg mb-6">
                        <div className="card-body">
                            {/* Title */}
                            <h1 className="card-title text-3xl mb-4 text-base-content">{doc.title}</h1>
                            <h2 className="text-2xl mb-4">Metadata</h2>
                            {/* Metadata Grid - Row 1: Author, Category, Created, Updated */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                                {/* Author */}
                                <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                    <UserIcon className="text-resdes-orange" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-600">Author</p>

                                        {doc.author?.username && (
                                            <Link
                                                to={`/profile/${doc.author?._id}`}
                                                className="font-medium text-resdes-teal hover:text-resdes-teal/80 hover:underline"
                                            >
                                                {getFullName(doc.author)}
                                            </Link>
                                        )}

                                    </div>
                                </div>

                                {/* Category */}
                                <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                    <TagIcon className="text-resdes-orange" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-600">Category</p>
                                        <p className="font-medium">{doc.category?.name || "Uncategorized"}</p>
                                    </div>
                                </div>

                                {/* Created */}
                                <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                    <CalendarIcon className="text-resdes-orange" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-600">Created</p>
                                        <p className="font-medium">{formatDate(new Date(doc.createdAt))}</p>
                                    </div>
                                </div>

                                {/* Updated */}
                                <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                    <CalendarIcon className="text-resdes-orange" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-600">Updated</p>
                                        <p className="font-medium">{formatDate(new Date(doc.updatedAt))}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-6 p-4 bg-base-300 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Text className="text-resdes-orange" size={20} />
                                    <h3 className="text-lg font-semibold">Description</h3>
                                </div>
                                <div className="p-4 bg-base-200 rounded-lg">
                                    <p className="text-base-content leading-relaxed">{doc.description}</p>
                                </div>
                            </div>

                            {/* Role Assignment */}
                            <h2 className="text-2xl mb-4">Role Assignments</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                {/* Owners */}
                                <div className="p-4 bg-base-300 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CrownIcon className="text-resdes-orange" size={20} />
                                        <h3 className="text-lg font-semibold">Owners</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {doc.owners && doc.owners.length > 0 ? (
                                            doc.owners.map((owner) => (
                                                <div key={owner._id} className="badge badge-secondary">
                                                    {getFullName(owner)}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="badge bg-base-200 text-base-content/60">None</div>
                                        )}
                                    </div>
                                </div>

                                {/* Stakeholders */}
                                <div className="p-4 bg-base-300 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                        <UsersIcon className="text-resdes-orange" size={20} />
                                        <h3 className="text-lg font-semibold">Stakeholders</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {doc.stakeholders && doc.stakeholders.length > 0 ? (
                                            doc.stakeholders.map((stakeholder) => (
                                                <div key={stakeholder._id} className="badge badge-primary">
                                                    {getFullName(stakeholder)}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="badge bg-base-200 text-base-content/60">None</div>
                                        )}
                                    </div>
                                </div>

                                {/* External Contacts */}
                                <div className="p-4 bg-base-300 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                        <UsersIcon className="text-resdes-orange" size={20} />
                                        <h3 className="text-lg font-semibold">External Contacts</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {doc.externalContacts && doc.externalContacts.length > 0 ? (
                                            doc.externalContacts.map((contact, index) => (
                                                <a
                                                    key={index}
                                                    href={`mailto:${contact.email}`}
                                                    className="badge pb-3 bg-resdes-orange p-2 text-slate-950 hover:opacity-80 hover:underline"
                                                    title={`Email ${contact.name}`}
                                                >
                                                    {contact.name} ({contact?.type?.name || "Contact"})
                                                    {contact.phoneNumber && ` - ${contact.phoneNumber}`}
                                                </a>
                                            ))
                                        ) : (
                                            <div className="badge bg-base-200 text-base-content/60">None</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Review Details */}
                            <h2 className="text-2xl mb-4">Review Details</h2>

                            {/* Row: Review Assignees and Opens For Review */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {/* Review Assignees */}
                                <div className="p-4 bg-base-300 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                        <ClipboardCheckIcon className="text-resdes-blue" size={20} />
                                        <h3 className="text-lg font-semibold">Review Assignees</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {doc.reviewAssignees && doc.reviewAssignees.length > 0 ? (
                                            doc.reviewAssignees.map((assignee) => (
                                                <div key={assignee._id} className="badge badge-info">
                                                    {getFullName(assignee)}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="badge bg-base-200 text-base-content/60">None</div>
                                        )}
                                    </div>
                                    {doc.reviewNotes && (
                                        <div className="mt-3 p-3 bg-base-200 rounded-lg">
                                            <p className="text-sm text-gray-600 mb-1">Review Notes:</p>
                                            <p className="text-sm">{doc.reviewNotes}</p>
                                        </div>
                                    )}
                                    {doc.reviewDueDate && (
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-600">
                                                Review Due: <span className="font-medium text-blue-600">
                                                    {formatDate(new Date(doc.reviewDueDate))}
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Opens For Review */}
                                <div className="p-4 bg-base-300 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <CalendarIcon className={needsReview ? "text-red-600" : "text-resdes-orange"} size={20} />
                                        <div>
                                            <p className="text-sm text-gray-600">Opens For Review</p>
                                            <p className={`font-medium ${needsReview ? "text-red-600 font-bold" : ""}`}>
                                                {formatDate(new Date(doc.opensForReview || doc.reviewDate))}
                                                {needsReview && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">OVERDUE</span>}
                                            </p>
                                            <button
                                                onClick={() => downloadCalendarEvent(doc)}
                                                className="btn btn-xs mt-2"
                                                title="Download calendar event for review date"
                                            >
                                                <CalendarIcon size={12} className="mr-1" />
                                                Add to Calendar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Row: Document Review Status */}
                            <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md mb-6">
                                <div className={`w-4 h-4 rounded-full ${
                                    doc.reviewCompleted ? 'bg-green-600' : 'bg-yellow-500'
                                }`}></div>
                                <div>
                                    <p className="text-sm text-gray-600">Document Review Status</p>
                                    <p className={`font-medium ${
                                        doc.reviewCompleted ? 'text-green-600' : 'text-yellow-600'
                                    }`}>
                                        {doc.reviewCompleted ? 'Review Completed' : 'Review In Progress'}
                                    </p>
                                    {doc.reviewCompletedAt && (
                                        <p className="text-xs text-gray-500">
                                            Completed on {formatDate(new Date(doc.reviewCompletedAt))}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Row: Review Progress */}
                            <ReviewStatusSummary
                                assignments={assignments}
                                completionStatus={completionStatus}
                                allCompleted={allCompleted}
                                getFullName={getFullName}
                            />

                            {/* Row: Your Review */}
                            {needsReview && isReviewAssignee(userId) && currentUserAssignment && (
                                <div className="p-4 mb-6 bg-base-300 rounded-lg">
                                    <div className="mb-4 flex items-center gap-2">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <ClipboardCheckIcon className="text-resdes-blue" size={20} />
                                            Your Review
                                        </h3>
                                    </div>
                                    <ReviewCompletionToggle
                                        assignment={currentUserAssignment}
                                        onToggle={updateAssignmentStatus}
                                        loading={assignmentsLoading}
                                    />
                                </div>
                            )}
                            {/* Version History Section */}
                            <h2 className="text-2xl mb-4">Document File Version History</h2>
                            <PaginatedFileVersionTable
                                versions={versionHistory}
                                files={files}
                                getFullName={getFullName}
                                onCompare={(v1, v2) => compareVersions(v1, v2)}
                                itemsPerPage={10}
                            />
                        </div>
                    </div>

                    {/* Files Section */}
                    {/*
                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <h3 className="card-title text-xl mb-4">Attached Files</h3>

                            {files.length === 0 ? (
                                <p className="text-slate-200 text-center py-8">No files attached to this document</p>
                            ) : (
                                <div className="space-y-3">
                                {files.map((file) => (
                                    <div key={file._id} className="flex bg-base-300 items-center justify-between p-4 border border-resdes-orange rounded-lg hover:bg-base-200">
                                        <div className="flex items-center gap-3">
                                            <FileIcon className="text-resdes-orange" size={24} />
                                            <div>
                                                <p className="font-medium">{file.originalname}</p>
                                                <p className="text-sm text-gray-500">
                                                    {formatFileSize(file.size)} • Uploaded {formatDate(new Date(file.uploadedAt))}
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={`/uploads/${file.filename}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm bg-resdes-teal text-slate-950 hover:bg-resdes-teal hover:opacity-80"
                                        >
                                            <DownloadIcon size={16} />
                                            Download
                                        </a>
                                    </div>
                                ))}
                                </div>
                            )}
                        </div>
                    </div>
                    */}
                </div>
            </div>
        </div>
    );
};

export default ViewDocPage;
