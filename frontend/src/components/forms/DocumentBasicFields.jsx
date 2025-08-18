/*
 * @name DocumentBasicFields
 * @file /docman/frontend/src/components/forms/DocumentBasicFields.jsx
 * @component DocumentBasicFields
 * @description Reusable form component for basic document fields (title, description, author, category, review date)
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import { Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
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
 * DocumentBasicFields component for rendering basic document form fields
 * @param {Object} props - Component props
 * @param {Object} props.register - React Hook Form register function
 * @param {Object} props.control - React Hook Form control object
 * @param {Object} props.errors - Form validation errors
 * @param {Array} props.users - Array of users for author selection
 * @param {Array} props.categories - Array of categories for category selection
 * @param {boolean} props.showFileUpload - Whether to show file upload field
 * @param {boolean} props.fileRequired - Whether file upload is required
 * @returns {JSX.Element} DocumentBasicFields component
 */
export default function DocumentBasicFields({
    register,
    control,
    errors,
    users = [],
    categories = [],
    showFileUpload = true,
    fileRequired = false
}) {
    return (
        <>
            {/* Title */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="title">
                    <span className="label-text">Title *</span>
                </label>
                <input 
                    id="title" 
                    {...register("title")} 
                    className="input input-bordered" 
                    placeholder="Enter document title"
                />
                {errors.title && (
                    <p className="text-red-500 mt-1">{errors.title.message}</p>
                )}
            </div>

            {/* Description */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="description">
                    <span className="label-text">Description *</span>
                </label>
                <textarea 
                    id="description" 
                    {...register("description")} 
                    className="textarea textarea-bordered h-24" 
                    placeholder="Enter document description"
                />
                {errors.description && (
                    <p className="text-red-500 mt-1">{errors.description.message}</p>
                )}
            </div>

            {/* Author */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="author">
                    <span className="label-text">Author *</span>
                </label>
                <select 
                    id="author" 
                    {...register("author")} 
                    className="select select-bordered"
                >
                    <option value="">Select an author</option>
                    {Array.isArray(users) && users.map((user) => (
                        <option key={user._id} value={user._id}>
                            {getFullName(user)}
                        </option>
                    ))}
                </select>
                {errors.author && (
                    <p className="text-red-500 mt-1">{errors.author.message}</p>
                )}
            </div>

            {/* Category */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="category">
                    <span className="label-text">Category *</span>
                </label>
                <select 
                    id="category" 
                    {...register("category")} 
                    className="select select-bordered"
                >
                    <option value="">Select a category</option>
                    {Array.isArray(categories) && categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                            {cat.name}
                        </option>
                    ))}
                </select>
                {errors.category && (
                    <p className="text-red-500 mt-1">{errors.category.message}</p>
                )}
            </div>

            {/* Review Date */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="reviewDate">
                    <span className="label-text">Review Date *</span>
                </label>
                <Controller
                    name="reviewDate"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            placeholderText="Select review date"
                            selected={field.value}
                            onChange={field.onChange}
                            className="input input-bordered w-full"
                            dateFormat="yyyy-MM-dd"
                        />
                    )}
                />
                {errors.reviewDate && (
                    <p className="text-red-500 mt-1">{errors.reviewDate.message}</p>
                )}
            </div>

            {/* File Upload */}
            {showFileUpload && (
                <div className="form-control mb-4">
                    <label className="label" htmlFor="file">
                        <span className="label-text">
                            File {fileRequired ? "*" : "(Optional)"}
                        </span>
                    </label>
                    <input 
                        id="file" 
                        type="file" 
                        {...register("file")} 
                        className="file-input file-input-bordered w-full"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg"
                    />
                    {errors.file && (
                        <p className="text-red-500 mt-1">{errors.file.message}</p>
                    )}
                    <div className="label">
                        <span className="label-text-alt">
                            Supported formats: PDF, Word, Excel, PowerPoint, images, text files (max 10MB)
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}
