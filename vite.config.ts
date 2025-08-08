import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';

// Import the extension manifest. During the build the CRX plugin
// injects version numbers and ensures the correct structure for
// Chrome Manifest V3. See src/manifest.json for details.
import manifest from './src/manifest.json';

// Vite configuration for bundling a Chrome extension.  The CRX plugin
// automatically handles most of the boilerplate associated with
// manifest versioning and code output.  Setting `sourcemap: true` on
// the build ensures that you can debug your extension easily in
// Chrome DevTools.
export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    sourcemap: true,
    // Emit the build artefacts into the `dist` folder at the project
    // root.  When running `npm run dev`, Vite will watch for file
    // changes and rebuild the extension automatically.
    outDir: 'dist',
  },
});
