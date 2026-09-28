import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spec } from './spec.mjs';

const defaultRoot = fileURLToPath(new URL('../../dist/extension/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };

export async function createPreviewServer(directory = defaultRoot) {
  const root = await realpath(directory);
  await readFile(join(root, 'manifest.json'));
  const shim = await readFile(new URL('./chrome-shim.js', import.meta.url), 'utf8');
  return createServer(async (request, response) => {
    function send(body, type, status = 200) {
      response.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : body);
    }
    try {
      if (!['GET', 'HEAD'].includes(request.method)) return send('Method not allowed', 'text/plain', 405);
      const url = new URL(request.url, 'http://127.0.0.1');
      let path;
      try { path = decodeURIComponent(url.pathname); } catch { return send('Invalid path', 'text/plain', 400); }
      const language = url.searchParams.get('lang') === 'zh_CN' ? 'zh_CN' : 'en';
      if (path === '/__preview/chrome.js') {
        const messages = JSON.parse(await readFile(join(root, '_locales', language, 'messages.json'), 'utf8'));
        return send(`const PREVIEW_LANG=${JSON.stringify(language)};const MESSAGES=${JSON.stringify(messages)};\n${shim}`, mime['.js']);
      }
      if (path === '/__preview/spec.json') return send(JSON.stringify(spec), mime['.json']);
      if (path === '/__preview/basic-auth') {
        const authorized = request.headers.authorization === 'Basic ZGVtbzpkZW1v';
        return send(JSON.stringify({ authenticated: authorized }), mime['.json'], authorized ? 200 : 401);
      }
      if (path === '/') path = '/viewer/index.html';
      const target = await realpath(resolve(root, '.' + path));
      const rel = relative(root, target);
      if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel) || !(await stat(target)).isFile()) return send('Not found', 'text/plain', 404);
      let data = await readFile(target);
      if (['/viewer/index.html', '/options/index.html'].includes(path)) data = data.toString().replace('<head>', `<head><script src="/__preview/chrome.js?lang=${language}"></script>`);
      send(data, mime[extname(target)] ?? 'application/octet-stream');
    } catch (error) {
      const missing = ['ENOENT', 'ENOTDIR', 'EACCES', 'EINVAL'].includes(error.code);
      if (!missing) console.error(`Preview request failed: ${error.message}`);
      send(missing ? 'Not found' : 'Preview error', 'text/plain', missing ? 404 : 500);
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const server = await createPreviewServer();
    server.on('error', error => { console.error(`Preview failed: ${error.message}`); process.exitCode = 1; });
    server.listen(8765, '127.0.0.1', () => console.log('UI preview: http://127.0.0.1:8765/viewer/index.html'));
  } catch (error) {
    console.error(`Preview failed: ${error.message}. Build the extension first: pnpm build`);
    process.exitCode = 1;
  }
}
