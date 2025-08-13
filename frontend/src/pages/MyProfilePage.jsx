import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { UserIcon, SaveIcon, EyeIcon, EyeOffIcon, CameraIcon, TrashIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";
import {
    validateName,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    validatePhone,
    validateTitle,
    validateRole,
    validateFileSize,
    validateFileType,
    validateImageDimensions
} from "../lib/validation";

const MyProfilePage = () => {
    const { userId } = useParams(); // For admin editing other users
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isEditingOther, setIsEditingOther] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [profilePicture, setProfilePicture] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState(null);
    const [uploadingPicture, setUploadingPicture] = useState(false);
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [backgroundImagePreview, setBackgroundImagePreview] = useState(null);
    const [uploadingBackground, setUploadingBackground] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const [formData, setFormData] = useState({
        firstname: "",
        lastname: "",
        email: "",
        telephone: "",
        title: "",
        department: "",
        bio: "",
        password: "",
        confirmPassword: "",
        role: "viewer"
    });

    // Get current user info and determine if admin
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = decodeJWT(token);
                setCurrentUser(decoded);
                setIsAdmin(decoded?.role === "admin");
                setIsEditingOther(userId && userId !== decoded?.id);
            } catch (error) {
                console.error("Invalid token:", error);
                navigate("/");
            }
        } else {
            navigate("/");
        }
    }, [userId, navigate]);

    // Fetch user data
    useEffect(() => {
        const fetchUserData = async () => {
            if (!currentUser) return;

            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                // If editing another user (admin only), fetch that user's data
                const targetUserId = isEditingOther ? userId : currentUser.id;
                const res = await api.get(`/users/${targetUserId}`, { headers });

                const userData = res.data;
                setFormData({
                    firstname: userData.firstname || "",
                    lastname: userData.lastname || "",
                    email: userData.email || "",
                    telephone: userData.telephone || "",
                    title: userData.title || "",
                    department: userData.department || "",
                    bio: userData.bio || "",
                    password: "",
                    confirmPassword: "",
                    role: userData.role || "viewer"
                });

                // Set profile picture preview if exists
                if (userData.profilePicture) {
                    setProfilePicturePreview(`/uploads/${userData.profilePicture}`);
                }

                // Set background image preview if exists
                if (userData.backgroundImage) {
                    setBackgroundImagePreview(`/uploads/${userData.backgroundImage}`);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                toast.error("Failed to load user data");
                if (error.response?.status === 403) {
                    navigate("/");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [currentUser, userId, isEditingOther, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Mark field as touched
        setTouched(prev => ({
            ...prev,
            [name]: true
        }));

        // Validate field in real-time
        validateField(name, value);
    };

    const validateField = (fieldName, value) => {
        let error = null;

        switch (fieldName) {
            case 'firstname':
                error = validateName(value, 'First name');
                break;
            case 'lastname':
                error = validateName(value, 'Last name');
                break;
            case 'email':
                error = validateEmail(value);
                break;
            case 'telephone':
                error = validatePhone(value);
                break;
            case 'title':
                error = validateTitle(value);
                break;
            case 'department':
                error = validateTitle(value); // Use same validation as title
                break;
            case 'password':
                error = validatePassword(value);
                break;
            case 'confirmPassword':
                error = validateConfirmPassword(formData.password, value);
                break;
            case 'role':
                error = validateRole(value);
                break;
            default:
                break;
        }

        setErrors(prev => ({
            ...prev,
            [fieldName]: error
        }));

        return error;
    };

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;

        if (!isEditingOther) {
            // Validate personal information for self-editing
            const firstnameError = validateName(formData.firstname, 'First name');
            if (firstnameError) {
                newErrors.firstname = firstnameError;
                isValid = false;
            }

            const lastnameError = validateName(formData.lastname, 'Last name');
            if (lastnameError) {
                newErrors.lastname = lastnameError;
                isValid = false;
            }

            const emailError = validateEmail(formData.email);
            if (emailError) {
                newErrors.email = emailError;
                isValid = false;
            }

            const phoneError = validatePhone(formData.telephone);
            if (phoneError) {
                newErrors.telephone = phoneError;
                isValid = false;
            }

            const titleError = validateTitle(formData.title);
            if (titleError) {
                newErrors.title = titleError;
                isValid = false;
            }

            const departmentError = validateTitle(formData.department);
            if (departmentError) {
                newErrors.department = departmentError;
                isValid = false;
            }
        } else {
            // Validate role for admin editing
            const roleError = validateRole(formData.role);
            if (roleError) {
                newErrors.role = roleError;
                isValid = false;
            }
        }

        // Validate password if provided
        if (formData.password) {
            const passwordError = validatePassword(formData.password);
            if (passwordError) {
                newErrors.password = passwordError;
                isValid = false;
            }

            const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
            if (confirmPasswordError) {
                newErrors.confirmPassword = confirmPasswordError;
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleProfilePictureChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const typeError = validateFileType(file, ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
            if (typeError) {
                toast.error(typeError);
                return;
            }

            // Validate file size
            const sizeError = validateFileSize(file, 2);
            if (sizeError) {
                toast.error(sizeError);
                return;
            }

            // Validate image dimensions
            const dimensionError = await validateImageDimensions(file, {
                minWidth: 100,
                minHeight: 100,
                maxWidth: 2000,
                maxHeight: 2000,
                recommendedWidth: 400,
                recommendedHeight: 400
            });

            if (dimensionError) {
                toast.error(dimensionError);
                return;
            }

            setProfilePicture(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfilePicturePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfilePictureUpload = async () => {
        if (!profilePicture) return;

        setUploadingPicture(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const formData = new FormData();
            formData.append('profilePicture', profilePicture);

            const targetUserId = isEditingOther ? userId : currentUser.id;
            const response = await api.post(`/users/${targetUserId}/profile-picture`, formData, {
                headers: {
                    ...headers,
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success("Profile picture uploaded successfully");
            setProfilePicture(null);

            // Update preview with the uploaded image URL
            if (response.data.url) {
                setProfilePicturePreview(response.data.url);
            }
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            toast.error(error.response?.data?.message || "Failed to upload profile picture");
        } finally {
            setUploadingPicture(false);
        }
    };

    const handleProfilePictureDelete = async () => {
        if (!window.confirm("Are you sure you want to delete your profile picture?")) return;

        setUploadingPicture(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const targetUserId = isEditingOther ? userId : currentUser.id;
            await api.delete(`/users/${targetUserId}/profile-picture`, { headers });

            toast.success("Profile picture deleted successfully");
            setProfilePicturePreview(null);
            setProfilePicture(null);
        } catch (error) {
            console.error("Error deleting profile picture:", error);
            toast.error(error.response?.data?.message || "Failed to delete profile picture");
        } finally {
            setUploadingPicture(false);
        }
    };

    const handleBackgroundImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const typeError = validateFileType(file, ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
            if (typeError) {
                toast.error(typeError);
                return;
            }

            // Validate file size (5MB for background images)
            const sizeError = validateFileSize(file, 5);
            if (sizeError) {
                toast.error(sizeError);
                return;
            }

            // Validate image dimensions for background images
            const dimensionError = await validateImageDimensions(file, {
                minWidth: 400,
                minHeight: 100,
                maxWidth: 3000,
                maxHeight: 1000,
                recommendedWidth: 1200,
                recommendedHeight: 300,
                aspectRatio: 4 // 4:1 ratio
            });

            if (dimensionError) {
                toast.error(dimensionError);
                return;
            }

            setBackgroundImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setBackgroundImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBackgroundImageUpload = async () => {
        if (!backgroundImage) return;

        setUploadingBackground(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const formData = new FormData();
            formData.append('backgroundImage', backgroundImage);

            const targetUserId = isEditingOther ? userId : currentUser.id;
            const response = await api.post(`/users/${targetUserId}/background-image`, formData, {
                headers: {
                    ...headers,
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success("Background image uploaded successfully");
            setBackgroundImage(null);

            // Update preview with the uploaded image URL
            if (response.data.url) {
                setBackgroundImagePreview(response.data.url);
            }
        } catch (error) {
            console.error("Error uploading background image:", error);
            toast.error(error.response?.data?.message || "Failed to upload background image");
        } finally {
            setUploadingBackground(false);
        }
    };

    const handleBackgroundImageDelete = async () => {
        if (!window.confirm("Are you sure you want to delete your background image?")) return;

        setUploadingBackground(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const targetUserId = isEditingOther ? userId : currentUser.id;
            await api.delete(`/users/${targetUserId}/background-image`, { headers });

            toast.success("Background image deleted successfully");
            setBackgroundImagePreview(null);
            setBackgroundImage(null);
        } catch (error) {
            console.error("Error deleting background image:", error);
            toast.error(error.response?.data?.message || "Failed to delete background image");
        } finally {
            setUploadingBackground(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            toast.error("Please fix the errors below");
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Prepare update data
            const updateData = {
                firstname: formData.firstname,
                lastname: formData.lastname,
                email: formData.email,
                telephone: formData.telephone,
                title: formData.title,
                department: formData.department,
                bio: formData.bio
            };

            // Add password if provided
            if (formData.password) {
                updateData.password = formData.password;
            }

            // Add role if admin editing another user
            if (isEditingOther && isAdmin) {
                updateData.role = formData.role;
            }

            const targetUserId = isEditingOther ? userId : currentUser.id;
            await api.put(`/users/${targetUserId}`, updateData, { headers });

            toast.success(isEditingOther ? "User updated successfully" : "Profile updated successfully");

            // Clear password fields
            setFormData(prev => ({
                ...prev,
                password: "",
                confirmPassword: ""
            }));

            // If editing own profile and email changed, might need to re-login
            if (!isEditingOther && formData.email !== currentUser.email) {
                toast.info("Email updated. You may need to log in again.");
            }

        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center text-resdes-teal py-10">
                        Loading profile...
                    </div>
                </div>
            </div>
        );
    }

    const pageTitle = isEditingOther ? "Edit User Profile" : "My Profile";
    const submitText = isEditingOther ? "Update User" : "Update Profile";

    // Helper component for field errors
    const FieldError = ({ error }) => {
        if (!error) return null;
        return <div className="text-red-500 text-sm mt-1">{error}</div>;
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <UserIcon className="size-8 text-resdes-orange" />
                            <h1 className="text-4xl font-bold text-base-content">{pageTitle}</h1>
                        </div>

                        {/* View My Profile Button - Only for self-editing */}
                        {!isEditingOther && (
                            <Link
                                to={`/user/${currentUser.id}`}
                                className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                            >
                                <EyeIcon size={16} />
                                View My Profile
                            </Link>
                        )}
                    </div>

                    {/* Profile Form */}
                    <div className="bg-base-100 rounded-xl shadow-md p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Background Image Section - Only for self-editing */}
                            {!isEditingOther && (
                                <div className="flex flex-col items-center gap-4 p-6 bg-base-300 rounded-lg">
                                    <h3 className="text-lg font-semibold text-base-content">Background Image</h3>

                                    {/* Current/Preview Background */}
                                    <div className="relative w-full max-w-md">
                                        {backgroundImagePreview ? (
                                            <>
                                                <div
                                                    className="w-full h-32 rounded-lg bg-cover bg-center border-4 border-resdes-orange"
                                                    style={{ backgroundImage: `url(${backgroundImagePreview})` }}
                                                />
                                                {/* Hidden img element to detect load errors */}
                                                <img
                                                    src={backgroundImagePreview}
                                                    alt="Background test"
                                                    className="hidden"
                                                    onError={(e) => {
                                                        console.error("Failed to load background image:", e.target.src);
                                                        toast.error("Failed to load background image. Please try uploading again.");
                                                    }}
                                                />
                                            </>
                                        ) : (
                                            <div className="w-full h-32 rounded-lg bg-gray-200 flex items-center justify-center border-4 border-resdes-orange">
                                                <span className="text-gray-400 text-sm">No background image</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Controls */}
                                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleBackgroundImageChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                disabled={uploadingBackground}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                                disabled={uploadingBackground}
                                            >
                                                <CameraIcon size={16} />
                                                Choose Background
                                            </button>
                                        </div>

                                        {backgroundImage && (
                                            <button
                                                type="button"
                                                onClick={handleBackgroundImageUpload}
                                                disabled={uploadingBackground}
                                                className="btn btn-sm bg-green-600 text-white hover:bg-green-700"
                                            >
                                                {uploadingBackground ? (
                                                    <span className="loading loading-spinner loading-sm"></span>
                                                ) : (
                                                    <>
                                                        <SaveIcon size={16} />
                                                        Upload
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {backgroundImagePreview && !backgroundImage && (
                                            <button
                                                type="button"
                                                onClick={handleBackgroundImageDelete}
                                                disabled={uploadingBackground}
                                                className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
                                            >
                                                {uploadingBackground ? (
                                                    <span className="loading loading-spinner loading-sm"></span>
                                                ) : (
                                                    <>
                                                        <TrashIcon size={16} />
                                                        Delete
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-500 text-center">
                                        Upload a background image (JPEG, PNG, GIF, WebP).<br/>
                                        <strong>Recommended:</strong> 1200x300px (4:1 ratio), Max size: 5MB
                                    </p>
                                </div>
                            )}

                            {/* Profile Picture and Basic Info Section - Only for self-editing */}
                            {!isEditingOther && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Profile Picture Column */}
                                    <div className="lg:col-span-1">
                                        <div className="flex flex-col items-center gap-4 p-6 bg-base-100 rounded-lg">
                                            <h3 className="text-lg font-semibold text-base-content">Profile Picture</h3>

                                            {/* Current/Preview Picture */}
                                            <div className="relative">
                                                {profilePicturePreview ? (
                                                    <img
                                                        src={profilePicturePreview}
                                                        alt="Profile preview"
                                                        className="w-32 h-32 rounded-full object-cover border-4 border-resdes-orange"
                                                        onError={(e) => {
                                                            console.error("Failed to load profile picture:", e.target.src);
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-resdes-orange ${profilePicturePreview ? 'hidden' : 'flex'}`}
                                                >
                                                    <UserIcon className="size-16 text-gray-400" />
                                                </div>
                                            </div>

                                            {/* Upload Controls */}
                                            <div className="flex flex-col gap-3 items-center">
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleProfilePictureChange}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        disabled={uploadingPicture}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm bg-resdes-teal text-white hover:bg-resdes-teal hover:opacity-80"
                                                        disabled={uploadingPicture}
                                                    >
                                                        <CameraIcon size={16} />
                                                        Choose Picture
                                                    </button>
                                                </div>

                                                {profilePicture && (
                                                    <button
                                                        type="button"
                                                        onClick={handleProfilePictureUpload}
                                                        disabled={uploadingPicture}
                                                        className="btn btn-sm bg-green-600 text-white hover:bg-green-700"
                                                    >
                                                        {uploadingPicture ? (
                                                            <span className="loading loading-spinner loading-sm"></span>
                                                        ) : (
                                                            <>
                                                                <SaveIcon size={16} />
                                                                Upload
                                                            </>
                                                        )}
                                                    </button>
                                                )}

                                                {profilePicturePreview && !profilePicture && (
                                                    <button
                                                        type="button"
                                                        onClick={handleProfilePictureDelete}
                                                        disabled={uploadingPicture}
                                                        className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
                                                    >
                                                        {uploadingPicture ? (
                                                            <span className="loading loading-spinner loading-sm"></span>
                                                        ) : (
                                                            <>
                                                                <TrashIcon size={16} />
                                                                Delete
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            <p className="text-sm text-gray-500 text-center">
                                                Upload a profile picture (JPEG, PNG, GIF, WebP).<br/>
                                                <strong>Recommended:</strong> 400x400px, Max size: 2MB
                                            </p>
                                        </div>
                                    </div>

                                    {/* Basic Info Column */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Name Fields */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label" htmlFor="firstname">
                                                    <span className="label-text font-semibold">First Name</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="firstname"
                                                    value={formData.firstname}
                                                    onChange={handleInputChange}
                                                    className={`input input-bordered w-full ${errors.firstname ? 'input-error' : ''}`}
                                                    placeholder="Enter first name"
                                                    required
                                                />
                                                <FieldError error={errors.firstname} />
                                            </div>
                                            <div className="form-control">
                                                <label className="label" htmlFor="lastname">
                                                    <span className="label-text font-semibold">Last Name</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="lastname"
                                                    value={formData.lastname}
                                                    onChange={handleInputChange}
                                                    className={`input input-bordered w-full ${errors.lastname ? 'input-error' : ''}`}
                                                    placeholder="Enter last name"
                                                    required
                                                />
                                                <FieldError error={errors.lastname} />
                                            </div>
                                        </div>

                                        {/* Email and Telephone */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label" htmlFor="email">
                                                    <span className="label-text font-semibold">Email</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-full"
                                                    placeholder="Enter email address"
                                                    required
                                                />
                                            </div>
                                            <div className="form-control">
                                                <label className="label" htmlFor="telephone">
                                                    <span className="label-text font-semibold">Telephone</span>
                                                    <span className="label-text-alt text-gray-500">Optional</span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="telephone"
                                                    value={formData.telephone}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-full"
                                                    placeholder="Enter phone number"
                                                />
                                            </div>
                                        </div>

                                        {/* Title and Department */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label" htmlFor="title">
                                                    <span className="label-text font-semibold">Title/Position</span>
                                                    <span className="label-text-alt text-gray-500">Optional</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="title"
                                                    value={formData.title}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-full"
                                                    placeholder="Enter job title"
                                                />
                                            </div>
                                            <div className="form-control">
                                                <label className="label" htmlFor="department">
                                                    <span className="label-text font-semibold">Department</span>
                                                    <span className="label-text-alt text-gray-500">Optional</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="department"
                                                    value={formData.department}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-full"
                                                    placeholder="Enter department"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bio Section - Only for self-editing */}
                            {!isEditingOther && (
                                <div className="form-control">
                                    <label className="label" htmlFor="bio">
                                        <span className="label-text font-semibold">Bio</span>
                                        <span className="label-text-alt text-gray-500">Optional (max 500 characters)</span>
                                    </label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        className="textarea textarea-bordered w-full h-24"
                                        placeholder="Tell us about yourself..."
                                        maxLength={500}
                                    />
                                    <div className="label">
                                        <span className="label-text-alt text-gray-500">
                                            {formData.bio.length}/500 characters
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Role (Admin editing other users only) */}
                            {isEditingOther && isAdmin && (
                                <div className="form-control">
                                    <label className="label" htmlFor="role">
                                        <span className="label-text font-semibold">Role</span>
                                    </label>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className="select select-bordered w-full"
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            )}

                            {/* Password Fields */}
                            <div className="divider">
                                <span className="text-sm text-gray-500">Change Password (Optional)</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label" htmlFor="password">
                                        <span className="label-text font-semibold">New Password</span>
                                        <span className="label-text-alt text-gray-500">Leave blank to keep current</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="input input-bordered w-full pr-10"
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-control">
                                    <label className="label" htmlFor="confirmPassword">
                                        <span className="label-text font-semibold">Confirm Password</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="input input-bordered w-full pr-10"
                                            placeholder="Confirm new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80 min-w-32"
                                >
                                    {saving ? (
                                        <span className="loading loading-spinner loading-sm"></span>
                                    ) : (
                                        <>
                                            <SaveIcon size={16} />
                                            {submitText}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyProfilePage;
