import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { build, projectRoot } from '../scripts/build.mjs';
import { files } from '../scripts/check-extension.mjs';
import { relative } from 'node:path';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'swagger build with spaces '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(projectRoot, 'src'), join(root, 'src'), { recursive: true });
  for (const file of ['LICENSE', 'package.json']) copyFileSync(join(projectRoot, file), join(root, file));
  const dependency = join(root, 'node_modules/swagger-ui-dist');
  mkdirSync(dependency, { recursive: true });
  const version = JSON.parse(readFileSync(join(root, 'package.json'))).dependencies['swagger-ui-dist'];
  writeFileSync(join(dependency, 'package.json'), JSON.stringify({ version }));
  for (const name of ['swagger-ui-bundle.js', 'swagger-ui-standalone-preset.js', 'swagger-ui.css', 'favicon-16x16.png', 'favicon-32x32.png', 'LICENSE']) writeFileSync(join(dependency, name), 'synthetic vendor asset');
  for (const name of ['swagger-initializer.js', 'oauth2-redirect.html', 'unused.js.map']) writeFileSync(join(dependency, name), 'must not be packaged');
  return { root, dependency };
}

test('package uses owned adapters and excludes development files', t => {
  const { root } = fixture(t);
  const result = build(root), archive = unzipSync(readFileSync(result.archive)), names = Object.keys(archive);
  for (const name of ['manifest.json', 'vendor/swagger-ui/LICENSE', 'viewer/oauth2-redirect.js']) assert.ok(names.includes(name));
  for (const name of ['vendor/swagger-ui/swagger-initializer.js', 'vendor/swagger-ui/oauth2-redirect.js']) assert.ok(!names.includes(name));
  assert.match(Buffer.from(archive['viewer/oauth2-redirect.html']).toString(), /\.\/oauth2-redirect.js/);
  assert.ok(!names.some(name => /^(extension|node_modules|scripts|tests)\//.test(name) || name.endsWith('.map')));
  assert.deepEqual(Buffer.from(archive['viewer/viewer.js']), readFileSync(join(root, 'src/viewer/viewer.js')));
  // Owned files retain their paths and contents; only vendor assets are added.
  for (const path of files(join(root, 'src'))) {
    const name = relative(join(root, 'src'), path).split('\\').join('/');
    if (name.endsWith('.map') || name.endsWith('.DS_Store')) continue;
    assert.deepEqual(Buffer.from(archive[name]), readFileSync(path), name);
  }
  assert.ok(existsSync(join(result.extension, 'manifest.json')));
  assert.ok(!existsSync(join(root, 'src/vendor/swagger-ui/swagger-ui-bundle.js')));
});
test('missing dependency has install hint', t => {
  const { root, dependency } = fixture(t);
  rmSync(dependency, { recursive: true });
  assert.throws(() => build(root), /pnpm install --frozen-lockfile/);
});
test('version mismatch is rejected', t => {
  const { root, dependency } = fixture(t);
  writeFileSync(join(dependency, 'package.json'), '{"version":"0.0.1"}');
  assert.throws(() => build(root), /differs/);
});
test('missing asset keeps previous build and cleans staging', t => {
  const { root, dependency } = fixture(t), result = build(root);
  const previous = readFileSync(result.archive), marker = join(result.extension, 'previous-marker');
  writeFileSync(marker, 'previous');
  rmSync(join(dependency, 'swagger-ui-bundle.js'));
  assert.throws(() => build(root), /Missing Swagger UI dependency asset/);
  assert.deepEqual(readFileSync(result.archive), previous);
  assert.ok(existsSync(marker));
  assert.ok(!readdirSync(join(root, 'dist')).some(name => name.startsWith('.build-')));
});
test('broken or escaping HTML resource fails before publishing', t => {
  const { root } = fixture(t), page = join(root, 'src/options/index.html');
  for (const src of ['missing.js', '../../../package.json']) {
    writeFileSync(page, `<script src="${src}"></script>`);
    assert.throws(() => build(root), /Missing or invalid extension asset/);
    assert.deepEqual(readdirSync(join(root, 'dist')), []);
  }
});
test('repeat build is reproducible and removes stale output', t => {
  const { root } = fixture(t), first = build(root), previous = readFileSync(first.archive);
  const stale = join(first.extension, 'stale.js');
  writeFileSync(stale, 'stale');
  const second = build(root);
  assert.deepEqual(readFileSync(second.archive), previous);
  assert.ok(!existsSync(stale));
});
