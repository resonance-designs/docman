import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function git(args, options = {}) {
  const output = execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
  });

  return typeof output === 'string' ? output.trim() : '';
}

function npmVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const version = packageJson.version;

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Root package.json version "${version}" is not a valid x.y.z version.`);
  }

  return version;
}

function ensureCleanWorktree() {
  const status = git(['status', '--porcelain']);
  if (status) {
    throw new Error(
      'Working tree has uncommitted changes. Commit or stash changes before creating a release.'
    );
  }
}

function ensureOnBranch() {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch === 'HEAD') {
    throw new Error('Cannot create a release from a detached HEAD.');
  }

  return branch;
}

function refExists(args) {
  try {
    git(args);
    return true;
  } catch {
    return false;
  }
}

function ensureReleaseCanProceed(branchName, tagName, currentBranch) {
  if (refExists(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`])) {
    if (currentBranch !== branchName) {
      throw new Error(`Local branch ${branchName} already exists. Check it out before resuming.`);
    }
  }

  if (refExists(['ls-remote', '--exit-code', '--heads', 'origin', branchName])) {
    throw new Error(`Remote branch origin/${branchName} already exists.`);
  }

  if (refExists(['show-ref', '--verify', '--quiet', `refs/tags/${tagName}`])) {
    throw new Error(`Local tag ${tagName} already exists.`);
  }

  if (refExists(['ls-remote', '--exit-code', '--tags', 'origin', tagName])) {
    throw new Error(`Remote tag origin/${tagName} already exists.`);
  }
}

function main() {
  const version = npmVersion();
  const releaseBranch = `release/${version}`;
  const tagName = `v${version}`;

  ensureCleanWorktree();
  const sourceBranch = ensureOnBranch();
  ensureReleaseCanProceed(releaseBranch, tagName, sourceBranch);

  if (sourceBranch === releaseBranch) {
    console.log(`Resuming release from existing branch ${releaseBranch}...`);
  } else {
    console.log(`Creating ${releaseBranch} from ${sourceBranch}...`);
    git(['checkout', '-b', releaseBranch], { stdio: 'inherit' });
  }

  console.log(`Tagging ${tagName}...`);
  git(['tag', '-a', tagName, '-m', `Release ${version}`], { stdio: 'inherit' });

  console.log(`Pushing ${releaseBranch} to origin...`);
  git(['push', '-u', 'origin', releaseBranch], { stdio: 'inherit' });

  console.log(`Pushing ${tagName} to origin...`);
  git(['push', 'origin', tagName], { stdio: 'inherit' });

  console.log(`Release published: ${releaseBranch} / ${tagName}`);
}

try {
  main();
} catch (error) {
  console.error(`Release failed: ${error.message}`);
  process.exit(1);
}
