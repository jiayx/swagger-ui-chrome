const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/viewer/viewer.js'), 'utf8');

function setup(local = {}, sync = {}) {
  let ready, changed, readTheme, config;
  const events = {}, styles = new Map();
  const api = { runtime: { getURL: path => `chrome-extension://test/${path}` }, storage: {
    onChanged: { addListener: callback => { changed = callback; } }
  } };
  for (const [name, state] of Object.entries({ local, sync })) {
    api.storage[name] = {
      get(keys, callback) {
        if (callback) { readTheme = callback; return; }
        return Promise.resolve({ ...state });
      },
      async set(values) { Object.assign(state, values); },
      async remove(keys) { [].concat(keys).forEach(key => delete state[key]); }
    };
  }
  const container = {
    querySelector: () => ({ value: ' https://example.com/new.json ' }),
    addEventListener: (name, callback) => { events[name] = callback; }
  };
  const document = {
    addEventListener: (_, callback) => { ready = callback; },
    getElementById: id => id === 'swagger-ui' ? container : styles.get(id),
    createElement: () => ({ remove() { styles.delete(this.id); } }),
    getElementsByTagName: () => ({ item: () => ({ appendChild(style) { styles.set(style.id, style); } }) })
  };
  const bundle = options => { config = options; return {}; };
  bundle.presets = { apis: {} }; bundle.plugins = { DownloadUrl: {} };
  const context = vm.createContext({ document, window: {}, console: { warn() {} },
    SwaggerUIBundle: bundle, SwaggerUIStandalonePreset: {}, chrome: api });
  vm.runInContext(fs.readFileSync(require.resolve('../src/viewer/operations.js'), 'utf8'), context);
  vm.runInContext(source, context);
  return { context, api, events, styles, local, sync, start: () => ready(),
    change: (...args) => changed(...args), readTheme: value => readTheme(value),
    config: () => config, flush: () => vm.runInContext('urlStorageQueue', context) };
}

test('viewer handles theme reset/read races and saves document URLs locally', async () => {
  const v = setup();
  v.start(); await v.flush();
  assert.equal(v.config().validatorUrl, null);
  assert.equal(v.config().filter, false);
  assert.ok(v.config().plugins.includes(v.context.LightweightOperationsPlugin));
  assert.equal(v.config().oauth2RedirectUrl, 'chrome-extension://test/viewer/oauth2-redirect.html');
  v.change({ theme: { newValue: 'new CSS' } }, 'local');
  v.readTheme({ theme: 'stale CSS' });
  assert.equal(v.styles.get('swagger-theme-css').textContent, 'new CSS');
  v.change({ theme: {} }, 'local'); assert.equal(v.styles.size, 0);
  v.change({ theme: { newValue: 42 } }, 'local'); assert.equal(v.styles.size, 0);
  v.events.click({ target: { closest: () => ({}) } }); await v.flush();
  assert.equal(v.local.url, 'https://example.com/new.json');
  v.local.url = '';
  v.events.submit({ target: { matches: () => true } }); await v.flush();
  assert.equal(v.local.url, 'https://example.com/new.json');
  assert.equal(v.sync.url, undefined);
});

test('legacy URLs migrate once, and local values including empty strings take precedence', async () => {
  for (const initial of [{}, { url: 'local' }, { url: '' }]) {
    const v = setup({ ...initial }, { url: 'legacy' });
    const expected = Object.hasOwn(initial, 'url') ? initial.url : 'legacy';
    assert.equal(await v.context.readDocumentUrl(), expected);
    assert.equal(v.local.url, expected);
    assert.equal(v.sync.url, undefined);
  }
});

test('failed migration preserves legacy data; failed reads still start the viewer', async () => {
  const v = setup({}, { url: 'legacy' });
  v.api.storage.local.set = async () => { throw new Error('quota'); };
  assert.equal(await v.context.readDocumentUrl(), '');
  assert.equal(v.sync.url, 'legacy');
  v.api.storage.local.get = (keys, callback) => callback ? callback({}) : Promise.reject(new Error('storage'));
  v.start(); await v.flush();
  assert.equal(v.config().url, 'https://petstore.swagger.io/v2/swagger.json');
});

test('a save during migration wins over the delayed legacy read', async () => {
  const v = setup({}, { url: 'legacy' });
  let release, started;
  const waiting = new Promise(resolve => { started = resolve; });
  v.api.storage.sync.get = () => new Promise(resolve => { release = resolve; started(); });
  const read = v.context.readDocumentUrl();
  await waiting;
  const save = v.context.saveDocumentUrl('new');
  release({ url: 'legacy' });
  await read; await save;
  assert.equal(v.local.url, 'new');
  assert.equal(v.sync.url, undefined);
});

test('dark media adaptation preserves viewport constraints and nested rules', () => {
  const v = setup();
  const nested = { media: { mediaText: 'not (prefers-color-scheme: dark)' }, cssRules: [] };
  const dark = { media: { mediaText: '(PREFERS-COLOR-SCHEME : dark) and (max-width: 700px)' }, cssRules: [nested] };
  const light = { media: { mediaText: '(prefers-color-scheme: light)' } };
  v.context.adaptThemeRules([{ cssRules: [dark, light] }]);
  assert.equal(dark.media.mediaText, '(min-width: 0px) and (max-width: 700px)');
  assert.equal(nested.media.mediaText, 'not (min-width: 0px)');
  assert.equal(light.media.mediaText, '(prefers-color-scheme: light)');
});
