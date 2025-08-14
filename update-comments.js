// Script to update comment headers in all frontend and backend files
// Usage: node update-comments.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG_FILE = path.join(__dirname, 'project-config.json');
const FRONTEND_SRC_DIR = path.join(__dirname, 'frontend', 'src');
const BACKEND_SRC_DIR = path.join(__dirname, 'backend', 'src');

// Read configuration
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const { author, version, license } = config;

console.log(`Updating comment headers with:
  Author: ${author}
  Version: ${version}
  License: ${license}
`);

// Function to update a single file
function updateFile(filePath) {
  // Only process .jsx and .js files
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Update the comment header values
    content = content.replace(/@author\s+.*/, `@author ${author}`);
    content = content.replace(/@version\s+.*/, `@version ${version}`);
    content = content.replace(/@license\s+.*/, `@license ${license}`);
    
    // If content was modified, write it back
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${path.relative(__dirname, filePath)}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
}

// Function to recursively process directory
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      processDirectory(itemPath);
    } else if (stat.isFile() && (item.endsWith('.jsx') || item.endsWith('.js'))) {
      updateFile(itemPath);
    }
  });
}

// Run the update
console.log('Starting update process...\n');
processDirectory(FRONTEND_SRC_DIR);
processDirectory(BACKEND_SRC_DIR);
console.log('\nUpdate process completed.');