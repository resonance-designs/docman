/*
 * @name ViewDocPage
 * @file /docman/frontend/src/pages/ViewDocPage.jsx
 * @page ViewDocPage
 * @description Document detail page displaying document information, version history, file downloads, and review management
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon, PenSquareIcon, DownloadIcon, FileIcon, CalendarIcon, UserIcon, TagIcon, UsersIcon, CrownIcon, GitCompareIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { formatDate } from "../lib/utils";
import { useDocument, useUserRole, useFormData } from "../hooks";

const ViewDocPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Use custom hooks for data management
    const { document: doc, files, versionHistory, loading, isOwner, isAuthor, isStakeholder } = useDocument(id);
    const { userRole, userId, canEdit } = useUserRole();
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
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <p className="text-center text-resdes-teal">Loading document…</p>
                </div>
            </div>
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

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                {/* Author */}
                                <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                    <UserIcon className="text-resdes-orange" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-600">Author</p>
                                        <p className="font-medium">{getFullName(doc.author)}</p>
                                        {doc.author?.username && (
                                            <Link 
                                                to={`/profile/${doc.author?._id}`} 
                                                className="text-sm text-resdes-teal hover:text-resdes-teal/80 hover:underline"
                                            >
                                                @{doc.author.username}
                                            </Link>
                                        )}
                                        <p>{doc.author?.userRole}</p>
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

                                {/* Opens For Review */}
                                <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
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

                                {/* Review Interval */}
                                <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                    <CalendarIcon className="text-resdes-blue" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-600">Review Interval</p>
                                        <p className="font-medium">
                                            {doc.reviewInterval === 'custom' 
                                                ? `Every ${doc.reviewIntervalDays} days`
                                                : doc.reviewInterval?.charAt(0).toUpperCase() + doc.reviewInterval?.slice(1) || 'Quarterly'
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Review Period */}
                                <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                    <CalendarIcon className="text-resdes-green" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-600">Review Period</p>
                                        <p className="font-medium">
                                            {doc.reviewPeriod === '1week' && '1 Week'}
                                            {doc.reviewPeriod === '2weeks' && '2 Weeks'}
                                            {doc.reviewPeriod === '3weeks' && '3 Weeks'}
                                            {doc.reviewPeriod === '1month' && '1 Month'}
                                            {!doc.reviewPeriod && '2 Weeks'}
                                        </p>
                                    </div>
                                </div>

                                {/* Last Reviewed On */}
                                {doc.lastReviewedOn && (
                                    <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                        <CalendarIcon className="text-green-600" size={20} />
                                        <div>
                                            <p className="text-sm text-gray-600">Last Reviewed On</p>
                                            <p className="font-medium text-green-600">
                                                {formatDate(new Date(doc.lastReviewedOn))}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Next Review Due On */}
                                {doc.nextReviewDueOn && (
                                    <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                        <CalendarIcon className="text-blue-600" size={20} />
                                        <div>
                                            <p className="text-sm text-gray-600">Next Review Due On</p>
                                            <p className="font-medium text-blue-600">
                                                {formatDate(new Date(doc.nextReviewDueOn))}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-2">Description</h3>
                                <div className="p-4 bg-base-300 rounded-lg">
                                    <p className="text-base-content/80 leading-relaxed">{doc.description}</p>
                                </div>
                            </div>

                            {/* Stakeholders */}
                            <div className="grid grid-cols-2 gap-4">
                                {doc.stakeholders && doc.stakeholders.length > 0 && (
                                    <div className="mb-6 p-4 bg-base-300 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <UsersIcon className="text-resdes-orange" size={20} />
                                            <h3 className="text-lg font-semibold">Stakeholders</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {doc.stakeholders.map((stakeholder) => (
                                                <div key={stakeholder._id} className="badge badge-primary">
                                                    {getFullName(stakeholder)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Owners */}
                                {doc.owners && doc.owners.length > 0 && (
                                    <div className="mb-6 p-4 bg-base-300 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CrownIcon className="text-resdes-orange" size={20} />
                                            <h3 className="text-lg font-semibold">Owners</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {doc.owners.map((owner) => (
                                                <div key={owner._id} className="badge badge-secondary">
                                                    {getFullName(owner)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* External Contacts */}
                            {doc.externalContacts && doc.externalContacts.length > 0 && (
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-2 p-4 bg-base-300 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <UsersIcon className="text-resdes-orange" size={20} />
                                            <h3 className="text-lg font-semibold">External Contacts</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {doc.externalContacts.map((contact, index) => (
                                                <div key={index} className="badge pb-3 bg-resdes-orange p-2 text-slate-950">
                                                    {contact.name} ({contact.email})
                                                    {contact.phoneNumber && ` - ${contact.phoneNumber}`}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Created Date */}
                                    <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                        <CalendarIcon className="text-resdes-orange" size={20} />
                                        <div>
                                            <p className="text-sm text-gray-600">Created</p>
                                            <p className="font-medium">{formatDate(new Date(doc.createdAt))}</p>
                                        </div>
                                    </div>
                                    {/* Created Date */}
                                    <div className="flex items-center bg-base-300 rounded-lg gap-3 p-4 hover:shadow-md">
                                        <CalendarIcon className="text-resdes-orange" size={20} />
                                        <div>
                                            <p className="text-sm text-gray-600">Updated</p>
                                            <p className="font-medium">{formatDate(new Date(doc.updatedAt))}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Files Section */}
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

                    {/* Version History Section */}
                    {versionHistory.length > 0 && (
                        <div className="card bg-base-100 shadow-lg mt-6">
                            <div className="card-body">
                                <h3 className="card-title text-xl mb-4">Version History</h3>
                                <div className="overflow-x-auto">
                                    <table className="table table-zebra">
                                        <thead>
                                            <tr>
                                                <th>Version</th>
                                                <th>Label</th>
                                                <th>Uploaded</th>
                                                <th>By</th>
                                                <th>Changes</th>
                                                <th className="float-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {versionHistory.map((version) => (
                                                <tr key={version.version}>
                                                    <td>{version.version}</td>
                                                    <td>{version.label}</td>
                                                    <td>{formatDate(new Date(version.uploadedAt))}</td>
                                                    <td>{version.uploadedBy ? getFullName(version.uploadedBy) : "Unknown"}</td>
                                                    <td>{version.changelog || "No changes documented"}</td>
                                                    <td className="float-right">
                                                        <div className="flex gap-2">
                                                            <a
                                                                href={`/uploads/${files.find(f => f.version === version.version)?.filename}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn btn-xs bg-resdes-teal text-slate-950 hover:bg-resdes-teal hover:opacity-80"
                                                                disabled={!files.find(f => f.version === version.version)}
                                                            >
                                                                <DownloadIcon size={12} />
                                                                Download
                                                            </a>
                                                            {version.version > 1 && (
                                                                <button
                                                                    className="btn btn-xs btn-outline"
                                                                    onClick={() => compareVersions(version.version - 1, version.version)}
                                                                >
                                                                    Compare
                                                                </button>
                                                            )}
                                                        </div>
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

export default ViewDocPage;
