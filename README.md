# Swagger UI Chrome Extension

English | [简体中文](README_CN.md)

View OpenAPI/Swagger documentation, call APIs and customize the documentation theme in Chrome.

## Features

- Load JSON and YAML documents over HTTP/HTTPS and explore APIs with Swagger UI.
- Use authentication defined by the document, including Basic Auth and OAuth.
- Search, filter and preview community themes from GitHub. Apply a theme or restore the default across open document tabs.
- Store document URLs, theme CSS and the theme catalog locally.
- Follow Chrome's interface language: English, Simplified Chinese, Spanish, Hindi, Japanese, Korean or Russian.

Theme sources: [ilyamixaltik/swagger-themes](https://github.com/ilyamixaltik/swagger-themes), [ostranme/swagger-ui-themes](https://github.com/ostranme/swagger-ui-themes).

All operation summaries remain in the page for native Ctrl+F (Cmd+F on Mac) search by path, method, or summary. Full operation components load on first expansion; unmounted parameter/response details are not searchable with browser Find. Chrome can reveal collapsed groups when their text matches.

## Installation and usage

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/swagger-ui/liacakmdhalagfjlfdofigfoiocghoej).

Click the toolbar icon, enter a document URL and click **Explore**. Right-click the extension icon and choose **Options** for theme settings. Click a screenshot to preview a theme and **Use theme** to apply it.

The extension uses the `storage` permission for preferences and HTTP/HTTPS host permissions to load documents and call APIs. Document URLs are not sent to Swagger's public validator. Configure OAuth providers with the callback URL `chrome-extension://<extension ID>/viewer/oauth2-redirect.html`.

## Local development

Requires Node.js 24+, pnpm 12.3.4 and Chrome.

```sh
git clone https://github.com/jiayx/swagger-ui-chrome.git
cd swagger-ui-chrome
pnpm install --frozen-lockfile
pnpm build
```

Open `chrome://extensions/`, enable Developer mode, click **Load unpacked** and select **`dist/extension/`**.

| Command | Purpose |
| --- | --- |
| `pnpm build` | Assemble the extension and store ZIP |
| `pnpm check` | Build, check syntax and run regression tests |
| `pnpm preview` | Build and start the local preview |

After editing source, rebuild and reload the extension and its pages in Chrome.

Local preview URLs:

- API viewer: `http://127.0.0.1:8765/viewer/index.html`
- Settings: `http://127.0.0.1:8765/options/index.html` (add `?lang=zh_CN` for Chinese)

The preview simulates Chrome APIs with browser local storage and serves a local Basic Auth example with `demo / demo` credentials. Extension permissions and real OAuth login require verification in the Chrome extension.

## Project structure

```text
src/
├── manifest.json       # Extension manifest
├── background.js       # Toolbar action
├── _locales/           # Translations
├── icons/              # Shared icons
├── options/            # Settings page and dedicated assets
└── viewer/             # Document page, initialization and OAuth callback
scripts/                # Node build, validation and local preview tools
tests/                  # Feature and build regression tests
dist/
├── extension/          # Directory loaded by Chrome
└── swagger-ui-chrome-v*.zip
```

The build preserves relative paths from `src/` and copies required `swagger-ui-dist` assets and licenses into `vendor/swagger-ui/` in the output. `package.json` and `pnpm-lock.yaml` pin dependencies. `node_modules/` and `dist/` are ignored by Git.

## Packaging and release

Set the extension version in `src/manifest.json`, run `pnpm check` and upload `dist/swagger-ui-chrome-v<version>.zip` to the Chrome Web Store developer dashboard.

To upgrade Swagger UI:

```sh
pnpm add --save-exact swagger-ui-dist@<version>
pnpm check
```

## License and support

[MIT](LICENSE). Third-party components retain their own licenses. Report problems through [GitHub Issues](https://github.com/jiayx/swagger-ui-chrome/issues).
