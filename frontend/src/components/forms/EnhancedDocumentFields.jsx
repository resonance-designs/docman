/*
 * @name EnhancedDocumentFields
 * @file /docman/frontend/src/components/forms/EnhancedDocumentFields.jsx
 * @component EnhancedDocumentFields
 * @description Enhanced form component for document fields with new review system
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import { Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useState, useEffect } from "react";

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
 * Calculate next review date based on interval from a base date
 * @param {Date} baseDate - Base date to calculate from (lastReviewedOn or opensForReview)
 * @param {string} reviewInterval - Review interval type
 * @param {number} reviewIntervalDays - Custom interval days
 * @returns {Date|null} Next review date
 */
const calculateNextReviewDate = (baseDate, reviewInterval, reviewIntervalDays) => {
    if (!baseDate) return null;

    const date = new Date(baseDate);

    switch (reviewInterval) {
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'semiannually':
            date.setMonth(date.getMonth() + 6);
            break;
        case 'annually':
            date.setFullYear(date.getFullYear() + 1);
            break;
        case 'custom':
            if (reviewIntervalDays) {
                date.setDate(date.getDate() + reviewIntervalDays);
            }
            break;
        default:
            return null;
    }

    return date;
};

/**
 * Calculate review due date based on opens for review date and review period
 * @param {Date} opensForReview - Date when document opens for review
 * @param {string} reviewPeriod - Review period (1week, 2weeks, 3weeks, 1month)
 * @returns {Date|null} Calculated review due date
 */
const calculateReviewDueDate = (opensForReview, reviewPeriod) => {
    if (!opensForReview || !reviewPeriod) return null;

    const date = new Date(opensForReview);

    switch (reviewPeriod) {
        case '1week':
            date.setDate(date.getDate() + 7);
            break;
        case '2weeks':
            date.setDate(date.getDate() + 14);
            break;
        case '3weeks':
            date.setDate(date.getDate() + 21);
            break;
        case '1month':
            date.setMonth(date.getMonth() + 1);
            break;
        default:
            return null;
    }

    return date;
};

/**
 * EnhancedDocumentFields component for rendering enhanced document form fields
 * @param {Object} props - Component props
 * @param {Object} props.register - React Hook Form register function
 * @param {Object} props.control - React Hook Form control object
 * @param {Object} props.errors - Form validation errors
 * @param {Object} props.watch - React Hook Form watch function
 * @param {Object} props.setValue - React Hook Form setValue function
 * @param {Array} props.users - Array of users for author selection
 * @param {Array} props.categories - Array of categories for category selection
 * @param {boolean} props.showFileUpload - Whether to show file upload field
 * @param {boolean} props.fileRequired - Whether file upload is required
 * @param {boolean} props.isViewMode - Whether form is in view mode (read-only)
 * @param {boolean} props.isEditMode - Whether form is in edit mode
 * @param {boolean} props.showNextReviewDate - Whether to show the "Next Review Due On" field
 * @returns {JSX.Element} EnhancedDocumentFields component
 */
