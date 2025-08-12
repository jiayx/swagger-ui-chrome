window.onload = function() {
  document.getElementById("swagger-ui").onclick = function (e) {
    if (e.target.className == "download-url-button button") {
      var url = document.getElementsByClassName("download-url-input")[0].value;
      chrome.storage.sync.set({'url': url});
    }
  }

  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme) {
      var style = document.createElement('style');
      style.rel = 'stylesheet';
      style.innerHTML = formatCss(result.theme);
      document.getElementsByTagName('head').item(0).appendChild(style);
    }
  })

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
};

function formatCss(css) {
  if (css.startsWith('@media (prefers-color-scheme: dark)')) {
    return css.replace('@media (prefers-color-scheme: dark)', '@media (prefers-color-scheme: dark), (prefers-color-scheme: light)');
  }
  return css;
}
