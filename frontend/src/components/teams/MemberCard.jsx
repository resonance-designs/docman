/*
 * @name MemberCard
 * @file /docman/frontend/src/components/teams/MemberCard.jsx
 * @component MemberCard
 * @description Card component for displaying team member information
 * @author Richard Bakos
 * @version 2.1.3
 * @license UNLICENSED
 */
import { MoreVerticalIcon, UserIcon, CrownIcon, ShieldIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const MemberCard = ({ member, currentUser, canManageTeam, onRemoveMember, teamOwner }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const user = member.user;
    const isCurrentUser = currentUser && user._id === currentUser.id;
    const isOwner = teamOwner && user._id === teamOwner._id;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const getRoleIcon = (role, isOwner) => {
        if (isOwner) {
            return <CrownIcon className="h-4 w-4 text-yellow-500" />;
        }
        switch (role) {
            case 'admin':
                return <ShieldIcon className="h-4 w-4 text-blue-500" />;
            default:
                return <UserIcon className="h-4 w-4 text-gray-500" />;
        }
    };

    const getRoleColor = (role, isOwner) => {
        if (isOwner) {
            return 'bg-yellow-100 text-yellow-800';
        }
        switch (role) {
            case 'admin':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleText = (role, isOwner) => {
        if (isOwner) {
            return 'Owner';
        }
        switch (role) {
            case 'admin':
                return 'Admin';
            default:
                return 'Member';
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        isOwner ? 'bg-yellow-500' : member.role === 'admin' ? 'bg-blue-500' : 'bg-resdes-blue'
                    }`}>
                        <span className="text-white font-medium text-sm">
                            {user.firstname?.[0]?.toUpperCase()}{user.lastname?.[0]?.toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-900">
                            {user.firstname} {user.lastname}
                            {isCurrentUser && <span className="text-gray-500 ml-1">(You)</span>}
                        </h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex items-center space-x-1 mt-1">
                            {getRoleIcon(member.role, isOwner)}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role, isOwner)}`}>
                                {getRoleText(member.role, isOwner)}
                            </span>
                        </div>
                    </div>
                </div>

                {canManageTeam && !isOwner && !isCurrentUser && (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 rounded-full hover:bg-gray-100"
                        >
                            <MoreVerticalIcon className="h-4 w-4 text-gray-500" />
                        </button>
                        
                        {showMenu && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            onRemoveMember(user._id);
                                            setShowMenu(false);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                    >
                                        Remove from team
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100">
                {user.username && (
                    <p className="text-xs text-gray-500 mb-1">
                        <span className="font-medium">Username:</span> {user.username}
                    </p>
                )}
                {member.joinedAt && (
                    <p className="text-xs text-gray-500">
                        <span className="font-medium">Joined:</span> {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                )}
            </div>
        </div>
    );
};

export default MemberCard;