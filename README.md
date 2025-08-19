# Swagger UI Chrome Extension

<div align="center">
  <img src="swagger-ui/favicon-32x32.png" alt="Swagger UI Logo" width="128" height="128">

  [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/liacakmdhalagfjlfdofigfoiocghoej)](https://chrome.google.com/webstore/detail/swagger-ui/liacakmdhalagfjlfdofigfoiocghoej)
  [![License](https://img.shields.io/github/license/jiayx/swagger-ui-chrome)](LICENSE)
  [![GitHub Stars](https://img.shields.io/github/stars/jiayx/swagger-ui-chrome?style=social)](https://github.com/jiayx/swagger-ui-chrome)

  [English](README.md) | [简体中文](README_CN.md)
</div>

## 📋 Overview

A powerful Chrome extension that packages Swagger UI, allowing you to easily view and test OpenAPI/Swagger documentation directly in your browser. Perfect for API developers and testers who want quick access to API documentation without setting up a local server.

## ✨ Features

- 🚀 **Instant Access** - View Swagger/OpenAPI documentation with one click
- 🎨 **Multiple Themes** - Choose from various built-in themes or load custom themes from GitHub
- 📁 **Local File Support** - Open local JSON/YAML API documentation files
- 🔗 **URL Support** - Load API documentation from any URL
- 💾 **Persistent Settings** - Your theme preferences are saved automatically
- 🔒 **Secure** - Runs locally in your browser with minimal permissions

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

2. Update Swagger UI to the latest version:
   ```bash
   ./scripts/update.sh
   ```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the project root directory

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
4. Click on a theme card to select it
5. Click "Save Theme" to apply the selected theme

## 🛠️ Development

### How It Works

This extension packages Swagger UI as a Chrome extension with the following architecture:

1. **Service Worker** (`background.js`): Handles extension icon clicks and opens Swagger UI in a new tab
2. **Swagger UI Integration**: Uses the official Swagger UI distribution with a custom initializer
3. **Theme System**: Dynamically fetches and applies CSS themes from GitHub repositories
4. **Storage**: Uses Chrome's storage API to persist user preferences (selected URL and theme)
5. **Manifest V3**: Compliant with Chrome's latest extension architecture for better security and performance

### Prerequisites

- Git
- Chrome browser
- Basic knowledge of Chrome extensions

### Project Structure

```
swagger-ui-chrome/
├── swagger-ui/              # Swagger UI distribution files
│   ├── index.html           # Main Swagger UI page
│   ├── swagger-ui-bundle.js # Swagger UI core bundle
│   ├── swagger-ui.css       # Swagger UI styles
│   └── swagger-initializer.js # Custom initialization
├── src/                     # Extension source code
│   ├── background.js        # Service worker for extension
│   ├── swagger-initializer.js # Template for Swagger UI initialization
│   ├── options.html         # Theme settings page
│   └── options.js           # Theme management logic
├── scripts/                 # Build and update scripts
│   ├── fetch_assets.sh      # Fetch Swagger UI and themes
│   └── update.sh            # Main update script
├── _locales/                # Internationalization files
│   ├── en/                  # English messages
│   └── zh_CN/               # Chinese messages
├── manifest.json            # Extension manifest (V3)
└── LICENSE                  # MIT License
```

### Building from Source

1. Make your changes to the source code
2. Test locally by loading the unpacked extension
3. Run update script to fetch the latest Swagger UI and themes:
   ```bash
   ./scripts/update.sh
   ```

   This script will:
   - Download the latest Swagger UI distribution
   - Fetch theme collections from GitHub repositories
   - Clean up unnecessary files
   - Copy custom initialization script

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
- Apply theme without refresh
- Add more languages support

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
