/*
 * @name CollaboratorCard
 * @file /docman/frontend/src/components/projects/CollaboratorCard.jsx
 * @component CollaboratorCard
 * @description Card component for displaying project collaborators
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import { MoreVerticalIcon, UserIcon, MailIcon, PhoneIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from "react-router";
import toast from 'react-hot-toast';

const CollaboratorCard = ({ collaborator, canManage, onRemove }) => {
    const [showMenu, setShowMenu] = useState(false);

    const handleRemove = () => {
        if (collaborator.source === 'team') {
            toast.error(`Cannot remove ${collaborator.firstname} ${collaborator.lastname} - they are a team member. Remove them from the team instead.`);
            setShowMenu(false);
            return;
        }

        if (window.confirm(`Are you sure you want to remove ${collaborator.firstname} ${collaborator.lastname} from this project?`)) {
            onRemove(collaborator._id);
        }
        setShowMenu(false);
    };

    return (
        <div className="bg-base-300 rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-resdes-blue rounded-full flex items-center justify-center">
                        <span className="text-slate-200 font-bold text-lg">
                            {collaborator.firstname?.[0]?.toUpperCase()}{collaborator.lastname?.[0]?.toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">
                            {collaborator.firstname} {collaborator.lastname}
                        </h3>
                        <p className="text-gray-600">{collaborator.email}</p>
                        {collaborator.username && (
                            <Link
                                to={`/user/${collaborator._id}`}
                                className="text-sm font-semibold text-resdes-blue hover:text-resdes-blue/75 cursor-pointer"
                            >
                                @{collaborator.username}
                            </Link>
                        )}
                        {collaborator.phone && (
                            <div className="flex items-center mt-2 text-sm text-gray-500">
                                <PhoneIcon size={14} className="mr-1" />
                                {collaborator.phone}
                            </div>
                        )}
                    </div>
                </div>

                {canManage && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 rounded-full hover:bg-gray-100"
                        >
                            <MoreVerticalIcon size={16} className="text-gray-500" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-200 rounded-md shadow-lg z-10 border">
                                <div className="py-1">
                                    {collaborator.source === 'team' ? (
                                        <div className="px-4 py-2 text-sm text-gray-500">
                                            Team member - cannot remove directly
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleRemove}
                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            Remove from Project
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Role and source info */}
            <div className="mt-4 pt-4 border-t border-base-100">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-500">
                        <UserIcon size={14} className="mr-1" />
                        <span className="capitalize">{collaborator.role || 'Collaborator'}</span>
                    </div>
                    {collaborator.source && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            collaborator.source === 'team' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                        }`}>
                            {collaborator.source === 'team' ? `Team: ${collaborator.teamName}` : 'Direct'}
                        </span>
                    )}
                </div>
                {collaborator.joinedAt && (
                    <div className="mt-2 text-xs text-gray-400">
                        Joined {new Date(collaborator.joinedAt).toLocaleDateString()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollaboratorCard;