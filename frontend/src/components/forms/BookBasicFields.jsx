/*
 * @name BookBasicFields
 * @file /docman/frontend/src/components/forms/BookBasicFields.jsx
 * @component BookBasicFields
 * @description Reusable form component for basic book fields (title, description, category)
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */

/**
 * BookBasicFields component for rendering basic book form fields
 * @param {Object} props - Component props
 * @param {Object} props.register - React Hook Form register function
 * @param {Object} props.control - React Hook Form control object
 * @param {Object} props.errors - Form validation errors
 * @param {Array} props.categories - Array of categories for category selection
 * @returns {JSX.Element} BookBasicFields component
 */
export default function BookBasicFields({
    register,
    control,
    errors,
    categories = []
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
                    placeholder="Enter book title"
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
                    placeholder="Enter book description"
                />
                {errors.description && (
                    <p className="text-red-500 mt-1">{errors.description.message}</p>
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
                {categories.length === 0 && (
                    <div className="label">
                        <span className="label-text-alt text-warning">
                            No Book categories available. Please create some Book-type categories first.
                        </span>
                    </div>
                )}
            </div>
        </>
    );
}