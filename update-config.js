// Script to update project-config.json with values from package.json files
// Usage: node update-config.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to files
const ROOT_PACKAGE_JSON = path.join(__dirname, 'package.json');
const CONFIG_JSON = path.join(__dirname, 'project-config.json');

// Read package.json file
const packageData = JSON.parse(fs.readFileSync(ROOT_PACKAGE_JSON, 'utf8'));

// Extract values
const author = packageData.author;
const version = packageData.version;
const license = packageData.license;

// Create config object
const config = {
  author,
  version,
  license
};

// Write to project-config.json
fs.writeFileSync(CONFIG_JSON, JSON.stringify(config, null, 2), 'utf8');

console.log(`Updated project-config.json with:
  Author: ${author}
  Version: ${version}
  License: ${license}`);