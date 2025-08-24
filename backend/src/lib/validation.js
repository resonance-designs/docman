/*
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
// Server-side validation utilities
export const validateEmail = (email) => {
    // More robust email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!email) return { isValid: false, error: "Email is required" };
    if (typeof email !== 'string') return { isValid: false, error: "Email must be a string" };
    if (!emailRegex.test(email)) return { isValid: false, error: "Please enter a valid email address" };
    if (email.length > 254) return { isValid: false, error: "Email address is too long" };
    return { isValid: true, sanitized: email.trim().toLowerCase() };
};

export const validatePassword = (password) => {
    if (!password) return { isValid: false, error: "Password is required" };
    if (typeof password !== 'string') return { isValid: false, error: "Password must be a string" };
    if (password.length < 8) return { isValid: false, error: "Password must be at least 8 characters long" };
    if (password.length > 128) return { isValid: false, error: "Password is too long" };
    if (!/(?=.*[a-z])/.test(password)) return { isValid: false, error: "Password must contain at least one lowercase letter" };
    if (!/(?=.*[A-Z])/.test(password)) return { isValid: false, error: "Password must contain at least one uppercase letter" };
    if (!/(?=.*\d)/.test(password)) return { isValid: false, error: "Password must contain at least one number" };
    if (!/(?=.*[@$!%*?&])/.test(password)) return { isValid: false, error: "Password must contain at least one special character (@$!%*?&)" };
    return { isValid: true, sanitized: password };
};

export const validateName = (name, fieldName = "Name") => {
    if (!name) return { isValid: false, error: `${fieldName} is required` };
    if (typeof name !== 'string') return { isValid: false, error: `${fieldName} must be a string` };
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return { isValid: false, error: `${fieldName} must be at least 2 characters long` };
    if (trimmedName.length > 50) return { isValid: false, error: `${fieldName} must be less than 50 characters` };
    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
    return { isValid: true, sanitized: trimmedName };
};

export const validateUsername = (username) => {
    if (!username) return "Username is required";
    if (typeof username !== 'string') return "Username must be a string";
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) return "Username must be at least 3 characters long";
    if (trimmedUsername.length > 30) return "Username must be less than 30 characters";

    // Check for reserved words or patterns
    const reservedWords = ['admin', 'administrator', 'root', 'system', 'null', 'undefined', 'api', 'auth', 'login', 'register'];
    const lowerUsername = trimmedUsername.toLowerCase();
    if (reservedWords.includes(lowerUsername)) {
        return "Username is reserved and cannot be used";
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedUsername)) {
        return "Username can only contain letters, numbers, periods, underscores, and hyphens";
    }

    // Check for consecutive periods, underscores, or hyphens
    if (/[._-]{2,}/.test(trimmedUsername)) {
        return "Username cannot contain consecutive periods, underscores, or hyphens";
    }

    // Check for leading or trailing periods, underscores, or hyphens
    if (/^[._-]|[._-]$/.test(trimmedUsername)) {
        return "Username cannot start or end with a period, underscore, or hyphen";
    }

    return null;
};

export const validatePhone = (phone) => {
    if (!phone) return { isValid: true, sanitized: "" }; // Phone is optional
    if (typeof phone !== 'string') return { isValid: false, error: "Phone number must be a string" };
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (cleanPhone.length > 0) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(cleanPhone)) {
            return { isValid: false, error: "Please enter a valid phone number" };
        }
    }
    return { isValid: true, sanitized: phone.trim() };
};

export const validateTitle = (title) => {
    if (!title) return { isValid: true, sanitized: "" }; // Title is optional
    if (typeof title !== 'string') return { isValid: false, error: "Title must be a string" };
    if (title.trim().length > 100) return { isValid: false, error: "Title must be less than 100 characters" };
    return { isValid: true, sanitized: title.trim() };
};

export const validateDocumentTitle = (title) => {
    if (!title) return "Document title is required";
    if (typeof title !== 'string') return "Document title must be a string";
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) return "Document title must be at least 3 characters long";
    if (trimmedTitle.length > 200) return "Document title must be less than 200 characters";
    return null;
};

export const validateDocumentContent = (content) => {
    if (!content) return "Document content is required";
    if (typeof content !== 'string') return "Document content must be a string";
    const trimmedContent = content.trim();
    if (trimmedContent.length < 10) return "Document content must be at least 10 characters long";
    if (trimmedContent.length > 50000) return "Document content must be less than 50,000 characters";
    return null;
};

export const validateCategoryName = (name) => {
    if (!name) return "Category name is required";
    if (typeof name !== 'string') return "Category name must be a string";
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return "Category name must be at least 2 characters long";
    if (trimmedName.length > 50) return "Category name must be less than 50 characters";
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) return "Category name can only contain letters, numbers, spaces, hyphens, and underscores";
    return null;
};

export const validateCategoryDescription = (description) => {
    if (!description) return null; // Description is optional
    if (typeof description !== 'string') return "Category description must be a string";
    if (description.trim().length > 500) return "Category description must be less than 500 characters";
    return null;
};

export const validateRole = (role) => {
    const validRoles = ['viewer', 'editor', 'admin', 'superadmin'];
    if (!role) return { isValid: false, error: "Role is required" };
    if (typeof role !== 'string') return { isValid: false, error: "Role must be a string" };
    if (!validRoles.includes(role)) return { isValid: false, error: "Please select a valid role" };
    return { isValid: true, sanitized: role };
};

export const validateTeamName = (name) => {
    console.log("Validating team name:", name);
    if (!name) {
        console.log("Team name is falsy");
        return "Team name is required";
    }
    if (typeof name !== 'string') {
        console.log("Team name is not a string");
        return "Team name must be a string";
    }
    const trimmedName = name.trim();
    console.log("Trimmed team name:", trimmedName);
    if (trimmedName.length < 2) {
        console.log("Team name is too short");
        return "Team name must be at least 2 characters long";
    }
    if (trimmedName.length > 100) {
        console.log("Team name is too long");
        return "Team name must be less than 100 characters";
    }
    // Allow more characters for team names including numbers, underscores, etc.
    if (!/^[a-zA-Z0-9\s\-_.'@#&]+$/.test(trimmedName)) {
        console.log("Team name contains invalid characters");
        return "Team name contains invalid characters";
    }
    console.log("Team name validation passed");
    return null;
};

export const validateObjectId = (id, fieldName = "ID") => {
    if (!id) return `${fieldName} is required`;
    if (typeof id !== 'string') return `${fieldName} must be a string`;
    // MongoDB ObjectId validation (24 character hex string)
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return `${fieldName} is not a valid ID`;
    return null;
};

// Sanitization functions
export const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/\s+/g, ' '); // Remove extra whitespace
};

export const sanitizeEmail = (email) => {
    if (typeof email !== 'string') return email;
    return email.trim().toLowerCase();
};

// Form validation helper for server-side
export const validateFormData = (data, validationRules) => {
    const errors = [];
    let isValid = true;

    Object.keys(validationRules).forEach(field => {
        const rules = validationRules[field];
        const value = data[field];

        for (const rule of rules) {
            const error = rule(value);
            if (error) {
                errors.push({ field, message: error });
                isValid = false;
                break; // Stop at first error for this field
            }
        }
    });

    return { isValid, errors };
};

// Express middleware for validation
export const createValidationMiddleware = (validationRules) => {
    return (req, res, next) => {
        const { isValid, errors } = validateFormData(req.body, validationRules);

        if (!isValid) {
            return res.status(400).json({
                message: "Validation failed",
                errors: errors.reduce((acc, error) => {
                    acc[error.field] = error.message;
                    return acc;
                }, {})
            });
        }

        next();
    };
};
