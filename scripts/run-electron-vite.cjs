const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const electronVite = join(__dirname, '..', 'node_modules', 'electron-vite', 'bin', 'electron-vite.js');
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const result = spawnSync(process.execPath, [electronVite, ...process.argv.slice(2)], {
  cwd: join(__dirname, '..'),
  env,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
