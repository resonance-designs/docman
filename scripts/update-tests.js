#!/usr/bin/env node
/*
 * @name Test Update Script
 * @file /docman/scripts/update-tests.js
 * @description Script to analyze and update test files to ensure compatibility with current codebase
 * @author DocMan Team
 * @version 1.0.0
 * @license UNLICENSED
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Configuration
const config = {
  backendTestDir: path.join(rootDir, 'backend', 'src', '__tests__'),
  frontendTestDir: path.join(rootDir, 'frontend', 'src', '__tests__'),
  backupDir: path.join(rootDir, 'test-backups'),
  reportFile: path.join(rootDir, 'test-update-report.md'),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  specificTest: process.argv.find(arg => arg.startsWith('--test='))?.split('=')[1],
  updateImports: !process.argv.includes('--skip-imports'),
  updateAssertions: !process.argv.includes('--skip-assertions'),
  updateMocks: !process.argv.includes('--skip-mocks'),
  runTests: !process.argv.includes('--skip-run'),
  fixOnly: process.argv.includes('--fix-only'),
};

// Statistics for reporting
const stats = {
  scanned: 0,
  updated: 0,
  failed: 0,
  skipped: 0,
  passedBefore: 0,
  passedAfter: 0,
  changes: [],
};

// Utility functions
const logger = {
  info: (message) => console.log(`\x1b[36mINFO:\x1b[0m ${message}`),
  success: (message) => console.log(`\x1b[32mSUCCESS:\x1b[0m ${message}`),
  warning: (message) => console.log(`\x1b[33mWARNING:\x1b[0m ${message}`),
  error: (message) => console.log(`\x1b[31mERROR:\x1b[0m ${message}`),
  verbose: (message) => config.verbose && console.log(`\x1b[90mDEBUG:\x1b[0m ${message}`),
};

/**
 * Ensures a directory exists, creating it if necessary
 */
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.verbose(`Created directory: ${dir}`);
  }
}

/**
 * Creates a backup of a file before modifying it
 */
function backupFile(filePath) {
  const relativePath = path.relative(rootDir, filePath);
  const backupPath = path.join(config.backupDir, relativePath);
  
  ensureDirectoryExists(path.dirname(backupPath));
  fs.copyFileSync(filePath, backupPath);
  logger.verbose(`Backed up ${relativePath}`);
  
  return backupPath;
}

/**
 * Finds all test files in a directory
 */
function findTestFiles(dir) {
  if (!fs.existsSync(dir)) {
    logger.warning(`Directory does not exist: ${dir}`);
    return [];
  }

  const testFiles = [];
  
  function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && /\.(test|spec)\.jsx?$/.test(entry.name)) {
        testFiles.push(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return testFiles;
}

/**
 * Runs tests to check if they pass before and after updates
 */
async function runTestFile(filePath) {
  try {
    const isBackend = filePath.includes('/backend/');
    const command = isBackend 
      ? `cd ${path.join(rootDir, 'backend')} && NODE_ENV=test npx jest ${path.relative(path.join(rootDir, 'backend'), filePath)} --silent`
      : `cd ${path.join(rootDir, 'frontend')} && npx vitest run ${path.relative(path.join(rootDir, 'frontend'), filePath)} --silent`;
    
    logger.verbose(`Running test command: ${command}`);
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch (error) {
    logger.verbose(`Test failed: ${error.message}`);
    return false;
  }
}

/**
 * Analyzes imports in a test file and updates them if needed
 */
function updateImports(content, filePath) {
  const changes = [];
  let updatedContent = content;
  
  // Check for outdated import paths
  const importRegex = /import\s+(?:(?:\{[^}]*\})|(?:[^{}\s,]+))?\s*(?:,\s*(?:\{[^}]*\}))?\s*from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip node_modules imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      continue;
    }
    
    // Check if the imported file exists
    const currentDir = path.dirname(filePath);
    let resolvedPath;
    
    try {
      // Try to resolve the import path
      if (importPath.endsWith('.js') || importPath.endsWith('.jsx')) {
        resolvedPath = path.resolve(currentDir, importPath);
      } else {
        // Try different extensions
        const extensions = ['.js', '.jsx', '.ts', '.tsx'];
        for (const ext of extensions) {
          const testPath = path.resolve(currentDir, `${importPath}${ext}`);
          if (fs.existsSync(testPath)) {
            resolvedPath = testPath;
            break;
          }
        }
      }
      
      // If we couldn't resolve the path, it might be a directory import
      if (!resolvedPath || !fs.existsSync(resolvedPath)) {
        const dirPath = path.resolve(currentDir, importPath);
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
          // Check for index files
          const indexFiles = ['index.js', 'index.jsx', 'index.ts', 'index.tsx'];
          for (const indexFile of indexFiles) {
            const testPath = path.join(dirPath, indexFile);
            if (fs.existsSync(testPath)) {
              resolvedPath = testPath;
              break;
            }
          }
        }
      }
      
      // If we still couldn't resolve the path, mark it as potentially problematic
      if (!resolvedPath || !fs.existsSync(resolvedPath)) {
        const originalImport = match[0];
        changes.push({
          type: 'warning',
          message: `Potentially broken import: ${importPath}`,
          original: originalImport,
        });
      }
    } catch (error) {
      logger.verbose(`Error checking import ${importPath}: ${error.message}`);
    }
  }
  
  return { updatedContent, changes };
}

