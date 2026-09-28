import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createPreviewServer } from '../scripts/preview/server.mjs';

test('Node preview serves pages, localized shim, assets and Basic Auth fixture', async t => {
  const server = await createPreviewServer();
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(base + '/options/index.html?lang=zh_CN');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<script src="\/__preview\/chrome.js\?lang=zh_CN"><\/script>/);
  const manifest = await (await fetch(base + '/manifest.json')).json();
  assert.equal(manifest.options_page, 'options/index.html');
  for (const path of ['/viewer/index.html', '/viewer/viewer.js', '/viewer/viewer.css', '/options/default-theme.png', '/icons/icon-32.png']) {
    assert.equal((await fetch(base + path)).status, 200, path);
  }
  const shim = await fetch(base + '/__preview/chrome.js?lang=zh_CN');
  assert.match(await shim.text(), /const PREVIEW_LANG="zh_CN"/);
  const fallback = await fetch(base + '/__preview/chrome.js?lang=unsupported');
  assert.match(await fallback.text(), /const PREVIEW_LANG="en"/);
  const spec = await (await fetch(base + '/__preview/spec.json')).json();
  assert.equal(spec.components.securitySchemes.basicAuth.scheme, 'basic');
  const unauthenticated = await fetch(base + '/__preview/basic-auth');
  assert.equal(unauthenticated.status, 401);
  assert.deepEqual(await unauthenticated.json(), { authenticated: false });
  const authenticated = await fetch(base + '/__preview/basic-auth', { headers: { Authorization: 'Basic ZGVtbzpkZW1v' } });
  assert.equal(authenticated.status, 200);
  assert.deepEqual(await authenticated.json(), { authenticated: true });
  const css = await fetch(base + '/vendor/swagger-ui/swagger-ui.css');
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  assert.equal((await fetch(base + '/vendor/swagger-ui/swagger-ui.css', { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(base + '/%2e%2e%2fpackage.json')).status, 404);
  assert.equal((await fetch(base + '/node_modules')).status, 404);
  assert.equal((await fetch(base + '/%invalid')).status, 400);
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
});
