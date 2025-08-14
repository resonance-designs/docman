// Script to test selective comment header updates (dry run mode)
// Shows what would be changed without actually modifying files
// Usage: node test-selective-comments.js

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

console.log(`Testing selective comment header updates with:
  Author: ${author}
  Version: ${version}
  License: ${license}
`);
console.log('='.repeat(60));
console.log('DRY RUN MODE - No files will be modified');
console.log('='.repeat(60));

// Function to parse existing comment header and extract fields
function parseCommentHeader(content) {
  const headerMatch = content.match(/^\/\*\s*([\s\S]*?)\s*\*\//);
  if (!headerMatch) return null;
  
  const headerContent = headerMatch[1];
  const fields = {};
  
  // Extract each field using line-by-line parsing for better accuracy
  const lines = headerContent.split('\n');

  for (const line of lines) {
    const fieldMatch = line.match(/^\s*\*\s*@(\w+)\s+(.+)$/);
    if (fieldMatch) {
      const [, fieldName, fieldValue] = fieldMatch;
      fields[fieldName] = fieldValue.trim();
    }
  }
  
  return {
    fullMatch: headerMatch[0],
    fields: fields,
    endIndex: headerMatch.index + headerMatch[0].length
  };
}

// Function to test a single file
function testFile(filePath) {
  // Only process .jsx and .js files
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const headerInfo = parseCommentHeader(content);
    
    if (!headerInfo) {
      console.log(`❌ ${path.relative(__dirname, filePath)} - No comment header found`);
      return;
    }
    
    // Check if any of the target fields need updating
    const changes = [];
    if (headerInfo.fields.author !== author) {
      changes.push(`author: "${headerInfo.fields.author || 'undefined'}" → "${author}"`);
    }
    if (headerInfo.fields.version !== version) {
      changes.push(`version: "${headerInfo.fields.version || 'undefined'}" → "${version}"`);
    }
    if (headerInfo.fields.license !== license) {
      changes.push(`license: "${headerInfo.fields.license || 'undefined'}" → "${license}"`);
    }
    
    if (changes.length === 0) {
      console.log(`✅ ${path.relative(__dirname, filePath)} - Already up to date`);
    } else {
      console.log(`🔄 ${path.relative(__dirname, filePath)} - Would update:`);
      changes.forEach(change => console.log(`   ${change}`));
      
      // Show preserved fields
      const preservedFields = Object.keys(headerInfo.fields).filter(
        field => !['author', 'version', 'license'].includes(field)
      );
      if (preservedFields.length > 0) {
        console.log(`   Preserved: ${preservedFields.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
  }
}

// Function to recursively process directory
function processDirectory(dirPath, dirName) {
  console.log(`\n📁 Processing ${dirName} directory...`);
  const items = fs.readdirSync(dirPath);
  let fileCount = 0;
  
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      processDirectory(itemPath, `${dirName}/${item}`);
    } else if (stat.isFile() && (item.endsWith('.jsx') || item.endsWith('.js'))) {
      testFile(itemPath);
      fileCount++;
    }
  });
  
  console.log(`📊 Processed ${fileCount} files in ${dirName}`);
}

// Run the test
console.log('\nStarting test process...\n');
processDirectory(FRONTEND_SRC_DIR, 'frontend/src');
processDirectory(BACKEND_SRC_DIR, 'backend/src');
console.log('\n' + '='.repeat(60));
console.log('Test completed. Run "npm run comments" to apply changes.');
console.log('='.repeat(60));
