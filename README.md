# Manga Translator Chrome Extension - Recovery Project

This is a reverse-engineered version of the Manga Translator Chrome extension from the Chrome Web Store.

## Project Structure

```
├── src/                    # Source code
│   ├── background/         # Background script and utilities
│   │   ├── background.ts   # Main background service worker
│   │   └── contextMenus.ts # Context menu handling
│   ├── content/            # Content scripts and utilities
│   │   ├── content.ts      # Main content script
│   │   ├── *.ts           # Other content script files
│   │   └── utils/         # Content script utilities
│   ├── popup/              # Extension popup
│   │   ├── popup.html      # Main popup interface
│   │   └── loginPopup.html # Login popup interface
│   ├── utils/              # Shared utilities
│   │   ├── appConfig.ts    # App configuration
│   │   ├── chromeApi.ts    # Chrome API wrappers
│   │   ├── ichigoApi.ts    # External API integration
│   │   ├── locales.ts      # Localization utilities
│   │   └── translation.ts  # Translation utilities
│   └── embeddedFonts/      # Embedded font definitions
├── build/                  # Built extension (generated)
├── _locales/              # Internationalization files
├── fonts/                 # Font files
├── icons/                 # Extension icons
├── recovered/             # Original recovered source files
├── tools/                 # Development tools
│   └── recover-sources.js # Source recovery tool
├── manifest.json          # Chrome extension manifest
├── package.json           # Node.js dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Development

### Prerequisites
- Node.js (v18 or higher)
- npm

### Setup
```bash
npm install
```

### Building
```bash
# Build the extension
npm run build

# Build and watch for changes
npm run dev

# Clean build directory
npm run clean

# Package extension for distribution
npm run package
```

### Installing the Extension
1. Run `npm run build` to compile the TypeScript and copy assets
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `build` folder

## Features

Based on the recovered source code, this extension provides:

- **Manga Translation**: Translates text in manga/comic images
- **Multiple Language Support**: Supports 18+ languages including Japanese, Korean, Chinese, English, etc.
- **Custom Fonts**: Includes multiple comic-style fonts for translated text
- **Context Menus**: Right-click translation options
- **Background Processing**: Uses service worker for translation processing
- **Image Analysis**: Can translate text from images, canvas elements, and background images

## Recovered Files

The original source files were recovered from the packaged extension using source maps and are located in the `recovered/` directory. The main organized source files are in the `src/` directory.

## API Integration

The extension appears to integrate with:
- `ichigoreader.com` - Main translation service
- `mangatranslator.ai` - Homepage/service website

## License

This is a reverse-engineered version for educational purposes. The original extension's license and terms apply.
