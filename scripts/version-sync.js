import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const packageFiles = [
  'package.json',
  'backend/package.json',
  'frontend/package.json',
  'frontend-vue/package.json',
  'docs-site/package.json',
];

const lockFiles = [
  'package-lock.json',
  'backend/package-lock.json',
  'frontend/package-lock.json',
  'frontend-vue/package-lock.json',
  'docs-site/package-lock.json',
];

// Explicit allowlist: never walk source trees for release metadata.
// Existing version comments elsewhere are intentionally left unchanged.
const versionTextFiles = [
  'README.md',
  'backend/README.md',
  'frontend/README.md',
  'frontend/src/README.md',
  'frontend-vue/README.md',
  'docs-site/README.md',
  'docs/architecture/README.md',
  'docs/manuals/README.md',
  'docs/DEVELOPER_ONBOARDING.md',
  'frontend/src/App.jsx',
  'install.sh',
  'update.sh',
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function writeJson(relativePath, data) {
  fs.writeFileSync(
    path.join(repoRoot, relativePath),
    `${JSON.stringify(data, null, 2)}\n`,
    'utf8',
  );
}

function isSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function incrementPatch(version) {
  if (!isSemver(version)) {
    throw new Error(`Cannot auto-increment non-semver version "${version}". Use x.y.z.`);
  }

  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function resolveTargetVersion() {
  const rootPackage = readJson('package.json');
  const requestedVersion = process.argv[2];

  if (requestedVersion) {
    if (!isSemver(requestedVersion)) {
      throw new Error(`Invalid version "${requestedVersion}". Use x.y.z, for example 0.3.0.`);
    }

    return {
      currentVersion: rootPackage.version,
      targetVersion: requestedVersion,
      mode: 'explicit',
    };
  }

  return {
    currentVersion: rootPackage.version,
    targetVersion: incrementPatch(rootPackage.version),
    mode: 'patch',
  };
}

function updatePackageJson(relativePath, targetVersion) {
  const packageJson = readJson(relativePath);
  packageJson.version = targetVersion;
  writeJson(relativePath, packageJson);
  return relativePath;
}

function updatePackageLock(relativePath, targetVersion) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  const lockJson = readJson(relativePath);
  lockJson.version = targetVersion;

  if (lockJson.packages?.['']) {
    lockJson.packages[''].version = targetVersion;
  }

  writeJson(relativePath, lockJson);
  return relativePath;
}

function updateProjectConfig(targetVersion) {
  const relativePath = 'project-config.json';
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  const rootPackage = readJson('package.json');
  const config = readJson(relativePath);
  config.author = rootPackage.author;
  config.version = targetVersion;
  config.license = rootPackage.license;
  writeJson(relativePath, config);
  return relativePath;
}

function updateVersionText(relativePath, targetVersion) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return null;

  const original = fs.readFileSync(absolutePath, 'utf8');
  const updated = original
    .replace(/(badge\/Version-)([^-]+)(-orange)/g, `$1${targetVersion}$3`)
    .replace(/(badge\/Latest_Release-v)([^-]+)(-green)/g, `$1${targetVersion}$3`)
    .replace(/^([ \t]*[ *#]+[ \t]*@version[ \t]+)[^\r\n]+/gm, `$1${targetVersion}`)
    .replace(/^([ \t]*(?:-[ \t]+)?Version:[ \t]*)\d+\.\d+\.\d+/gm, `$1${targetVersion}`);

  if (updated === original) return null;
  fs.writeFileSync(absolutePath, updated, 'utf8');
  return relativePath;
}

function main() {
  const { currentVersion, targetVersion, mode } = resolveTargetVersion();
  const changed = [];

  for (const packageFile of packageFiles) {
    changed.push(updatePackageJson(packageFile, targetVersion));
  }

  for (const lockFile of lockFiles) {
    const updated = updatePackageLock(lockFile, targetVersion);
    if (updated) {
      changed.push(updated);
    }
  }

  const projectConfig = updateProjectConfig(targetVersion);
  if (projectConfig) {
    changed.push(projectConfig);
  }

  for (const relativePath of versionTextFiles) {
    const updated = updateVersionText(relativePath, targetVersion);
    if (updated) changed.push(updated);
  }

  const uniqueChanged = [...new Set(changed)].sort();
  console.log(`Version sync complete: ${currentVersion} -> ${targetVersion} (${mode})`);
  console.log(`Updated ${uniqueChanged.length} file(s).`);
  for (const file of uniqueChanged) {
    console.log(`- ${file}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`Version sync failed: ${error.message}`);
  process.exit(1);
}
