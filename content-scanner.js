/**
 * Content Scanner - Monitors network requests and DOM changes
 * to extract additional endpoints and API information
 */

// Store intercepted network data
const networkData = {
  apiCalls: new Set(),
  wsConnections: new Set(),
  fetchUrls: new Set()
};

// Intercept fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (url && typeof url === 'string') {
    networkData.fetchUrls.add(url);
  } else if (url instanceof Request) {
    networkData.fetchUrls.add(url.url);
  }
  return originalFetch.apply(this, args);
};

// Intercept XMLHttpRequest
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  if (url) {
    networkData.apiCalls.add({
      method,
      url: url.toString(),
      timestamp: new Date().toISOString()
    });
  }
  return originalOpen.apply(this, [method, url, ...args]);
};

// Monitor WebSocket connections
const originalWebSocket = window.WebSocket;
window.WebSocket = class extends originalWebSocket {
  constructor(url, ...args) {
    super(url, ...args);
    networkData.wsConnections.add(url);
  }
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getNetworkData') {
    sendResponse({
      apiCalls: Array.from(networkData.apiCalls),
      wsConnections: Array.from(networkData.wsConnections),
      fetchUrls: Array.from(networkData.fetchUrls)
    });
  }
  return true; // Keep the message channel open for async response
});

// Monitor DOM for dynamic content changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      // Look for newly added scripts
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'SCRIPT' && node.src) {
          networkData.fetchUrls.add(node.src);
        }
      });
    }
  });
});

// Start observing the document
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Scan for Service Workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => {
      if (reg.scope) {
        networkData.fetchUrls.add(reg.scope);
      }
    });
  });
}

console.log('[JSner] Content scanner initialized');

