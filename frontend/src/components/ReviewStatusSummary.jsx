/*
 * @name ReviewStatusSummary
 * @file /docman/frontend/src/components/ReviewStatusSummary.jsx
 * @component ReviewStatusSummary
 * @description Summary component showing overall review completion status
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import { CheckCircleIcon, ClockIcon, UsersIcon } from "lucide-react";

/**
 * ReviewStatusSummary component for displaying review completion progress
 * @param {Object} props - Component props
 * @param {Array} props.assignments - Array of review assignments
 * @param {Object} props.completionStatus - Completion status object with completed, total, percentage
 * @param {boolean} props.allCompleted - Whether all reviews are completed
 * @param {Function} props.getFullName - Function to get user's full name
 * @returns {JSX.Element} ReviewStatusSummary component
 */
const ReviewStatusSummary = ({ 
    assignments = [], 
    completionStatus = { completed: 0, total: 0, percentage: 0 },
    allCompleted = false,
    getFullName 
}) => {
    const { completed, total, percentage } = completionStatus;

    if (!assignments.length) {
        return null;
    }

    return (
        <div className="mb-6 p-4 bg-base-300 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
                <UsersIcon className="text-resdes-blue" size={20} />
                <h3 className="text-lg font-semibold">Review Progress</h3>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                        {completed} of {total} reviews completed
                    </span>
                    <span className="text-sm font-medium">
                        {percentage}%
                    </span>
                </div>
                <div className="w-full bg-base-200 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                            allCompleted ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>

            {/* Overall Status */}
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
                allCompleted 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            }`}>
                {allCompleted ? (
                    <CheckCircleIcon size={20} />
                ) : (
                    <ClockIcon size={20} />
                )}
                <span className="font-medium">
                    {allCompleted 
                        ? 'All reviews completed!' 
                        : `Waiting for ${total - completed} review${total - completed !== 1 ? 's' : ''}`
                    }
                </span>
            </div>

            {/* Individual Assignee Status */}
            <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Review Assignees:</h4>
                <div className="space-y-2">
                    {assignments
                        .filter(assignment => assignment && assignment.assignee && assignment.assignee._id)
                        .map((assignment) => (
                        <div key={assignment._id} className="flex items-center justify-between p-2 bg-base-200 rounded">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                    assignment.status === 'completed' ? 'bg-green-600' : 'bg-gray-400'
                                }`}></div>
                                <span className="text-sm">
                                    {getFullName ? getFullName(assignment.assignee) : 
                                     (assignment.assignee?.firstname && assignment.assignee?.lastname 
                                        ? `${assignment.assignee.firstname} ${assignment.assignee.lastname}`
                                        : assignment.assignee?.email || 'Unknown User')}
                                </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                                assignment.status === 'completed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-600'
                            }`}>
                                {assignment.status === 'completed' ? 'Completed' : 'Pending'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReviewStatusSummary;