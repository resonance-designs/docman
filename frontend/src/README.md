# Frontend Documentation

## Comment Header Standards

All frontend files should include a comment header with the following format:

```javascript
/*
 * @name [Component/Page Name]
 * @file /docman/frontend/src/[path/to/file.jsx]
 * @page [ComponentName]
 * @description [Brief description of the component/page]
 * @author Richard Bakos
 * @version 1.1.8
 * @license UNLICENSED
 */
```

## Dynamic Values

The following values are used in the comment headers and should be kept consistent across all files:

- Author: Richard Bakos
- Version: 1.1.8
- License: UNLICENSED

These values are taken from the `package.json` file in the frontend root directory.

## Updating Values

When any of these values need to be updated:

1. Update the values in `frontend/package.json`
2. Run `npm run update-config` to update `frontend/src/frontend-config.json`
3. Run `npm run update-comments` to update all files

## JSDoc Comments

All functions and components should include JSDoc comments with:
- Description of what the function/component does
- Parameter descriptions with types
- Return value descriptions with types

Example:
```javascript
/**
 * Component for displaying a document card with title, author, description, and review date
 * @param {Object} props - Component properties
 * @param {Object} props.doc - Document object to display
 * @param {Function} props.setDocs - Function to update the documents list
 * @returns {JSX.Element} The document card component
 */