export default function EnhancedDocumentFields({
    register,
    control,
    errors,
    watch,
    setValue,
    users = [],
    categories = [],
    showFileUpload = true,
    fileRequired = false,
    isViewMode = false,
    isEditMode = false,
    showNextReviewDate = true
}) {
    const [showCustomInterval, setShowCustomInterval] = useState(false);

    // Watch form values for calculations
    const opensForReview = watch("opensForReview");
    const reviewInterval = watch("reviewInterval");
    const reviewIntervalDays = watch("reviewIntervalDays");
    const reviewPeriod = watch("reviewPeriod");
    const lastReviewedOn = watch("lastReviewedOn");

    // Handle review interval change
    useEffect(() => {
        setShowCustomInterval(reviewInterval === 'custom');
    }, [reviewInterval]);

    // Calculate next review date based on the new logic
    useEffect(() => {
        if (!showNextReviewDate) return;

        let nextDate = null;

        if (lastReviewedOn && reviewInterval) {
            // If a review has been completed, calculate from lastReviewedOn + reviewInterval
            nextDate = calculateNextReviewDate(lastReviewedOn, reviewInterval, reviewIntervalDays);
        } else if (opensForReview && reviewPeriod) {
            // If no review completed yet, use opensForReview + reviewPeriod (same as review due date)
            nextDate = calculateReviewDueDate(opensForReview, reviewPeriod);
        }

        if (nextDate) {
            setValue("nextReviewDueOn", nextDate);
        }
    }, [lastReviewedOn, reviewInterval, reviewIntervalDays, opensForReview, reviewPeriod, setValue, showNextReviewDate]);

    return (
        <>
            {/* Title */}
            <div className="form-control mb-4">
                <label className="label pt-0" htmlFor="title">
                    <span className="label-text">Title *</span>
                </label>
                <input
                    id="title"
                    {...register("title")}
                    className="input input-bordered"
                    placeholder="Enter document title"
                    disabled={isViewMode}
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
                    disabled={isViewMode}
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
                    disabled={isViewMode}
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
                    disabled={isViewMode}
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

            {/* Opens For Review */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="opensForReview">
                    <span className="label-text">Opens For Review *</span>
                </label>
                <Controller
                    name="opensForReview"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            placeholderText="Select when document opens for review"
                            selected={field.value}
                            onChange={field.onChange}
                            className="input input-bordered w-full"
                            dateFormat="yyyy-MM-dd"
                            minDate={new Date()} // Prevent past dates
                            disabled={isViewMode}
                        />
                    )}
                />
                {errors.opensForReview && (
                    <p className="text-red-500 mt-1">{errors.opensForReview.message}</p>
                )}
            </div>

            {/* Review Interval */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="reviewInterval">
                    <span className="label-text">Review Interval *</span>
                </label>
                <select
                    id="reviewInterval"
                    {...register("reviewInterval")}
                    className="select select-bordered"
                    disabled={isViewMode}
                >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semiannually">Semiannually</option>
                    <option value="annually">Annually</option>
                    <option value="custom">Custom</option>
                </select>
                {errors.reviewInterval && (
                    <p className="text-red-500 mt-1">{errors.reviewInterval.message}</p>
                )}
            </div>

            {/* Custom Interval Days */}
            {showCustomInterval && (
                <div className="form-control mb-4">
                    <label className="label" htmlFor="reviewIntervalDays">
                        <span className="label-text">Custom Interval (Days) *</span>
                    </label>
                    <input
                        id="reviewIntervalDays"
                        type="number"
                        min="1"
                        {...register("reviewIntervalDays", {
                            setValueAs: (value) => value === "" ? null : Number(value)
                        })}
                        className="input input-bordered"
                        placeholder="Enter number of days"
                        disabled={isViewMode}
                    />
                    {errors.reviewIntervalDays && (
                        <p className="text-red-500 mt-1">{errors.reviewIntervalDays.message}</p>
                    )}
                </div>
            )}

            {/* Review Period */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="reviewPeriod">
                    <span className="label-text">Review Period *</span>
                </label>
                <select
                    id="reviewPeriod"
                    {...register("reviewPeriod")}
                    className="select select-bordered"
                    disabled={isViewMode}
                >
                    <option value="1week">1 Week</option>
                    <option value="2weeks">2 Weeks</option>
                    <option value="3weeks">3 Weeks</option>
                    <option value="1month">1 Month</option>
                </select>
                {errors.reviewPeriod && (
                    <p className="text-red-500 mt-1">{errors.reviewPeriod.message}</p>
                )}
                <div className="label">
                    <span className="label-text-alt">
                        Time frame that review assignees have to complete the review
                    </span>
                </div>
            </div>

            {/* Last Reviewed On */}
            <div className="form-control mb-4">
                <label className="label" htmlFor="lastReviewedOn">
                    <span className="label-text">Last Reviewed On</span>
                </label>
                <Controller
                    name="lastReviewedOn"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            placeholderText="Not reviewed yet"
                            selected={field.value}
                            onChange={field.onChange}
                            className="input input-bordered w-full"
                            dateFormat="yyyy-MM-dd"
                            disabled={true} // Always disabled as per requirements
                        />
                    )}
                />
                {errors.lastReviewedOn && (
                    <p className="text-red-500 mt-1">{errors.lastReviewedOn.message}</p>
                )}
            </div>

            {/* Next Review Due On - Only show in View/Edit modes */}
            {showNextReviewDate && (
                <div className="form-control mb-4">
                    <label className="label" htmlFor="nextReviewDueOn">
                        <span className="label-text">Next Review Due On</span>
                    </label>
                    <Controller
                        name="nextReviewDueOn"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                placeholderText="Calculated automatically"
                                selected={field.value}
                                onChange={field.onChange}
                                className="input input-bordered w-full"
                                dateFormat="yyyy-MM-dd"
                                disabled={true} // Always disabled as per requirements
                            />
                        )}
                    />
                    {errors.nextReviewDueOn && (
                        <p className="text-red-500 mt-1">{errors.nextReviewDueOn.message}</p>
                    )}
                    <div className="label">
                        <span className="label-text-alt">
                            {lastReviewedOn
                                ? "Calculated from last review date + review interval"
                                : "Calculated from opens for review date + review period (no reviews completed yet)"
                            }
                        </span>
                    </div>
                </div>
            )}

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
                        disabled={isViewMode}
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