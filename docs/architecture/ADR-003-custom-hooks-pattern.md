# ADR-003: Custom Hooks Pattern for React Components

**Date:** 2024-01-15  
**Status:** Accepted  
**Deciders:** Frontend Team  
**Technical Story:** Frontend Refactoring Phase

## Context

The React frontend had significant code duplication and complexity issues:
- Components with 400-800+ lines mixing UI and business logic
- Duplicate state management patterns across similar components
- Complex form handling logic repeated in multiple places
- Difficult testing due to tightly coupled concerns
- Inconsistent data fetching and error handling patterns

## Decision

We will implement a **Custom Hooks Pattern** to extract and reuse complex state logic:

### Custom Hooks Architecture
```
frontend/src/hooks/
├── index.js                    # Centralized exports
├── useAutoLogout.js           # Session management
├── useUserRole.js             # Authentication & permissions
├── useStakeholderManagement.js # Multi-select stakeholder logic
├── useExternalContacts.js     # Contact management
├── useReviewManagement.js     # Review workflow state
├── useFormData.js             # Common form data loading
├── useFileUpload.js           # Upload state & progress
├── useDocument.js             # Document loading & management
└── useApi.js                  # API operations with loading states
```

### Hook Design Principles
1. **Single Responsibility**: Each hook manages one specific concern
2. **Reusability**: Hooks can be used across multiple components
3. **Testability**: Hooks can be tested in isolation
4. **Consistency**: Standardized patterns for similar operations
5. **Performance**: Built-in optimization and memoization

## Implementation Examples

### 1. Data Fetching Hook
```javascript
export function useFormData({
  loadUsers = true,
  loadCategories = true,
  loadExternalContactTypes = true,
  showErrorToast = true
} = {}) {
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parallel data loading with error handling
  useEffect(() => {
    const loadData = async () => {
      try {
        const requests = [];
        if (loadUsers) requests.push(api.get("/users"));
        if (loadCategories) requests.push(api.get("/categories"));
        
        const responses = await Promise.all(requests);
        // Process responses...
      } catch (err) {
        setError(err);
        if (showErrorToast) toast.error("Failed to load form data");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [loadUsers, loadCategories, showErrorToast]);

  return { users, categories, loading, error, getFullName };
}
```

### 2. Complex State Management Hook
```javascript
export function useStakeholderManagement(setValue) {
  const [selectedStakeholders, setSelectedStakeholders] = useState([]);
  const [selectedOwners, setSelectedOwners] = useState([]);

  const addStakeholder = useCallback((stakeholder) => {
    setSelectedStakeholders(prev => {
      const updated = [...prev, stakeholder];
      setValue("stakeholders", updated);
      return updated;
    });
  }, [setValue]);

  const removeStakeholder = useCallback((stakeholderId) => {
    setSelectedStakeholders(prev => {
      const updated = prev.filter(s => s._id !== stakeholderId);
      setValue("stakeholders", updated);
      return updated;
    });
  }, [setValue]);

  return {
    selectedStakeholders,
    selectedOwners,
    addStakeholder,
    removeStakeholder,
    resetStakeholdersAndOwners
  };
}
```

### 3. File Upload Hook
```javascript
export function useFileUpload({ onSuccess, onError, resetOnSuccess = true } = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const startUpload = useCallback(async (uploadFunction, uploadData) => {
    try {
      setUploading(true);
      setUploadError(null);
      
      const result = await uploadFunction(uploadData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadProgress(percentCompleted);
        }
      });

      if (onSuccess) onSuccess(result);
      return result;
    } catch (error) {
      setUploadError(error);
      if (onError) onError(error);
      throw error;
    } finally {
      setUploading(false);
    }
  }, [onSuccess, onError]);

  return { uploading, uploadProgress, uploadError, startUpload };
}
```

## Component Refactoring Results

### Before Custom Hooks
```javascript
// CreateDocPage: 721 lines
const CreateDocPage = () => {
  // 15+ useState declarations
  // 5+ useEffect hooks
  // Complex form handling logic
  // Duplicate data loading
  // Mixed concerns throughout
};
```

### After Custom Hooks
```javascript
// CreateDocPage: 231 lines (-68% reduction)
const CreateDocPage = () => {
  const { users, categories, loading } = useFormData();
  const stakeholderManagement = useStakeholderManagement(setValue);
  const fileUpload = useFileUpload({ onSuccess: handleSuccess });
  
  // Clean, focused component logic
};
```

## Consequences

### Positive
- **68% Code Reduction** in complex components
- **Improved Reusability** across multiple components
- **Better Testability** with isolated hook testing
- **Consistent Patterns** for similar operations
- **Enhanced Performance** through built-in optimizations
- **Easier Maintenance** with centralized logic

### Negative
- **Learning Curve** for custom hooks patterns
- **Initial Complexity** in hook design
- **Potential Over-Abstraction** if not carefully designed
- **Debugging Complexity** across hook boundaries

## Testing Strategy

### Hook Testing with React Testing Library
```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { useFormData } from '../useFormData';

describe('useFormData', () => {
  test('should load all data by default', async () => {
    const { result } = renderHook(() => useFormData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.categories).toEqual(mockCategories);
  });
});
```

## Performance Metrics

### Component Complexity Reduction
| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| CreateDocPage | 721 lines | 231 lines | **68%** |
| EditDocPage | 809 lines | 425 lines | **47%** |
| ViewDocPage | 397 lines | 342 lines | **14%** |
| HomePage | 248 lines | 232 lines | **6.5%** |

### Development Efficiency
- **New Form Creation**: 2-3 days → 2-3 hours
- **Bug Fixes**: Multiple files → Single hook
- **Testing**: Component + Logic → Isolated testing
- **Code Review**: Complex components → Focused hooks

## Hook Categories

### 1. Data Management Hooks
- `useFormData` - Common form data loading
- `useDocument` - Document CRUD operations
- `useApi` - Generic API operations

### 2. State Management Hooks
- `useStakeholderManagement` - Multi-select logic
- `useExternalContacts` - Contact management
- `useReviewManagement` - Review workflows

### 3. UI Interaction Hooks
- `useFileUpload` - File upload with progress
- `useUserRole` - Authentication state

### 4. Utility Hooks
- `useAutoLogout` - Session management

## Related ADRs
- ADR-001: Service Layer Pattern
- ADR-004: Shared Component Library
- ADR-006: Testing Strategy

## References
- [React Hooks Documentation](https://reactjs.org/docs/hooks-intro.html)
- [Custom Hooks Best Practices](https://kentcdodds.com/blog/react-hooks-whats-going-to-happen-to-my-tests)
- [Testing Custom Hooks](https://react-hooks-testing-library.com/)
