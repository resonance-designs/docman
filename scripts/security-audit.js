/** Audit every maintained npm lockfile; findings and unavailable audits both fail closed. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const projects = ['.', 'backend', 'frontend-vue', 'frontend', 'docs-site'];
const root = fileURLToPath(new URL('../', import.meta.url));

export function classifyAudit(result) {
  if (result.error || result.signal || ![0, 1].includes(result.status)) {
    throw new Error(result.error?.message || result.stderr || `npm audit exited ${result.status}`);
  }
  const report = JSON.parse(result.stdout);
  if (report.error || !Number.isSafeInteger(report.metadata?.vulnerabilities?.total) || report.metadata.vulnerabilities.total < 0) {
    throw new Error(report.error?.summary || 'npm returned no vulnerability summary');
  }
  return report;
}

export function runAudits(args = process.argv.slice(2)) {
  const production = args.includes('--omit=dev');
  const unknown = args.filter(arg => arg !== '--omit=dev');
  if (unknown.length) throw new Error(`Unsupported arguments: ${unknown.join(', ')}`);
  // npm supplies the CLI path on both Windows and Linux; no shell interpolation required.
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Run through npm run security:audit (or security:audit:prod).');
  let failed = false;
  for (const project of projects) {
    try {
      const result = spawnSync(process.execPath, [npmCli, 'audit', '--json', ...(production ? ['--omit=dev'] : [])], {
        cwd: path.join(root, project), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 120000,
      });
      const report = classifyAudit(result);
      console.log(`${project}: ${JSON.stringify(report.metadata.vulnerabilities)}`);
      if (report.metadata.vulnerabilities.total > 0) {
        failed = true;
        // Show root advisories, not just counts inherited by their dependents.
        for (const [name, finding] of Object.entries(report.vulnerabilities || {})) {
          for (const advisory of finding.via.filter(item => typeof item === 'object')) {
            console.log(`  ${name}: ${advisory.severity} ${advisory.title} ${advisory.url}`);
          }
        }
      }
    } catch (error) {
      failed = true;
      console.error(`${project}: AUDIT FAILED: ${error.message}`);
    }
  }
  console.log('Counts include dependency chains; omit=dev is npm classification, not proof of browser/runtime reachability.');
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { runAudits(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
