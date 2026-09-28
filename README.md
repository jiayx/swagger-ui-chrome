# Swagger UI Chrome Extension

<div align="center">
  <img src="src/icons/icon-128.png" alt="Swagger UI Logo" width="128" height="128">

  [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/liacakmdhalagfjlfdofigfoiocghoej)](https://chrome.google.com/webstore/detail/swagger-ui/liacakmdhalagfjlfdofigfoiocghoej)
  [![License](https://img.shields.io/github/license/jiayx/swagger-ui-chrome)](LICENSE)
  [![GitHub Stars](https://img.shields.io/github/stars/jiayx/swagger-ui-chrome?style=social)](https://github.com/jiayx/swagger-ui-chrome)

  [English](README.md) | [简体中文](README_CN.md)
</div>

## 📋 Overview

A powerful Chrome extension that packages Swagger UI, allowing you to easily view and test OpenAPI/Swagger documentation directly in your browser. Perfect for API developers and testers who want quick access to API documentation without setting up a local server.

## ✨ Features

- 🚀 **Instant Access** - View Swagger/OpenAPI documentation with one click
- 🎨 **Multiple Themes** - Use the default theme or select a theme from two configured GitHub repositories
- 📄 **JSON/YAML Documents** - Load documents served over HTTP/HTTPS; direct local file import is not currently supported
- 🔗 **URL Support** - Load API documentation from any URL
- 💾 **Persistent Settings** - Your theme preferences are saved automatically
- 🔒 **Browser Extension** - Uses storage and HTTP/HTTPS host permissions to load documents and call APIs

## 📦 Installation

### Method 1: Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/detail/swagger-ui/liacakmdhalagfjlfdofigfoiocghoej)
2. Click "Add to Chrome"
3. Confirm the installation

### Method 2: Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jiayx/swagger-ui-chrome.git
   cd swagger-ui-chrome
   ```

2. Install the locked dependencies and build:
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select `dist/extension/` inside the project, not the source directory

## 🎯 Usage

### Basic Usage

1. **Click the extension icon** in your Chrome toolbar
2. Enter the API documentation **URL**
3. **View and interact** with your API documentation

### Theme Customization

1. Right-click the extension icon and select "Options"
2. Browse available themes:
   - **GitHub themes** - Dynamically loaded from GitHub repositories
   - Themes are fetched from configured repositories in real-time
3. Preview themes with screenshots (when available)
4. Click a preview image to inspect it without changing the active theme
5. Choose **Use theme** to apply it, or **Restore default** in the current-theme panel

## 🛠️ Development

### How It Works

This extension packages Swagger UI as a Chrome extension with the following architecture:

1. **Service Worker** (`background.js`): Handles extension icon clicks and opens Swagger UI in a new tab
2. **Swagger UI Integration**: Uses the official Swagger UI distribution with a custom initializer
3. **Theme System**: Dynamically fetches and applies CSS themes from GitHub repositories
4. **Storage**: Uses Chrome's storage API to persist user preferences (selected URL and theme)
5. **Manifest V3**: Compliant with Chrome's latest extension architecture for better security and performance

### Prerequisites

- Node.js 24+, pnpm 12.3.4
- Chrome browser

### Project structure

```
swagger-ui-chrome/
├── src/                         # Owned extension source; mirrors the package
│   ├── manifest.json            # Browser extension manifest
│   ├── background.js            # Toolbar action entry
│   ├── _locales/                # Chrome-required localization directory
│   ├── icons/                   # Shared extension and page branding
│   ├── options/                 # Complete settings feature
│   │   ├── index.html
│   │   ├── options.css
│   │   ├── options.js
│   │   └── default-theme.png    # Preview image used only by settings
│   └── viewer/                  # API browsing, execution and authorization
│       ├── index.html
│       ├── viewer.css
│       ├── viewer.js
│       ├── oauth2-redirect.html
│       └── oauth2-redirect.js
├── scripts/                     # Node development tools; never packaged
│   ├── build.mjs                # Assemble the extension and ZIP
│   ├── check.mjs                # Validation and test entry
│   ├── check-extension.mjs      # Manifest, asset and locale checks
│   └── preview/                 # Local server, demo API and Chrome API shim
├── tests/                       # Runtime, build and preview regression tests
├── package.json
├── pnpm-lock.yaml
├── node_modules/                # Installed dependencies; ignored by Git
└── dist/                        # Generated output; ignored by Git
    ├── extension/               # Load this directory in Chrome
    │   ├── …                    # Same relative paths as src/
    │   └── vendor/swagger-ui/   # Third-party assets and licenses copied at build
    └── swagger-ui-chrome-v*.zip  # Store package
```

Directories follow maintenance boundaries: each feature owns its HTML, CSS, JavaScript and dedicated images. Only shared branding belongs in the common icons directory. A single background entry stays at the root; there are no placeholder components, services or utility layers. Development tools and tests stay outside runtime source.

The build preserves relative paths from `src/` without rewriting references or maintaining a second path mapping. `vendor/` belongs only to generated output, never to owned source. Chrome must load `dist/extension/` because source alone does not include dependency assets.


### Local development and packaging

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm preview
```

The builder combines owned source with selected assets from the installed `swagger-ui-dist` package. It does not download or upgrade dependencies. Missing or mismatched dependencies fail clearly. Output is staged and validated before replacing the previous successful build; identical inputs produce identical ZIPs. Build, validation, tests and preview all run on Node.js.

Edit `src/`, rebuild, then reload the extension and its open pages. Do not edit `dist/extension/`: it is replaced on each build. Preview serves the generated extension at `http://127.0.0.1:8765/options/index.html` (add `?lang=zh_CN` for Chinese), using simulated Chrome APIs.

Theme CSS still loads dynamically from the configured GitHub repositories. Theme selections and catalogs are cached locally. Resets propagate to open document tabs. Document URLs are stored locally; legacy synced URLs are removed only after successful local migration.

### Updating Swagger UI

The project pins `swagger-ui-dist` **5.33.0**. Upgrade explicitly:

```bash
pnpm add --save-exact swagger-ui-dist@<version>
pnpm check
pnpm build
```

Commit owned source, `package.json`, `pnpm-lock.yaml` and build configuration, not downloaded bundles or ZIPs.

### Swagger UI integration boundary

The build copies only core bundles, base CSS, icons and license notices from the dependency. Upstream entry pages and OAuth callbacks never replace extension-owned adapters. Viewer HTML, styles, initialization and OAuth callbacks live together in `src/viewer/`. The build copies the source layout directly into the extension and places third-party assets in `vendor/swagger-ui/`. The OAuth callback path is now `viewer/oauth2-redirect.html`; update any provider redirect allowlist that used the old path. The public remote Swagger validator is disabled.

Generated `vendor/swagger-ui/upstream.json` records the npm package, version and lockfile provenance. Exact dependency integrity information is in `pnpm-lock.yaml`.

The local preview includes a **local-test → Basic Auth** endpoint with disposable `demo / demo` credentials, sent only to localhost. Check document loading, theme changes, Try it out, authorization dialogs and OAuth callbacks after upgrades. Actual extension permissions and real OAuth providers still require testing in a loaded Chrome extension.

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🎨 Theme Sources

This extension dynamically loads themes from:

- [ilyamixaltik/swagger-themes](https://github.com/ilyamixaltik/swagger-themes)
- [ostranme/swagger-ui-themes](https://github.com/ostranme/swagger-ui-themes)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Swagger UI](https://github.com/swagger-api/swagger-ui) - The amazing API documentation tool
- Theme creators [ilyamixaltik/swagger-themes](https://github.com/ilyamixaltik/swagger-themes)
- Theme creators [ostranme/swagger-ui-themes](https://github.com/ostranme/swagger-ui-themes)
- All contributors who have helped improve this extension

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/jiayx/swagger-ui-chrome/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jiayx/swagger-ui-chrome/discussions)

## 🔄 Changelog

### Version 1.6
- Theme changes now take effect immediately after saving, no page refresh required
- Added support for more languages

### Version 1.5
- Migrated to Manifest V3
- Improved theme management system
- Added local theme support
- Enhanced settings page UI/UX
- Better error handling and user feedback

### Version 1.4
- Added multiple theme support
- Improved performance

### Version 1.0
- Initial release
- Basic Swagger UI functionality

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/jiayx">jiayx</a>
</div>
