/*
 * @name ReviewAssignments
 * @file /docman/frontend/src/components/forms/ReviewAssignments.jsx
 * @component ReviewAssignments
 * @description Reusable component for managing document review assignments with date scheduling and notes
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import { Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import { X } from "lucide-react";
import { ensureArray } from "../../lib/safeUtils";
import "react-datepicker/dist/react-datepicker.css";

/**
 * Get full name from user object
 * @param {Object} user - User object
 * @returns {string} Full name
 */
const getFullName = (user) => {
    if (!user) return "";
    return `${user.firstname || ""} ${user.lastname || ""}`.trim();
};

/**
 * ReviewAssignments component for managing document review scheduling
 * @param {Object} props - Component props
 * @param {Object} props.control - React Hook Form control object
 * @param {Array} props.users - Array of available users
 * @param {Array} props.reviewAssignees - Array of selected review assignee IDs
 * @param {Date} props.reviewDueDate - Review due date
 * @param {string} props.reviewNotes - Review notes
 * @param {Function} props.onAssigneeAdd - Function to add review assignee
 * @param {Function} props.onAssigneeRemove - Function to remove review assignee
 * @param {Function} props.onDueDateChange - Function to handle due date change
 * @param {Function} props.onNotesChange - Function to handle notes change
 * @param {string} props.validationError - Validation error message
 * @returns {JSX.Element} ReviewAssignments component
 */
export default function ReviewAssignments({
    control,
    users = [],
    reviewAssignees = [],
    reviewDueDate,
    reviewNotes,
    onAssigneeAdd,
    onAssigneeRemove,
    onDueDateChange,
    onNotesChange,
    validationError
}) {
    // Get user object by ID
    const getUserById = (userId) => users.find(user => user._id === userId);

    // Get available users for review assignment (not already selected)
    const safeUsers = ensureArray(users);
    const safeReviewAssignees = ensureArray(reviewAssignees);

    const availableReviewers = safeUsers.filter(user =>
        !safeReviewAssignees.includes(user._id)
    );

    return (
        <div className="form-control mb-6">
            <label className="label">
                <span className="label-text font-semibold">Review Assignments</span>
            </label>
            <p className="text-sm text-gray-600 mb-4">
                Schedule reviewers for this document with due dates and notes
            </p>
            
            {/* Review Due Date */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="reviewDueDate">
                    <span className="label-text">Review Due Date</span>
                </label>
                <Controller
                    name="reviewDueDate"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            placeholderText="Select review due date"
                            selected={field.value}
                            onChange={(date) => {
                                field.onChange(date);
                                onDueDateChange(date);
                            }}
                            className="input input-bordered w-full"
                            dateFormat="yyyy-MM-dd"
                            minDate={new Date()}
                        />
                    )}
                />
            </div>

            {/* Review Assignee Selection */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="reviewAssigneeSelect">
                    <span className="label-text">Add Review Assignee</span>
                </label>
                <select 
                    id="reviewAssigneeSelect"
                    className="select select-bordered"
                    value=""
                    onChange={(e) => {
                        if (e.target.value) {
                            onAssigneeAdd(e.target.value);
                            e.target.value = ""; // Reset selection
                        }
                    }}
                >
                    <option value="">Select a reviewer...</option>
                    {availableReviewers.map((user) => (
                        <option key={user._id} value={user._id}>
                            {getFullName(user)} ({user.email})
                        </option>
                    ))}
                </select>
            </div>

            {/* Selected Review Assignees */}
            <div className="form-control mb-4">
                <label className="label">
                    <span className="label-text">Selected Reviewers</span>
                </label>
                <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border border-gray-300 rounded-lg">
                    {safeReviewAssignees.length > 0 ? (
                        safeReviewAssignees.map((assigneeId) => {
                            const user = getUserById(assigneeId);
                            if (!user) return null;
                            
                            return (
                                <div 
                                    key={assigneeId} 
                                    className="badge badge-info gap-2 p-3"
                                >
                                    <span>{getFullName(user)}</span>
                                    <button
                                        type="button"
                                        onClick={() => onAssigneeRemove(assigneeId)}
                                        className="btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-gray-500 italic">No reviewers assigned</p>
                    )}
                </div>
            </div>

            {/* Review Notes */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="reviewNotes">
                    <span className="label-text">Review Notes</span>
                </label>
                <textarea 
                    id="reviewNotes"
                    className="textarea textarea-bordered h-24" 
                    placeholder="Add any notes or instructions for reviewers..."
                    value={reviewNotes}
                    onChange={(e) => onNotesChange(e.target.value)}
                />
            </div>

            {/* Validation Error */}
            {validationError && (
                <div className="alert alert-error mb-4">
                    <span>{validationError}</span>
                </div>
            )}

            {/* Review Assignment Summary */}
            {reviewAssignees.length > 0 && (
                <div className="alert alert-info">
                    <div>
                        <h4 className="font-semibold">Review Assignment Summary</h4>
                        <p className="text-sm">
                            {reviewAssignees.length} reviewer{reviewAssignees.length !== 1 ? 's' : ''} assigned
                            {reviewDueDate && (
                                <span> • Due: {reviewDueDate.toLocaleDateString()}</span>
                            )}
                        </p>
                        {reviewNotes && (
                            <p className="text-sm mt-1">
                                <strong>Notes:</strong> {reviewNotes}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
