// Script to selectively update only author, version, and license in comment headers
// Preserves existing descriptions and other fields
// Usage: node update-selective-comments.js

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

console.log(`Selectively updating comment headers with:
    Author: ${author}
    Version: ${version}
    License: ${license}
`);

// Function to update a single file using simple regex replacement
function updateFile(filePath) {
    // Only process .jsx and .js files
    if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return;

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Check if file has a comment header
        if (!content.trim().startsWith('/*')) {
            console.log(`⏭️  Skipping ${path.relative(__dirname, filePath)} (no comment header found)`);
            return;
        }

        // Simple regex replacements that preserve the line structure
        content = content.replace(/(\*\s*@author\s+).*$/m, `$1${author}`);
        content = content.replace(/(\*\s*@version\s+).*$/m, `$1${version}`);
        content = content.replace(/(\*\s*@license\s+).*$/m, `$1${license}`);

        // Also handle template placeholders
        content = content.replace(/\{author\}/g, author);
        content = content.replace(/\{version\}/g, version);
        content = content.replace(/\{license\}/g, license);

        // If content was modified, write it back
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated: ${path.relative(__dirname, filePath)}`);

            // Log what was changed
            const changes = [];
            if (originalContent.includes('{author}') || originalContent.match(/@author\s+(?!Richard Bakos)/)) {
                changes.push(`author → "${author}"`);
            }
            if (originalContent.includes('{version}') || originalContent.match(/@version\s+(?!1\.1\.9)/)) {
                changes.push(`version → "${version}"`);
            }
            if (originalContent.includes('{license}') || originalContent.match(/@license\s+(?!UNLICENSED)/)) {
                changes.push(`license → "${license}"`);
            }

            if (changes.length > 0) {
                console.log(`   Changes: ${changes.join(', ')}`);
            }
        } else {
            console.log(`⏭️  Skipping ${path.relative(__dirname, filePath)} (already up to date)`);
        }

    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
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

// Run the selective update
console.log('Starting selective update process...\n');
processDirectory(FRONTEND_SRC_DIR);
processDirectory(BACKEND_SRC_DIR);
console.log('\nSelective update process completed.');
