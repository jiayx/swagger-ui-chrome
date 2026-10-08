document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById('swagger-ui');
  const saveUrl = () => {
    const input = container.querySelector('.download-url-input');
    if (input) {
      void saveDocumentUrl(input.value.trim());
    }
  };
  container.addEventListener('click', event => {
    if (event.target.closest('.download-url-button')) saveUrl();
  }, true);
  container.addEventListener('submit', event => {
    if (event.target.matches('.download-url-wrapper')) saveUrl();
  }, true);

  // Storage is the source of truth for all open viewer tabs, including resets.
  let themeChanged = false;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.hasOwn(changes, 'theme')) {
      themeChanged = true;
      injectTheme(changes.theme.newValue);
    }
  });
  chrome.storage.local.get(['theme'], result => {
    if (!chrome.runtime.lastError && !themeChanged) injectTheme(result?.theme);
  });

  readDocumentUrl().then(savedUrl => {
    const url = savedUrl || "https://petstore.swagger.io/v2/swagger.json";
    window.ui = SwaggerUIBundle({
      url: url,
      dom_id: '#swagger-ui',
      deepLinking: true,
      filter: false,
      // Keep private document URLs away from Swagger's public validator.
      validatorUrl: null,
      oauth2RedirectUrl: chrome.runtime.getURL('viewer/oauth2-redirect.html'),
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl,
        LightweightOperationsPlugin
      ],
      layout: "StandaloneLayout",
      syntaxHighlight: {
        theme: "tomorrow-night"
      }
    });
  });
});

// Serialize migration and saves within a viewer so a late legacy read cannot
// overwrite a URL entered while the page was starting.
let urlStorageQueue = Promise.resolve();
function readDocumentUrl() {
  const work = urlStorageQueue.then(async () => {
    let local = await chrome.storage.local.get(['url', 'urlMigrationComplete']);
    if (typeof local.url !== 'string' && !local.urlMigrationComplete) {
      const legacy = await chrome.storage.sync.get('url');
      // Another viewer may have saved while we were reading sync storage.
      local = await chrome.storage.local.get(['url', 'urlMigrationComplete']);
      if (typeof local.url !== 'string' && !local.urlMigrationComplete) {
        local = { url: typeof legacy.url === 'string' ? legacy.url : '', urlMigrationComplete: true };
        await chrome.storage.local.set(local);
      }
    }
    await chrome.storage.sync.remove('url').catch(() => {});
    return typeof local.url === 'string' ? local.url : '';
  }).catch(() => {
    console.warn('Unable to read document preference; using the default document.');
    return '';
  });
  urlStorageQueue = work;
  return work;
}

function saveDocumentUrl(url) {
  const work = urlStorageQueue.then(async () => {
    await chrome.storage.local.set({ url, urlMigrationComplete: true });
    // Only remove the legacy value after a successful local write.
    await chrome.storage.sync.remove('url');
  }).catch(() => { console.warn('Unable to save or clean up document preference.'); });
  urlStorageQueue = work;
  return work;
}

function adaptThemeRules(rules) {
  for (const rule of rules) {
    // Let the browser parse CSS: comments, whitespace and nested media queries
    // should not prevent a manually selected dark theme from taking effect.
    if (rule.media) {
      rule.media.mediaText = rule.media.mediaText.replace(
        /\(\s*prefers-color-scheme\s*:\s*dark\s*\)/gi, '(min-width: 0px)');
    }
    if (rule.cssRules) adaptThemeRules(rule.cssRules);
  }
}

function injectTheme(theme) {
  const existedStyle = document.getElementById('swagger-theme-css');
  if (existedStyle) {
    existedStyle.remove();
  }

  if (typeof theme === 'string' && theme.trim()) {
    const style = document.createElement('style');
    style.id = 'swagger-theme-css';
    style.textContent = theme;
    document.getElementsByTagName('head').item(0).appendChild(style);
    try {
      if (style.sheet) adaptThemeRules(style.sheet.cssRules);
    } catch (_) {
      console.warn('Unable to adapt theme media queries; retaining the original CSS.');
    }
  }
}
