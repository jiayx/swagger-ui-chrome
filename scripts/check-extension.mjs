import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { resolve, relative, dirname, join, isAbsolute } from 'node:path';
import { parse } from 'parse5';

export function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }).sort();
}

export function checkExtension(directory) {
  const root = realpathSync(directory);
  function requireAsset(path) {
    let valid = false;
    try {
      const real = realpathSync(path), rel = relative(root, real);
      valid = rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(rel) && statSync(real).isFile() && statSync(real).size > 0;
    } catch {}
    if (!valid) throw new Error(`Missing or invalid extension asset: ${path}`);
    return path;
  }
  const json = path => JSON.parse(readFileSync(requireAsset(path), 'utf8'));
  const manifest = json(join(root, 'manifest.json'));
  requireAsset(resolve(root, manifest.background.service_worker));
  requireAsset(resolve(root, manifest.options_page));
  for (const [size, icon] of Object.entries(manifest.icons ?? {})) {
    const data = readFileSync(requireAsset(resolve(root, icon)));
    if (data.length < 24 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.readUInt32BE(16) !== Number(size) || data.readUInt32BE(20) !== Number(size)) {
      throw new Error(`Icon dimensions do not match manifest: ${icon}`);
    }
  }
  for (const icon of Object.values(manifest.action?.default_icon ?? {})) requireAsset(resolve(root, icon));
  for (const name of ['index.html', 'viewer.css', 'viewer.js', 'oauth2-redirect.html', 'oauth2-redirect.js']) requireAsset(join(root, 'viewer', name));
  for (const name of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-standalone-preset.js']) requireAsset(join(root, 'vendor/swagger-ui', name));
  const keys = value => JSON.stringify(Object.keys(value).sort());
  const defaultKeys = keys(json(join(root, '_locales', manifest.default_locale, 'messages.json')));
  for (const locale of files(join(root, '_locales')).filter(path => path.endsWith('messages.json'))) {
    if (keys(json(locale)) !== defaultKeys) throw new Error(`Locale keys do not match: ${locale}`);
  }
  for (const page of files(root).filter(path => path.endsWith('.html'))) {
    function visit(node) {
      for (const { name, value } of node.attrs ?? []) {
        if (!['src', 'href'].includes(name) || !value || value.startsWith('#') || /^(?:[\w+.-]+:|\/\/)/.test(value)) continue;
        const path = decodeURIComponent(value.split(/[?#]/)[0]);
        requireAsset(resolve(path.startsWith('/') ? root : dirname(page), path.replace(/^\/+/, '')));
      }
      for (const child of node.childNodes ?? []) visit(child);
      if (node.content) visit(node.content);
    }
    visit(parse(readFileSync(page, 'utf8')));
  }
}
