// Background service worker for the local development version of the
// Manhwa Translator extension.
//
// The background script runs in a separate context from the content
// script and can handle events such as installation, messaging, or
// network requests.  This stub simply logs when the service worker
// starts and when the extension is installed or updated.

console.log('[Manhwa Translate Local] background service worker started');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Manhwa Translate Local] extension installed or updated');
});
