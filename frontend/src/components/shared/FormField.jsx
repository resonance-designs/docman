/*
 * @name FormField
 * @file /docman/frontend/src/components/shared/FormField.jsx
 * @component FormField
 * @description Reusable form field component with consistent styling, validation, and error handling
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import PropTypes from "prop-types";

/**
 * Reusable form field component with consistent styling and validation
 * @param {Object} props - Component properties
 * @param {string} props.label - Field label
 * @param {string} props.name - Field name
 * @param {string} [props.type="text"] - Input type
 * @param {string} [props.value=""] - Field value
 * @param {Function} props.onChange - Change handler
 * @param {string} [props.placeholder=""] - Placeholder text
 * @param {boolean} [props.required=false] - Whether field is required
 * @param {boolean} [props.disabled=false] - Whether field is disabled
 * @param {string} [props.error=""] - Error message to display
 * @param {string} [props.helpText=""] - Help text to display
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {string} [props.inputClassName=""] - Additional CSS classes for input
 * @param {React.ReactNode} [props.icon] - Optional icon to display
 * @param {string} [props.iconPosition="left"] - Icon position (left or right)
 * @param {number} [props.rows] - Number of rows for textarea
 * @param {Array} [props.options] - Options for select input
 * @param {string} [props.as="input"] - Component type (input, textarea, select)
 * @returns {JSX.Element} The form field component
 */
const FormField = ({
    label,
    name,
    type = "text",
    value = "",
    onChange,
    placeholder = "",
    required = false,
    disabled = false,
    error = "",
    helpText = "",
    className = "",
    inputClassName = "",
    icon,
    iconPosition = "left",
    rows,
    options = [],
    as = "input",
    ...rest
}) => {
    const fieldId = `field-${name}`;
    const hasError = Boolean(error);

    // Base input classes
    const baseInputClasses = `
        input input-bordered w-full
        ${hasError ? "input-error" : ""}
        ${disabled ? "input-disabled" : ""}
        ${icon ? (iconPosition === "left" ? "pl-10" : "pr-10") : ""}
        ${inputClassName}
    `;

    // Base textarea classes
    const baseTextareaClasses = `
        textarea textarea-bordered w-full
        ${hasError ? "textarea-error" : ""}
        ${disabled ? "textarea-disabled" : ""}
        ${inputClassName}
    `;

    // Base select classes
    const baseSelectClasses = `
        select select-bordered w-full
        ${hasError ? "select-error" : ""}
        ${disabled ? "select-disabled" : ""}
        ${inputClassName}
    `;

    /**
     * Render the input element based on type
     */
    const renderInput = () => {
        const commonProps = {
            id: fieldId,
            name,
            value,
            onChange,
            placeholder,
            required,
            disabled,
            ...rest
        };

        switch (as) {
            case "textarea":
                return (
                    <textarea
                        {...commonProps}
                        rows={rows || 3}
                        className={baseTextareaClasses}
                    />
                );

            case "select":
                return (
                    <select
                        {...commonProps}
                        className={baseSelectClasses}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            default:
                return (
                    <input
                        {...commonProps}
                        type={type}
                        className={baseInputClasses}
                    />
                );
        }
    };

    return (
        <div className={`form-control ${className}`}>
            {/* Label */}
            {label && (
                <label htmlFor={fieldId} className="label">
                    <span className="label-text font-medium">
                        {label}
                        {required && <span className="text-error ml-1">*</span>}
                    </span>
                </label>
            )}

            {/* Input Container */}
            <div className="relative">
                {/* Icon */}
                {icon && (
                    <div
                        className={`
                            absolute top-1/2 transform -translate-y-1/2 z-10
                            ${iconPosition === "left" ? "left-3" : "right-3"}
                            text-base-content/50
                        `}
                    >
                        {icon}
                    </div>
                )}

                {/* Input Element */}
                {renderInput()}
            </div>

            {/* Help Text or Error */}
            {(helpText || error) && (
                <label className="label">
                    <span
                        className={`label-text-alt ${
                            hasError ? "text-error" : "text-base-content/70"
                        }`}
                    >
                        {error || helpText}
                    </span>
                </label>
            )}
        </div>
    );
};

FormField.propTypes = {
    label: PropTypes.string,
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    error: PropTypes.string,
    helpText: PropTypes.string,
    className: PropTypes.string,
    inputClassName: PropTypes.string,
    icon: PropTypes.node,
    iconPosition: PropTypes.oneOf(["left", "right"]),
    rows: PropTypes.number,
    options: PropTypes.arrayOf(
        PropTypes.shape({
            value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            label: PropTypes.string.isRequired
        })
    ),
    as: PropTypes.oneOf(["input", "textarea", "select"])
};

export default FormField;
