const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/options/options.js'), 'utf8');

function setup() {
  const stored = {};
  const context = vm.createContext({
    document: { readyState: 'loading', addEventListener() {} },
    console: { warn() {} }, AbortController, setTimeout, clearTimeout,
    chrome: { runtime: {}, storage: { local: {
      async set(values) { Object.assign(stored, values); },
      async remove(keys) { keys.forEach(key => delete stored[key]); }
    } } }
  });
  vm.runInContext(source + '\nglobalThis.Manager = ThemeManager;', context);
  const manager = Object.create(context.Manager.prototype);
  Object.assign(manager, { themes: [], loadErrors: [], currentThemeUrl: 'default', selectedTheme: 'default',
    isSavingTheme: false, clearStatus() {}, renderThemes() {}, t: key => key, showSuccess() {}, showError() {} });
  return { manager, context, stored };
}

test('saving blocks overlapping selections until storage commits', async () => {
  const { manager, stored } = setup();
  let finish;
  manager.fetchResource = () => new Promise(resolve => { finish = resolve; });
  const first = manager.selectTheme('A');
  await manager.selectTheme('B');
  assert.equal(manager.selectedTheme, 'A');
  assert.equal(manager.isSavingTheme, true);
  finish('A CSS');
  await first;
  assert.equal(stored.themeUrl, 'A');
  assert.equal(manager.isSavingTheme, false);
  manager.fetchResource = async () => 'B CSS';
  await manager.selectTheme('B');
  assert.equal(stored.themeUrl, 'B');
});

test('failed save retains current theme and allows retry; default removes both keys', async () => {
  const { manager, stored } = setup();
  manager.currentThemeUrl = 'A';
  Object.assign(stored, { theme: 'A CSS', themeUrl: 'A' });
  manager.fetchResource = async () => { throw new Error('offline'); };
  await manager.selectTheme('B');
  assert.equal(manager.selectedTheme, 'A');
  assert.equal(stored.themeUrl, 'A');
  assert.equal(manager.isSavingTheme, false);
  await manager.selectTheme('default');
  assert.deepEqual(stored, {});
  assert.equal(manager.currentThemeUrl, 'default');
});

test('parallel refresh preserves failed repository entries and caches successful updates', async () => {
  const { manager, stored } = setup();
  manager.githubRepos = ['one', 'two'].map(owner => ({ owner, repo: 'themes', path: 'themes', branch: 'main' }));
  manager.themes = [{ source: 'one', name: 'cached' }, { source: 'two', name: 'old' }];
  let started = 0;
  let release;
  manager.fetchResource = async url => {
    started++;
    if (url.includes('/one/')) {
      await new Promise(resolve => { release = resolve; });
      throw new Error('offline');
    }
    return [{ name: 'theme-new.css' }];
  };
  const refresh = manager.loadGitHubThemes();
  assert.equal(started, 2);
  release();
  await refresh;
  assert.equal(manager.themes[0].name, 'cached');
  assert.equal(manager.themes[1].name, 'New');
  assert.equal(stored.themeCatalog, manager.themes);
  assert.equal(manager.loadErrors.length, 1);
});

test('search has a real empty state while reset remains separate; remote text is escaped', () => {
  const { manager, context } = setup();
  const container = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
  context.document.getElementById = id => id === 'themesGrid' ? container : null;
  manager.currentFilter = 'one'; manager.searchQuery = 'no match';
  context.Manager.prototype.renderThemes.call(manager);
  assert.match(container.innerHTML, /clearFilters/);
  assert.ok(!container.innerHTML.includes('data-theme-url="default"'));
  manager.currentFilter = 'all'; manager.searchQuery = '';
  context.Manager.prototype.renderThemes.call(manager);
  assert.match(container.innerHTML, /data-theme-url="default"/);
  const card = manager.createThemeCard({ name: '<img src=x>', url: 'x" onclick="x', description: '<b>bad</b>' });
  assert.ok(!card.includes('<img src=x>'));
  assert.match(card, /&quot;/);
});

test('preview opens without changing or downloading the active theme', () => {
  const { manager, context, stored } = setup();
  let opened = false;
  const nodes = {
    'preview-title': {}, 'preview-image': {}, 'preview-fallback': {}, 'preview-status': {},
    themePreview: { showModal() { opened = true; } }
  };
  context.document.getElementById = id => nodes[id];
  manager.updateCurrentTheme = () => {};
  manager.themes = [{ url: 'B', name: 'Dark', screenshot: 'preview.png' }];
  manager.currentThemeUrl = 'A';
  manager.openPreview('B');
  assert.equal(opened, true);
  assert.equal(nodes['preview-title'].textContent, 'Dark');
  assert.equal(nodes['preview-image'].src, 'preview.png');
  assert.equal(manager.currentThemeUrl, 'A');
  assert.deepEqual(stored, {});
});

test('timeout aborts a pending response body', async () => {
  const { manager, context } = setup();
  let abort;
  let cleared = false;
  context.setTimeout = callback => { abort = callback; return 1; };
  context.clearTimeout = () => { cleared = true; };
  context.fetch = async (_, { signal }) => ({ ok: true, text: () => new Promise((_, reject) => {
    if (signal.aborted) reject(new Error('aborted'));
    else signal.addEventListener('abort', () => reject(new Error('aborted')));
  }) });
  const request = manager.fetchResource('https://example.com/theme.css', 'text');
  await Promise.resolve();
  abort();
  await assert.rejects(request, /aborted/);
  assert.equal(cleared, true);
});

test('unavailable storage or malformed catalog cannot stop settings initialization', async () => {
  const { manager, context } = setup();
  context.chrome.storage.local.get = async () => { throw new Error('storage'); };
  await manager.loadSavedTheme();
  assert.equal(manager.currentThemeUrl, 'default');
  context.chrome.storage.local.get = async () => ({ themeUrl: 42,
    themeCatalog: [null, 12, { name: 'broken' }, { name: 'Valid', url: 'x', source: 'one' }] });
  await manager.loadSavedTheme();
  assert.equal(manager.currentThemeUrl, 'default');
  assert.equal(manager.themes.length, 1);
  assert.equal(manager.themes[0].name, 'Valid');
});
