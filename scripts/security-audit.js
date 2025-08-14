/*
 * @name security-audit
 * @file /docman/scripts/security-audit.js
 * @script security-audit
 * @description Automated security audit script for dependency scanning and vulnerability detection
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Colors for console output
 */
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

/**
 * Log with color
 * @param {string} message - Message to log
 * @param {string} color - Color to use
 */
function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Run command and return output
 * @param {string} command - Command to run
 * @param {Object} options - Execution options
 * @returns {string} Command output
 */
function runCommand(command, options = {}) {
    try {
        return execSync(command, { 
            encoding: 'utf8', 
            stdio: 'pipe',
            ...options 
        });
    } catch (error) {
        return error.stdout || error.message;
    }
}

/**
 * Check if npm audit is available
 * @returns {boolean} True if npm audit is available
 */
function isNpmAuditAvailable() {
    try {
        execSync('npm audit --version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Run npm audit for dependency vulnerabilities
 * @param {string} directory - Directory to audit
 * @returns {Object} Audit results
 */
function runNpmAudit(directory) {
    log(`\n🔍 Running npm audit in ${directory}...`, 'blue');
    
    try {
        const auditOutput = runCommand('npm audit --json', { cwd: directory });
        const auditData = JSON.parse(auditOutput);
        
        return {
            success: true,
            vulnerabilities: auditData.vulnerabilities || {},
            metadata: auditData.metadata || {},
            advisories: auditData.advisories || {}
        };
    } catch (error) {
        log(`❌ npm audit failed: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * Check for outdated packages
 * @param {string} directory - Directory to check
 * @returns {Object} Outdated packages info
 */
function checkOutdatedPackages(directory) {
    log(`\n📦 Checking for outdated packages in ${directory}...`, 'blue');
    
    try {
        const outdatedOutput = runCommand('npm outdated --json', { cwd: directory });
        const outdatedData = outdatedOutput ? JSON.parse(outdatedOutput) : {};
        
        return {
            success: true,
            packages: outdatedData
        };
    } catch (error) {
        return { success: true, packages: {} }; // npm outdated returns non-zero exit code when packages are outdated
    }
}

/**
 * Analyze package.json for security best practices
 * @param {string} packageJsonPath - Path to package.json
 * @returns {Object} Analysis results
 */
function analyzePackageJson(packageJsonPath) {
    log(`\n📋 Analyzing ${packageJsonPath}...`, 'blue');
    
    try {
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const issues = [];
        const recommendations = [];

        // Check for scripts that might be security risks
        if (packageData.scripts) {
            for (const [scriptName, scriptCommand] of Object.entries(packageData.scripts)) {
                if (scriptCommand.includes('curl') || scriptCommand.includes('wget')) {
                    issues.push(`Script "${scriptName}" uses curl/wget which could be a security risk`);
                }
                if (scriptCommand.includes('sudo')) {
                    issues.push(`Script "${scriptName}" uses sudo which is a security risk`);
                }
            }
        }

        // Check for missing security-related fields
        if (!packageData.engines) {
            recommendations.push('Consider adding "engines" field to specify Node.js version requirements');
        }

        if (!packageData.repository) {
            recommendations.push('Consider adding "repository" field for transparency');
        }

        // Check for development dependencies in production
        if (packageData.dependencies) {
            const devLikePackages = Object.keys(packageData.dependencies).filter(pkg => 
                pkg.includes('test') || pkg.includes('dev') || pkg.includes('debug')
            );
            if (devLikePackages.length > 0) {
                recommendations.push(`Consider moving these to devDependencies: ${devLikePackages.join(', ')}`);
            }
        }

        return {
            success: true,
            issues,
            recommendations,
            packageData
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate security report
 * @param {Object} results - Audit results
 * @returns {string} Report content
 */
function generateReport(results) {
    let report = `# Security Audit Report\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Frontend audit results
    if (results.frontend) {
        report += `## Frontend Dependencies\n`;
        if (results.frontend.audit.success) {
            const vulnCount = Object.keys(results.frontend.audit.vulnerabilities).length;
            report += `- Vulnerabilities found: ${vulnCount}\n`;
            if (vulnCount > 0) {
                report += `- Critical: ${results.frontend.audit.metadata.vulnerabilities?.critical || 0}\n`;
                report += `- High: ${results.frontend.audit.metadata.vulnerabilities?.high || 0}\n`;
                report += `- Moderate: ${results.frontend.audit.metadata.vulnerabilities?.moderate || 0}\n`;
                report += `- Low: ${results.frontend.audit.metadata.vulnerabilities?.low || 0}\n`;
            }
        }
        
        const outdatedCount = Object.keys(results.frontend.outdated.packages).length;
        report += `- Outdated packages: ${outdatedCount}\n\n`;
    }

    // Backend audit results
    if (results.backend) {
        report += `## Backend Dependencies\n`;
        if (results.backend.audit.success) {
            const vulnCount = Object.keys(results.backend.audit.vulnerabilities).length;
            report += `- Vulnerabilities found: ${vulnCount}\n`;
            if (vulnCount > 0) {
                report += `- Critical: ${results.backend.audit.metadata.vulnerabilities?.critical || 0}\n`;
                report += `- High: ${results.backend.audit.metadata.vulnerabilities?.high || 0}\n`;
                report += `- Moderate: ${results.backend.audit.metadata.vulnerabilities?.moderate || 0}\n`;
                report += `- Low: ${results.backend.audit.metadata.vulnerabilities?.low || 0}\n`;
            }
        }
        
        const outdatedCount = Object.keys(results.backend.outdated.packages).length;
        report += `- Outdated packages: ${outdatedCount}\n\n`;
    }

    // Package.json analysis
    if (results.packageAnalysis) {
        report += `## Package.json Analysis\n`;
        for (const [location, analysis] of Object.entries(results.packageAnalysis)) {
            if (analysis.success) {
                report += `### ${location}\n`;
                if (analysis.issues.length > 0) {
                    report += `**Issues:**\n`;
                    analysis.issues.forEach(issue => report += `- ${issue}\n`);
                }
                if (analysis.recommendations.length > 0) {
                    report += `**Recommendations:**\n`;
                    analysis.recommendations.forEach(rec => report += `- ${rec}\n`);
                }
                report += `\n`;
            }
        }
    }

    return report;
}

/**
 * Main security audit function
 */
async function runSecurityAudit() {
    log('🔒 Starting Security Audit...', 'cyan');
    
    const results = {};

    // Check if npm audit is available
    if (!isNpmAuditAvailable()) {
        log('❌ npm audit is not available. Please update npm to version 6 or higher.', 'red');
        process.exit(1);
    }

    // Audit frontend dependencies
    if (fs.existsSync('frontend/package.json')) {
        log('\n🎨 Auditing Frontend Dependencies...', 'magenta');
        results.frontend = {
            audit: runNpmAudit('frontend'),
            outdated: checkOutdatedPackages('frontend')
        };
    }

    // Audit backend dependencies
    if (fs.existsSync('backend/package.json')) {
        log('\n⚙️ Auditing Backend Dependencies...', 'magenta');
        results.backend = {
            audit: runNpmAudit('backend'),
            outdated: checkOutdatedPackages('backend')
        };
    }

    // Analyze package.json files
    results.packageAnalysis = {};
    const packageJsonFiles = [
        { path: 'frontend/package.json', name: 'Frontend' },
        { path: 'backend/package.json', name: 'Backend' },
        { path: 'package.json', name: 'Root' }
    ];

    for (const { path: pkgPath, name } of packageJsonFiles) {
        if (fs.existsSync(pkgPath)) {
            results.packageAnalysis[name] = analyzePackageJson(pkgPath);
        }
    }

    // Generate and save report
    const report = generateReport(results);
    const reportPath = 'security-audit-report.md';
    fs.writeFileSync(reportPath, report);

    log(`\n📊 Security audit complete! Report saved to ${reportPath}`, 'green');
    
    // Summary
    let totalVulnerabilities = 0;
    let totalOutdated = 0;

    if (results.frontend?.audit.success) {
        totalVulnerabilities += Object.keys(results.frontend.audit.vulnerabilities).length;
    }
    if (results.backend?.audit.success) {
        totalVulnerabilities += Object.keys(results.backend.audit.vulnerabilities).length;
    }
    if (results.frontend?.outdated.success) {
        totalOutdated += Object.keys(results.frontend.outdated.packages).length;
    }
    if (results.backend?.outdated.success) {
        totalOutdated += Object.keys(results.backend.outdated.packages).length;
    }

    log(`\n📈 Summary:`, 'cyan');
    log(`   Vulnerabilities: ${totalVulnerabilities}`, totalVulnerabilities > 0 ? 'red' : 'green');
    log(`   Outdated packages: ${totalOutdated}`, totalOutdated > 0 ? 'yellow' : 'green');

    if (totalVulnerabilities > 0) {
        log('\n⚠️ Vulnerabilities found! Run "npm audit fix" to attempt automatic fixes.', 'yellow');
        process.exit(1);
    }
}

// Run the audit if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runSecurityAudit().catch(error => {
        log(`❌ Security audit failed: ${error.message}`, 'red');
        process.exit(1);
    });
}
