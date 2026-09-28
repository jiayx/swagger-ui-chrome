import { cpSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, unzipSync } from 'fflate';
import { checkExtension, files } from './check-extension.mjs';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export function build(root = projectRoot) {
  const expected = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies['swagger-ui-dist'];
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(expected)) throw new Error('swagger-ui-dist must use an exact version, not a range.');
  const dependency = join(root, 'node_modules/swagger-ui-dist');
  if (!existsSync(join(dependency, 'package.json'))) throw new Error('Swagger UI dependency is missing. Run: pnpm install --frozen-lockfile');
  if (JSON.parse(readFileSync(join(dependency, 'package.json'), 'utf8')).version !== expected) throw new Error('Installed Swagger UI version differs from package.json. Run pnpm install --frozen-lockfile.');
  const output = join(root, 'dist');
  mkdirSync(output, { recursive: true });
  const staging = mkdtempSync(join(output, '.build-'));
  try {
    const extension = join(staging, 'extension');
    cpSync(join(root, 'src'), extension, {
      recursive: true,
      filter: path => !['.DS_Store', '__pycache__'].includes(basename(path)) && !path.endsWith('.map'),
    });
    // Third-party files exist only in generated output, separate from owned code.
    const vendor = join(extension, 'vendor/swagger-ui');
    if (existsSync(join(extension, 'vendor'))) throw new Error('src/vendor is reserved for generated dependencies.');
    mkdirSync(vendor, { recursive: true });
    for (const name of ['swagger-ui-bundle.js', 'swagger-ui-standalone-preset.js', 'swagger-ui.css', 'favicon-16x16.png', 'favicon-32x32.png', 'LICENSE']) {
      const source = join(dependency, name);
      if (!existsSync(source) || !statSync(source).isFile() || !statSync(source).size) throw new Error(`Missing Swagger UI dependency asset: ${name}`);
      copyFileSync(source, join(vendor, name));
    }
    for (const name of ['swagger-ui-bundle.js.LICENSE.txt', 'swagger-ui-standalone-preset.js.LICENSE.txt', 'NOTICE']) {
      if (existsSync(join(dependency, name))) copyFileSync(join(dependency, name), join(vendor, name));
    }
    writeFileSync(join(vendor, 'upstream.json'), JSON.stringify({ package: 'swagger-ui-dist', version: expected, repository: 'https://github.com/swagger-api/swagger-ui', provenance: 'pnpm-lock.yaml' }, null, 2) + '\n');
    copyFileSync(join(root, 'LICENSE'), join(extension, 'LICENSE'));
    checkExtension(extension);
    const version = JSON.parse(readFileSync(join(extension, 'manifest.json'), 'utf8')).version;
    if (!/^\d+(?:\.\d+){0,3}$/.test(version)) throw new Error('Invalid extension version.');
    const archive = join(staging, `swagger-ui-chrome-v${version}.zip`);
    const entries = Object.fromEntries(files(extension).map(path => [relative(extension, path).split('\\').join('/'), readFileSync(path)]));
    // ZIP dates use local calendar fields; fixed fields keep builds identical across time zones.
    const zip = zipSync(entries, { level: 9, mtime: new Date(1980, 0, 1), os: 3, attrs: 0o100644 << 16 });
    const unpacked = unzipSync(zip);
    if (Object.keys(unpacked).length !== Object.keys(entries).length || Object.entries(entries).some(([name, bytes]) => !bytes.equals(unpacked[name]))) throw new Error('ZIP integrity check failed.');
    writeFileSync(archive, zip);
    const target = join(output, 'extension'), previous = join(staging, 'previous');
    if (existsSync(target)) renameSync(target, previous);
    try {
      renameSync(extension, target);
      renameSync(archive, join(output, basename(archive)));
    } catch (error) {
      rmSync(target, { recursive: true, force: true });
      if (existsSync(previous)) renameSync(previous, target);
      throw error;
    }
    return { extension: target, archive: join(output, basename(archive)) };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = build();
    console.log(`Load unpacked: ${result.extension}\nStore ZIP: ${result.archive}`);
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
