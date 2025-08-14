# DocMan

###### By Resonance Designs

DocMan is a document management application for all sorts of documents. Track updates, schedule reviews, categorize, and upload versions of your docs. DocMan hopes to be the most comprehensive piece of software to manage all of your documentation. You can schedule your documentation for review between stakeholders, the original authors, contributors, relevant tech leads, etc... Categorize, analyze, version repositories, and basically everything you would need to keep your documentation well organized, maintained, analyzed, and backed up.

## Installation

You can deploy DocMan to a web server for use online among many users or you can use desktop client software to either manage your own personal documentation on your computer or you can specify it to connect to a DocMan server. Below you will find instruction on installing and configuring for both scenarios.

### Web Server

### Desktop




## Comment Header Standards

All project files should include a comment header with the following format:

```javascript
/*
 * @name [Component/Page/Controller Name]
 * @file /docman/[path/to/file.js|jsx]
 * @description [Brief description of the component/page/controller]
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

These values are stored in `project-config.json` at the root of the project, which gets its values from the root `package.json` file.

## Updating Values

When any of these values need to be updated:

1. Update the values in the root `package.json` file
2. Run `node update-config.js` to update `project-config.json`
3. Run `node update-comments.js` to update all files

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
```

