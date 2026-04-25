import { spawnSync } from 'node:child_process';

const uiAliases = {
  react: 'frontend',
  legacy: 'frontend',
  vue: 'frontend-vue',
  vuetify: 'frontend-vue',
};

const requestedUi = (process.argv[2] || process.env.DOCMAN_UI || process.env.UI_FLAVOR || 'vue').toLowerCase();
const frontendDir = uiAliases[requestedUi];

if (!frontendDir) {
  console.error(`Unsupported DOCMAN_UI value "${requestedUi}". Use "vue" or "react".`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`Building DocMan with ${requestedUi} UI from ${frontendDir}...`);
run('npm', ['ci', '--prefix', 'backend']);
run('npm', ['ci', '--include=dev', '--prefix', frontendDir]);
run('npm', ['run', 'build', '--prefix', frontendDir]);
