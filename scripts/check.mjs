import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { build, projectRoot } from './build.mjs';
import { files } from './check-extension.mjs';

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: projectRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
try {
  build();
  for (const path of [...files(join(projectRoot, 'src')), ...files(join(projectRoot, 'scripts'))].filter(path => /\.(?:mjs|js)$/.test(path))) run(['--check', path]);
  run(['--test', ...files(join(projectRoot, 'tests')).filter(path => /\.test\.(?:cjs|mjs)$/.test(path))]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
