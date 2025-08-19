# Test Updater Script

This script analyzes and updates test files to ensure they remain compatible with the current codebase. It can automatically fix common issues in test files, such as outdated imports, deprecated assertions, and outdated mock implementations.

## Features

- **Import Analysis**: Checks for broken or outdated import paths
- **Assertion Updates**: Updates deprecated assertion methods to their modern equivalents
- **Mock Updates**: Updates mock implementations to match current API requirements
- **Test Verification**: Runs tests before and after changes to verify improvements
- **Backup Creation**: Creates backups of all modified files
- **Detailed Reporting**: Generates a comprehensive report of all changes made

## Usage

```bash
# Basic usage - analyze and update all test files
node scripts/update-tests.js

# Dry run - show what would be changed without making actual changes
node scripts/update-tests.js --dry-run

# Verbose mode - show detailed logs
node scripts/update-tests.js --verbose

# Update a specific test file
node scripts/update-tests.js --test=backend/src/__tests__/users.test.js

# Skip specific update types
node scripts/update-tests.js --skip-imports --skip-assertions --skip-mocks

# Skip running tests (faster)
node scripts/update-tests.js --skip-run

# Only fix failing tests
node scripts/update-tests.js --fix-only
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be changed without making actual changes |
| `--verbose` | Show detailed logs |
| `--test=<path>` | Update a specific test file |
| `--skip-imports` | Skip updating imports |
| `--skip-assertions` | Skip updating assertions |
| `--skip-mocks` | Skip updating mocks |
| `--skip-run` | Skip running tests before and after changes |
| `--fix-only` | Only update tests that are currently failing |

## Output

The script generates a detailed report in `test-update-report.md` that includes:

- Summary statistics
- List of all changes made, organized by file
- Command line options used
- Recommended next steps

## Backup

All modified files are backed up to the `test-backups` directory before changes are made. The backup directory structure mirrors the original file structure.

## Examples

### Example 1: Update all test files with detailed logging

```bash
node scripts/update-tests.js --verbose
```

### Example 2: Check what would be updated without making changes

```bash
node scripts/update-tests.js --dry-run --verbose
```

### Example 3: Update a specific test file

```bash
node scripts/update-tests.js --test=backend/src/__tests__/auth.test.js
```

### Example 4: Update only failing tests

```bash
node scripts/update-tests.js --fix-only
```

## Troubleshooting

If the script fails to update a test file correctly:

1. Check the error message in the console output
2. Look at the backup file to see the original content
3. Try running with `--verbose` for more detailed logs
4. Consider updating the test file manually

## Limitations

- The script cannot fix logical errors in tests
- Some complex test patterns may require manual intervention
- The script assumes a standard Jest/Vitest testing setup

## Contributing

If you find issues or have suggestions for improvements, please open an issue or submit a pull request.