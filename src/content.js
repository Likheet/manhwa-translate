// Content script for the local development version of the
// Manhwa Translator extension.
//
// This stub demonstrates that your content script is being injected
// correctly by adding a small banner to the page and logging to the
// console.  Replace the contents of this file with your recovered
// translation logic when ready.

console.log('[Manhwa Translate Local] content script loaded', window.location.href);

// Create a banner element to indicate that the content script is active.
const banner = document.createElement('div');
banner.textContent = 'Manhwa Translator content script active';
banner.style.position = 'fixed';
banner.style.zIndex = '2147483647';
banner.style.bottom = '10px';
banner.style.right = '10px';
banner.style.padding = '6px 10px';
banner.style.background = 'rgba(0, 128, 0, 0.8)';
banner.style.color = '#fff';
banner.style.borderRadius = '4px';
banner.style.fontSize = '12px';

// Append the banner to the document root so it overlays the page.
document.documentElement.appendChild(banner);

// Remove the banner after five seconds to avoid cluttering the page.
setTimeout(() => banner.remove(), 5000);
