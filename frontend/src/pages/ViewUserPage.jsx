/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { UserIcon, EditIcon, MailIcon, PhoneIcon, BriefcaseIcon, CalendarIcon, BuildingIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT, formatDate } from "../lib/utils";

const ViewUserPage = () => {
    const { userId } = useParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Get current user info
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = decodeJWT(token);
                setCurrentUser(decoded);
                setIsAdmin(decoded?.role === "admin");
            } catch (error) {
                console.error("Invalid token:", error);
            }
        }
    }, []);

    // Fetch user data
    useEffect(() => {
        const fetchUser = async () => {
            if (!userId) return;

            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                const res = await api.get(`/users/${userId}`, { headers });
                setUser(res.data);
            } catch (error) {
                console.error("Error fetching user:", error);
                toast.error("Failed to load user profile");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center text-resdes-teal py-10">
                        Loading user profile...
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center py-8">
                        <p className="text-gray-500 text-lg">User not found.</p>
                        <Link to="/users" className="btn bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80 mt-4">
                            Back to Users
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const getFullName = () => {
        return `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Unknown User';
    };

    const getRoleBadge = (role) => {
        const roleColors = {
            admin: 'badge-error',
            editor: 'badge-warning', 
            viewer: 'badge-info'
        };
        return (
            <span className={`badge ${roleColors[role] || 'badge-neutral'} capitalize`}>
                {role || 'unknown'}
            </span>
        );
    };

    const isCurrentUser = currentUser && user._id === currentUser.id;
    const canEdit = isCurrentUser || isAdmin;

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <UserIcon className="size-8 text-resdes-orange" />
                            <h1 className="text-4xl font-bold text-base-content">User Profile</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {canEdit && (
                                <Link
                                    to={isCurrentUser ? "/my-profile" : `/edit-user/${user._id}`}
                                    className="btn bg-resdes-green text-slate-950 hover:bg-resdes-green hover:opacity-80"
                                >
                                    <EditIcon size={16} />
                                    Edit Profile
                                </Link>
                            )}
                            <Link to="/users" className="btn btn-ghost">
                                Back to Users
                            </Link>
                        </div>
                    </div>

                    {/* Profile Banner with Background Image */}
                    <div className="mb-6">
                        <div
                            className="relative bg-base-100 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border-t-4 border-solid border-resdes-orange overflow-hidden"
                            style={{
                                backgroundImage: user.backgroundImage ? `url(/uploads/${user.backgroundImage})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                minHeight: '200px'
                            }}
                        >
                            {/* Overlay for better text readability */}
                            {user.backgroundImage && (
                                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                            )}

                            {/* Profile Content */}
                            <div className="relative z-10 p-6 text-center">
                                {/* Profile Picture */}
                                <div className="mb-4">
                                    {user.profilePicture ? (
                                        <img
                                            src={`/uploads/${user.profilePicture}`}
                                            alt={`${getFullName()}'s profile`}
                                            className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-resdes-orange"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`w-32 h-32 rounded-full mx-auto bg-gray-200 flex items-center justify-center border-4 border-resdes-orange ${user.profilePicture ? 'hidden' : 'flex'}`}
                                    >
                                        <UserIcon className="size-16 text-gray-400" />
                                    </div>
                                </div>

                                {/* Name and Role */}
                                <h2 className={`text-2xl font-bold mb-2 ${user.backgroundImage ? 'text-white' : 'text-base-content'}`}>
                                    {getFullName()}
                                    {isCurrentUser && <span className="ml-2 text-sm text-resdes-teal">(You)</span>}
                                </h2>
                                <div className="mb-4">
                                    {getRoleBadge(user.role)}
                                </div>

                                {/* Member Since */}
                                <div className={`flex items-center justify-center gap-2 text-sm ${user.backgroundImage ? 'text-gray-200' : 'text-gray-500'}`}>
                                    <CalendarIcon className="size-4" />
                                    <span>Member since {formatDate(new Date(user.createdAt))}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Contact Information */}
                        <div>
                            <div className="bg-base-100 rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-200 border-t-4 border-solid border-resdes-orange">
                                <h3 className="text-xl font-bold text-base-content mb-6">Contact Information</h3>

                                <div className="space-y-4">
                                    {/* Email */}
                                    <div className="flex items-center gap-3 p-4 bg-base-300 rounded-lg">
                                        <MailIcon className="size-5 text-resdes-orange" />
                                        <div>
                                            <div className="text-base-content font-semibold">Email</div>
                                            <div className="text-link text-resdes-blue"><a href={`mailto:${user.email}`} target="_blank">{user.email}</a></div>
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    {user.telephone && (
                                        <div className="flex items-center gap-3 p-4 bg-base-300 rounded-lg">
                                            <PhoneIcon className="size-5 text-resdes-orange" />
                                            <div>
                                                <div className="text-base-content font-semibold">Phone</div>
                                                <div className="text-link text-resdes-blue"><a href={`tel:${user.telephone}`}>{user.telephone}</a></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Title/Position */}
                                    {user.title && (
                                        <div className="flex items-center gap-3 p-4 bg-base-300 rounded-lg">
                                            <BriefcaseIcon className="size-5 text-resdes-orange" />
                                            <div>
                                                <div className="text-base-content font-semibold">Title/Position</div>
                                                <div className="capitalize text-resdes-blue">{user.title}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Department */}
                                    {user.department && (
                                        <div className="flex items-center gap-3 p-4 bg-base-300 rounded-lg">
                                            <BuildingIcon className="size-5 text-resdes-orange" />
                                            <div>
                                                <div className="text-base-content font-semibold">Department</div>
                                                <div className="text-resdes-blue">{user.department}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Role */}
                                    <div className="flex items-center gap-3 p-4 bg-base-300 rounded-lg">
                                        <UserIcon className="size-5 text-resdes-orange" />
                                        <div>
                                            <div className="text-base-content font-semibold">Role</div>
                                            <div className="text-resdes-blue">{user.role}</div>
                                        </div>
                                    </div>

                                    {/* Account Created */}
                                    <div className="flex items-center gap-3 p-4 bg-base-300 rounded-lg">
                                        <CalendarIcon className="size-5 text-resdes-orange" />
                                        <div>
                                            <div className="text-base-content font-semibold">Account Created</div>
                                            <div className="font-semibold text-resdes-blue">{formatDate(new Date(user.createdAt))}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* About User Section */}
                        <div>
                            <div className="bg-base-100 rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-200 border-t-4 border-solid border-resdes-orange">
                                <h3 className="text-xl font-bold text-base-content mb-6">About User</h3>

                                <div className="space-y-4">
                                    {/* User Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-4 bg-base-300 rounded-lg">
                                            <div className="text-2xl font-bold text-resdes-orange">0</div>
                                            <div className="text-sm text-base-content">Documents</div>
                                        </div>
                                        <div className="text-center p-4 bg-base-300 rounded-lg">
                                            <div className="text-2xl font-bold text-resdes-teal">0</div>
                                            <div className="text-sm text-base-content">Teams</div>
                                        </div>
                                    </div>

                                    {/* User Bio/Description */}
                                    <div className="p-4 bg-base-300 rounded-lg">
                                        <h4 className="font-semibold text-base-content mb-2">Bio</h4>
                                        <p className="text-base-content text-sm">
                                            {user.bio || "This user hasn't added a bio yet."}
                                        </p>
                                    </div>

                                    {/* Recent Activity */}
                                    <div className="p-4 bg-base-300 rounded-lg">
                                        <h4 className="font-semibold text-base-content mb-2">Recent Activity</h4>
                                        <p className="text-base-content text-sm">
                                            Last seen: {formatDate(new Date(user.updatedAt || user.createdAt))}
                                        </p>
                                    </div>

                                    {/* Permissions */}
                                    <div className="p-4 bg-base-300 rounded-lg">
                                        <h4 className="font-semibold text-base-content mb-2">Permissions</h4>
                                        <div className="space-y-1 text-sm text-base-content">
                                            {user.role === 'admin' && (
                                                <>
                                                    <div>✓ Full system access</div>
                                                    <div>✓ User management</div>
                                                    <div>✓ Document management</div>
                                                    <div>✓ Team management</div>
                                                </>
                                            )}
                                            {user.role === 'editor' && (
                                                <>
                                                    <div>✓ Create and edit documents</div>
                                                    <div>✓ Team collaboration</div>
                                                    <div>✓ Project management</div>
                                                    <div>✗ User management</div>
                                                </>
                                            )}
                                            {user.role === 'viewer' && (
                                                <>
                                                    <div>✓ View documents</div>
                                                    <div>✓ Basic collaboration</div>
                                                    <div>✗ Create documents</div>
                                                    <div>✗ User management</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewUserPage;
