// Validation utility functions for forms

export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return null;
};

export const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/(?=.*[a-z])/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/(?=.*[A-Z])/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/(?=.*\d)/.test(password)) return "Password must contain at least one number";
    if (!/(?=.*[@$!%*?&])/.test(password)) return "Password must contain at least one special character (@$!%*?&)";
    return null;
};

export const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) return "Please confirm your password";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
};

export const validateName = (name, fieldName = "Name") => {
    if (!name) return `${fieldName} is required`;
    if (name.length < 2) return `${fieldName} must be at least 2 characters long`;
    if (name.length > 50) return `${fieldName} must be less than 50 characters`;
    if (!/^[a-zA-Z\s'-]+$/.test(name)) return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    return null;
};

export const validatePhone = (phone) => {
    if (!phone) return null; // Phone is optional
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
        return "Please enter a valid phone number";
    }
    return null;
};

export const validateTitle = (title) => {
    if (!title) return null; // Title is optional
    if (title.length > 100) return "Title must be less than 100 characters";
    return null;
};

export const validateDocumentTitle = (title) => {
    if (!title) return "Document title is required";
    if (title.length < 3) return "Document title must be at least 3 characters long";
    if (title.length > 200) return "Document title must be less than 200 characters";
    return null;
};

export const validateDocumentContent = (content) => {
    if (!content) return "Document content is required";
    if (content.length < 10) return "Document content must be at least 10 characters long";
    if (content.length > 50000) return "Document content must be less than 50,000 characters";
    return null;
};

export const validateCategoryName = (name) => {
    if (!name) return "Category name is required";
    if (name.length < 2) return "Category name must be at least 2 characters long";
    if (name.length > 50) return "Category name must be less than 50 characters";
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) return "Category name can only contain letters, numbers, spaces, hyphens, and underscores";
    return null;
};

export const validateCategoryDescription = (description) => {
    if (!description) return null; // Description is optional
    if (description.length > 500) return "Category description must be less than 500 characters";
    return null;
};

export const validateFileSize = (file, maxSizeMB = 2) => {
    if (!file) return "Please select a file";
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) return `File size must be less than ${maxSizeMB}MB`;
    return null;
};

export const validateFileType = (file, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']) => {
    if (!file) return "Please select a file";
    if (!allowedTypes.includes(file.type)) {
        const typeNames = allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ');
        return `File must be one of the following types: ${typeNames}`;
    }
    return null;
};

// Validate image dimensions
export const validateImageDimensions = (file, options = {}) => {
    return new Promise((resolve) => {
        if (!file || !file.type.startsWith('image/')) {
            resolve("File must be an image");
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const { width, height } = img;
            const {
                minWidth = 0,
                minHeight = 0,
                maxWidth = Infinity,
                maxHeight = Infinity,
                recommendedWidth,
                recommendedHeight,
                aspectRatio // e.g., 4/1 for 4:1 ratio
            } = options;

            // Check minimum dimensions
            if (width < minWidth || height < minHeight) {
                resolve(`Image must be at least ${minWidth}x${minHeight}px. Current: ${width}x${height}px`);
                return;
            }

            // Check maximum dimensions
            if (width > maxWidth || height > maxHeight) {
                resolve(`Image must be no larger than ${maxWidth}x${maxHeight}px. Current: ${width}x${height}px`);
                return;
            }

            // Check aspect ratio if specified
            if (aspectRatio) {
                const currentRatio = width / height;
                const tolerance = 0.1; // 10% tolerance
                if (Math.abs(currentRatio - aspectRatio) > tolerance) {
                    const ratioText = aspectRatio === 1 ? "1:1 (square)" : `${Math.round(aspectRatio)}:1`;
                    resolve(`Image should have a ${ratioText} aspect ratio. Current ratio: ${currentRatio.toFixed(2)}:1`);
                    return;
                }
            }

            // Provide recommendation if dimensions are valid but not optimal
            if (recommendedWidth && recommendedHeight) {
                if (width !== recommendedWidth || height !== recommendedHeight) {
                    // This is just a warning, not an error
                    resolve(null); // Still valid
                    return;
                }
            }

            resolve(null); // Valid
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve("Invalid image file");
        };

        img.src = url;
    });
};

export const validateRequired = (value, fieldName) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} is required`;
    }
    return null;
};

export const validateRole = (role) => {
    const validRoles = ['viewer', 'editor', 'admin'];
    if (!role) return "Role is required";
    if (!validRoles.includes(role)) return "Please select a valid role";
    return null;
};

// Form validation helper
export const validateForm = (formData, validationRules) => {
    const errors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(field => {
        const rules = validationRules[field];
        const value = formData[field];
        
        for (const rule of rules) {
            const error = rule(value, formData);
            if (error) {
                errors[field] = error;
                isValid = false;
                break; // Stop at first error for this field
            }
        }
    });

    return { isValid, errors };
};

// Real-time validation helper
export const validateField = (fieldName, value, validationRules, formData = {}) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    for (const rule of rules) {
        const error = rule(value, formData);
        if (error) return error;
    }
    return null;
};