/**
 * Updates test assertions to match current code behavior
 */
function updateAssertions(content, filePath) {
  const changes = [];
  let updatedContent = content;
  
  // Check for deprecated assertion methods
  const deprecatedAssertions = {
    'toBePresent': 'toBeInTheDocument',
    'toExist': 'toBeTruthy',
    'toContainEqual': 'toEqual(expect.arrayContaining([',
    'toInclude': 'toContain',
    'toIncludeEqual': 'toContainEqual',
  };
  
  for (const [deprecated, replacement] of Object.entries(deprecatedAssertions)) {
    const regex = new RegExp(`expect\\([^)]+\\)\\.${deprecated}\\(`, 'g');
    if (regex.test(content)) {
      updatedContent = updatedContent.replace(regex, (match) => {
        const newAssertion = match.replace(`.${deprecated}(`, `.${replacement}(`);
        changes.push({
          type: 'assertion',
          message: `Updated deprecated assertion: ${deprecated} → ${replacement}`,
          original: match,
          updated: newAssertion,
        });
        return newAssertion;
      });
    }
  }
  
  // Check for async test functions without await
  const asyncTestRegex = /test\(['"](.*?)['"]\s*,\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g;
  let asyncMatch;
  
  while ((asyncMatch = asyncTestRegex.exec(content)) !== null) {
    const testName = asyncMatch[1];
    const testBody = asyncMatch[2];
    
    // Check if there's an async function without await
    if (!testBody.includes('await') && (testBody.includes('request(') || testBody.includes('.then('))) {
      changes.push({
        type: 'warning',
        message: `Async test without await: "${testName}"`,
        original: asyncMatch[0],
      });
    }
  }
  
  return { updatedContent, changes };
}

/**
 * Updates mock functions to match current API
 */
function updateMocks(content, filePath) {
  const changes = [];
  let updatedContent = content;
  
  // Check for outdated mock implementations
  const jestMockRegex = /jest\.mock\(['"](.*?)['"]([\s\S]*?)\)/g;
  let mockMatch;
  
  while ((mockMatch = jestMockRegex.exec(content)) !== null) {
    const mockedModule = mockMatch[1];
    const mockImplementation = mockMatch[2];
    
    // Check if we're using an outdated mock implementation
    if (mockedModule.includes('axios') && !mockImplementation.includes('interceptors')) {
      // Add interceptors to axios mock
      const updatedMock = mockMatch[0].replace(
        /\}\s*\)$/,
        `,
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
})`
      );
      
      updatedContent = updatedContent.replace(mockMatch[0], updatedMock);
      changes.push({
        type: 'mock',
        message: `Updated axios mock to include interceptors`,
        original: mockMatch[0],
        updated: updatedMock,
      });
    }
  }
  
  // Convert vi.mock to jest.mock for backend tests if needed
  if (filePath.includes('/backend/') && content.includes('vi.mock(')) {
    updatedContent = updatedContent.replace(/vi\.mock\(/g, 'jest.mock(');
    changes.push({
      type: 'mock',
      message: 'Converted vi.mock() to jest.mock() for backend tests',
      original: 'vi.mock(',
      updated: 'jest.mock(',
    });
  }
  
  return { updatedContent, changes };
}

/**
 * Processes a single test file
 */
async function processTestFile(filePath) {
  logger.info(`Processing: ${path.relative(rootDir, filePath)}`);
  stats.scanned++;
  
  try {
    // Check if test passes before any changes
    if (config.runTests && !config.fixOnly) {
      logger.verbose('Running test before changes...');
      const passedBefore = await runTestFile(filePath);
      if (passedBefore) {
        stats.passedBefore++;
        logger.verbose('Test passed before changes');
      } else {
        logger.verbose('Test failed before changes');
      }
    }
    
    // Read the file content
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let updatedContent = originalContent;
    const fileChanges = [];
    
    // Update imports
    if (config.updateImports) {
      const importResult = updateImports(updatedContent, filePath);
      updatedContent = importResult.updatedContent;
      fileChanges.push(...importResult.changes);
    }
    
    // Update assertions
    if (config.updateAssertions) {
      const assertionResult = updateAssertions(updatedContent, filePath);
      updatedContent = assertionResult.updatedContent;
      fileChanges.push(...assertionResult.changes);
    }
    
    // Update mocks
    if (config.updateMocks) {
      const mockResult = updateMocks(updatedContent, filePath);
      updatedContent = mockResult.updatedContent;
      fileChanges.push(...mockResult.changes);
    }
    
    // If there are changes and this is not a dry run, write the updated content
    if (fileChanges.length > 0 && !config.dryRun) {
      // Backup the original file
      backupFile(filePath);
      
      // Write the updated content
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      logger.success(`Updated ${path.relative(rootDir, filePath)} (${fileChanges.length} changes)`);
      
      // Add to statistics
      stats.updated++;
      stats.changes.push({
        file: path.relative(rootDir, filePath),
        changes: fileChanges,
      });
    } else if (fileChanges.length > 0) {
      logger.warning(`Would update ${path.relative(rootDir, filePath)} (${fileChanges.length} changes) - dry run`);
      stats.changes.push({
        file: path.relative(rootDir, filePath),
        changes: fileChanges,
      });
    } else {
      logger.verbose(`No changes needed for ${path.relative(rootDir, filePath)}`);
      stats.skipped++;
    }
    
    // Check if test passes after changes
    if (config.runTests && fileChanges.length > 0 && !config.dryRun) {
      logger.verbose('Running test after changes...');
      const passedAfter = await runTestFile(filePath);
      if (passedAfter) {
        stats.passedAfter++;
        logger.success('Test passed after changes');
      } else {
        logger.warning('Test still failing after changes');
      }
    }
    
    return fileChanges.length > 0;
  } catch (error) {
    logger.error(`Failed to process ${path.relative(rootDir, filePath)}: ${error.message}`);
    stats.failed++;
    return false;
  }
}

/**
 * Generates a report of all changes made
 */
function generateReport() {
  const reportContent = `# Test Update Report

## Summary
- **Date:** ${new Date().toISOString().split('T')[0]}
- **Total files scanned:** ${stats.scanned}
- **Files updated:** ${stats.updated}
- **Files skipped (no changes needed):** ${stats.skipped}
- **Files failed to process:** ${stats.failed}
- **Tests passing before updates:** ${stats.passedBefore}
- **Tests passing after updates:** ${stats.passedAfter}

## Changes by File

${stats.changes.map(fileChange => `
### ${fileChange.file}

${fileChange.changes.map(change => `- **${change.type}**: ${change.message}`).join('\n')}
`).join('\n')}

## Command Line Options Used
\`\`\`
Dry run: ${config.dryRun}
Verbose: ${config.verbose}
Update imports: ${config.updateImports}
Update assertions: ${config.updateAssertions}
Update mocks: ${config.updateMocks}
Run tests: ${config.runTests}
Fix only: ${config.fixOnly}
Specific test: ${config.specificTest || 'None'}
\`\`\`

## Next Steps
1. Review the changes made to ensure they are correct
2. Run the full test suite to verify all tests are passing
3. If any tests are still failing, manual intervention may be required
`;

  if (!config.dryRun) {
    fs.writeFileSync(config.reportFile, reportContent, 'utf8');
    logger.success(`Report generated at ${config.reportFile}`);
  } else {
    logger.info('Report would be generated (dry run)');
    if (config.verbose) {
      console.log('\n--- REPORT PREVIEW ---\n');
      console.log(reportContent);
      console.log('\n--- END PREVIEW ---\n');
    }
  }
}

/**
 * Main function
 */
async function main() {
  logger.info('Starting test update script');
  logger.info(`Root directory: ${rootDir}`);
  
  // Create backup directory if not in dry run mode
  if (!config.dryRun) {
    ensureDirectoryExists(config.backupDir);
  }
  
  // Find all test files
  let testFiles = [];
  
  if (config.specificTest) {
    // Process a specific test file
    const specificPath = path.resolve(rootDir, config.specificTest);
    if (fs.existsSync(specificPath)) {
      testFiles = [specificPath];
    } else {
      logger.error(`Specific test file not found: ${config.specificTest}`);
      process.exit(1);
    }
  } else {
    // Process all test files
    const backendTests = findTestFiles(config.backendTestDir);
    const frontendTests = findTestFiles(config.frontendTestDir);
    testFiles = [...backendTests, ...frontendTests];
  }
  
  logger.info(`Found ${testFiles.length} test files`);
  
  // Process each test file
  for (const testFile of testFiles) {
    await processTestFile(testFile);
  }
  
  // Generate report
  generateReport();
  
  // Summary
  logger.info('\nSummary:');
  logger.info(`- Scanned: ${stats.scanned} files`);
  logger.info(`- Updated: ${stats.updated} files`);
  logger.info(`- Skipped: ${stats.skipped} files`);
  logger.info(`- Failed: ${stats.failed} files`);
  
  if (config.runTests) {
    logger.info(`- Tests passing before: ${stats.passedBefore}`);
    logger.info(`- Tests passing after: ${stats.passedAfter}`);
  }
  
  logger.success('Test update script completed');
}

// Run the script
main().catch(error => {
  logger.error(`Script failed: ${error.message}`);
  process.exit(1);
});