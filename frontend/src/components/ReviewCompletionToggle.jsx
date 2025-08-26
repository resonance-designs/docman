/*
 * @name ReviewCompletionToggle
 * @file /docman/frontend/src/components/ReviewCompletionToggle.jsx
 * @component ReviewCompletionToggle
 * @description Toggle component for review assignees to mark their review as complete
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { useState } from "react";
import { CheckCircleIcon, XCircleIcon, ClipboardCheckIcon } from "lucide-react";

/**
 * ReviewCompletionToggle component for marking individual reviews as complete
 * @param {Object} props - Component props
 * @param {Object} props.assignment - Review assignment object
 * @param {Function} props.onToggle - Function called when toggle is changed
 * @param {boolean} props.disabled - Whether the toggle is disabled
 * @param {boolean} props.loading - Whether the toggle is in loading state
 * @returns {JSX.Element} ReviewCompletionToggle component
 */
const ReviewCompletionToggle = ({
    assignment,
    onToggle,
    disabled = false,
    loading = false
}) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const isCompleted = assignment?.status === 'completed';

    const handleToggle = async () => {
        if (disabled || loading || isUpdating) return;

        setIsUpdating(true);
        try {
            const newStatus = isCompleted ? 'pending' : 'completed';
            await onToggle(assignment._id, newStatus);
        } catch (error) {
            console.error('Failed to update review status:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const isDisabled = disabled || loading || isUpdating;

    return (
        <div className="flex items-center gap-3 p-4 bg-base-200 rounded-lg border-2 border-dashed border-base-300">
            <div className="flex items-center gap-2">
                {isCompleted ? (
                    <CheckCircleIcon className="text-green-600" size={24} />
                ) : (
                    <XCircleIcon className="text-gray-400" size={24} />
                )}
                <span className="font-medium">
                    Mark Review as Complete
                </span>
            </div>

            <div className="flex-1"></div>

            <div className="form-control">
                <label className="label cursor-pointer gap-3">
                    <span className="label-text font-medium">
                        {isCompleted ? 'Completed' : 'Pending'}
                    </span>
                    <input
                        type="checkbox"
                        className={`toggle toggle-success ${isDisabled ? 'opacity-50' : ''}`}
                        checked={isCompleted}
                        onChange={handleToggle}
                        disabled={isDisabled}
                    />
                </label>
            </div>

            {(loading || isUpdating) && (
                <div className="loading loading-spinner loading-sm"></div>
            )}
        </div>
    );
};

export default ReviewCompletionToggle;