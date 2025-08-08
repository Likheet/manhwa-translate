# Manhwa Translate Local Development

This repository contains a reverse-engineered Chrome extension for translating manhwa/manga.

## Setup

1. Install dependencies

   ```
   npm install
   ```

2. Build the extension in watch mode:

   ```
   npm run dev
   ```

   This builds the extension to the `dist/` folder and watches for changes.

3. Load the unpacked extension:
   - Open `chrome://extensions` in Chrome.
   - Enable *Developer mode*.
   - Click *Load unpacked* and select the `dist/` folder.

## Development Workflow

- Source files are located in `src/`.
- Content script: `src/content.js`
- Background service worker: `src/background.js`

Update these files and run `npm run dev` to rebuild automatically.

## Disclaimer

This project is for educational purposes and does not include remote APIs or proprietary assets from the original extension.
