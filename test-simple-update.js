// Simple test to verify the regex approach works
import fs from 'fs';

const testContent = `/*
 * @name UserTable
 * @file /docman/frontend/src/components/UserTable.jsx
 * @page UserTable
 * @description Component for displaying users in a table
 * @author {author}
 * @version {version}
 * @license {license}
 */

import React from 'react';`;

console.log('Original content:');
console.log(testContent);

let updatedContent = testContent;

// Apply the same replacements as the script
const author = 'Richard Bakos';
const version = '1.1.9';
const license = 'UNLICENSED';

updatedContent = updatedContent.replace(/(\*\s*@author\s+).*$/m, `$1${author}`);
updatedContent = updatedContent.replace(/(\*\s*@version\s+).*$/m, `$1${version}`);
updatedContent = updatedContent.replace(/(\*\s*@license\s+).*$/m, `$1${license}`);

// Also handle template placeholders
updatedContent = updatedContent.replace(/\{author\}/g, author);
updatedContent = updatedContent.replace(/\{version\}/g, version);
updatedContent = updatedContent.replace(/\{license\}/g, license);

console.log('\nUpdated content:');
console.log(updatedContent);

console.log('\nTest completed - check if all fields are preserved!');
