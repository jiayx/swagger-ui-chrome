document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("swagger-ui").onclick = function (e) {
    if (e.target.className == "download-url-button button") {
      var url = document.getElementsByClassName("download-url-input")[0].value;
      chrome.storage.sync.set({'url': url});
    }
  };

  chrome.storage.local.get(['theme'], (result) => {
    injectTheme(result.theme);
  });

  chrome.storage.sync.get('url', function (items) {
    const url = items.url || "https://petstore.swagger.io/v2/swagger.json";
    window.ui = SwaggerUIBundle({
      url: url,
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: "StandaloneLayout",
      syntaxHighlight: {
        theme: "tomorrow-night"
      }
    });
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) {
      sendResponse({ ok: true });
      return true;
    }

    if (msg.type === 'setTheme') {
      injectTheme(msg.theme);
      sendResponse({ ok: true });
    }
    return true;
  });
});

function formatCss(css) {
  if (css.startsWith('@media (prefers-color-scheme: dark)')) {
    return css.replace('@media (prefers-color-scheme: dark)', '@media (prefers-color-scheme: dark), (prefers-color-scheme: light)');
  }
  return css;
}

function injectTheme(theme) {
  const existedStyle = document.getElementById('swagger-theme-css');
  if (existedStyle) {
    existedStyle.remove();
  }

  if (theme) {
    const style = document.createElement('style');
    style.id = 'swagger-theme-css';
    style.rel = 'stylesheet';
    style.innerHTML = formatCss(theme);
    document.getElementsByTagName('head').item(0).appendChild(style);
  }
}
