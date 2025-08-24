/*
 * @name StakeholderSelection
 * @file /docman/frontend/src/components/forms/StakeholderSelection.jsx
 * @component StakeholderSelection
 * @description Reusable component for selecting stakeholders and owners with chip-based UI
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { X } from "lucide-react";
import { ensureArray } from "../../lib/safeUtils";

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
 * StakeholderSelection component for managing stakeholders and owners
 * @param {Object} props - Component props
 * @param {Array} props.users - Array of available users
 * @param {Array} props.selectedStakeholders - Array of selected stakeholder IDs
 * @param {Array} props.selectedOwners - Array of selected owner IDs
 * @param {Function} props.onStakeholderAdd - Function to add stakeholder
 * @param {Function} props.onStakeholderRemove - Function to remove stakeholder
 * @param {Function} props.onOwnerAdd - Function to add owner
 * @param {Function} props.onOwnerRemove - Function to remove owner
 * @returns {JSX.Element} StakeholderSelection component
 */
export default function StakeholderSelection({
    users = [],
    selectedStakeholders = [],
    selectedOwners = [],
    onStakeholderAdd,
    onStakeholderRemove,
    onOwnerAdd,
    onOwnerRemove
}) {
    // Early safety check
    if (!users) {
        console.warn('StakeholderSelection: users prop is null/undefined, using empty array');
    }
    // Get user object by ID
    const getUserById = (userId) => {
        const safeUsers = ensureArray(users);
        return safeUsers.find(user => user._id === userId);
    };

    // Get available users for stakeholder selection (not already selected)
    const safeUsers = ensureArray(users);
    const safeSelectedStakeholders = ensureArray(selectedStakeholders);
    const safeSelectedOwners = ensureArray(selectedOwners);

    const availableStakeholders = safeUsers.filter(user =>
        !safeSelectedStakeholders.includes(user._id)
    );

    // Get available users for owner selection (not already selected)
    const availableOwners = safeUsers.filter(user =>
        !safeSelectedOwners.includes(user._id)
    );

    return (
        <div className="space-y-6">
            {/* Stakeholders Section */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text font-semibold">Stakeholders</span>
                </label>
                <p className="text-sm text-gray-600 mb-2">
                    Select users who should be notified about this document
                </p>
                
                {/* Stakeholder Selection Dropdown */}
                <select 
                    className="select select-bordered mb-3"
                    value=""
                    onChange={(e) => {
                        if (e.target.value) {
                            onStakeholderAdd(e.target.value);
                            e.target.value = ""; // Reset selection
                        }
                    }}
                >
                    <option value="">Add a stakeholder...</option>
                    {availableStakeholders.map((user) => (
                        <option key={user._id} value={user._id}>
                            {getFullName(user)} ({user.email})
                        </option>
                    ))}
                </select>

                {/* Selected Stakeholders Chips */}
                <div className="flex flex-wrap gap-2">
                    {safeSelectedStakeholders.map((stakeholderId) => {
                        const user = getUserById(stakeholderId);
                        if (!user) return null;
                        
                        return (
                            <div 
                                key={stakeholderId} 
                                className="badge badge-primary gap-2 p-3"
                            >
                                <span>{getFullName(user)}</span>
                                <button
                                    type="button"
                                    onClick={() => onStakeholderRemove(stakeholderId)}
                                    className="btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>
                
                {selectedStakeholders.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No stakeholders selected</p>
                )}
            </div>

            {/* Owners Section */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text font-semibold">Owners</span>
                </label>
                <p className="text-sm text-gray-600 mb-2">
                    Select users who have ownership responsibility for this document
                </p>
                
                {/* Owner Selection Dropdown */}
                <select 
                    className="select select-bordered mb-3"
                    value=""
                    onChange={(e) => {
                        if (e.target.value) {
                            onOwnerAdd(e.target.value);
                            e.target.value = ""; // Reset selection
                        }
                    }}
                >
                    <option value="">Add an owner...</option>
                    {availableOwners.map((user) => (
                        <option key={user._id} value={user._id}>
                            {getFullName(user)} ({user.email})
                        </option>
                    ))}
                </select>

                {/* Selected Owners Chips */}
                <div className="flex flex-wrap gap-2">
                    {safeSelectedOwners.map((ownerId) => {
                        const user = getUserById(ownerId);
                        if (!user) return null;
                        
                        return (
                            <div 
                                key={ownerId} 
                                className="badge badge-secondary gap-2 p-3"
                            >
                                <span>{getFullName(user)}</span>
                                <button
                                    type="button"
                                    onClick={() => onOwnerRemove(ownerId)}
                                    className="btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>
                
                {selectedOwners.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No owners selected</p>
                )}
            </div>
        </div>
    );
}
