// Storage for extracted endpoints
let extractedData = {
  endpoints: [],
  graphql: [],
  apis: [],
  config: [],
  other: []
};

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadStoredData();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('scanButton').addEventListener('click', performScan);
  document.getElementById('verifyButton').addEventListener('click', verifyEndpoints);
  document.getElementById('clearButton').addEventListener('click', clearData);
  document.getElementById('viewResultsBtn').addEventListener('click', viewResults);
  document.getElementById('downloadJSON').addEventListener('click', () => downloadData('json'));
  document.getElementById('downloadCSV').addEventListener('click', () => downloadData('csv'));
  document.getElementById('downloadTXT').addEventListener('click', () => downloadData('txt'));
  document.getElementById('copyClipboard').addEventListener('click', copyToClipboard);
  
  // Save base URL when changed
  document.getElementById('baseUrl').addEventListener('change', (e) => {
    chrome.storage.local.set({ baseUrl: e.target.value });
  });
  
  // Load saved base URL
  chrome.storage.local.get('baseUrl', (data) => {
    if (data.baseUrl) {
      document.getElementById('baseUrl').value = data.baseUrl;
    }
  });
}

function performScan() {
  const scanButton = document.getElementById('scanButton');
  scanButton.disabled = true;
  scanButton.textContent = 'SCANNING...';
  
  showStatus('>> SCANNING PAGE FOR ENDPOINTS...', 'info');

  const options = {
    scanJS: document.getElementById('scanJS').checked,
    scanCSS: document.getElementById('scanCSS').checked,
    scanJSON: document.getElementById('scanJSON').checked,
    scanHTML: document.getElementById('scanHTML').checked,
    scanGraphQL: document.getElementById('scanGraphQL').checked,
    scanXML: document.getElementById('scanXML').checked
  };

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const currentTab = tabs[0];
      
      // Auto-fill base URL from current tab
      try {
        const url = new URL(currentTab.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        document.getElementById('baseUrl').value = baseUrl;
        chrome.storage.local.set({ baseUrl });
      } catch (e) {
        console.error('Could not parse URL:', e);
      }
      
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: runAdvancedScanner,
        args: [options]
      }, (results) => {
        if (results && results[0] && results[0].result) {
          extractedData = results[0].result;
          updateUI();
          showStatus(`>> FOUND ${extractedData.endpoints.length} ENDPOINTS`, 'success');
        } else {
          showStatus('>> ERROR: NO ENDPOINTS FOUND', 'error');
        }
        scanButton.disabled = false;
        scanButton.textContent = 'SCAN';
      });
    }
  });
}

function runAdvancedScanner(options) {
  const results = {
    endpoints: new Set(),
    graphql: new Set(),
    apis: new Set(),
    config: new Set(),
    other: new Set()
  };

  // Helper function to check if endpoint is valid
  function isValidEndpoint(str) {
    if (!str || str.length < 2) return false;
    // Filter out common false positives
    const excluded = ['javascript:', 'data:', 'mailto:', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.woff', '.woff2', '.ttf', '.eot', '.ico'];
    for (let exc of excluded) {
      if (str.toLowerCase().includes(exc)) return false;
    }
    return true;
  }

  // Helper function to scan content with patterns
  function scanContent(content) {
    if (!content) return;

    // Pattern 1: API/REST endpoints (paths starting with /)
    const endpointPattern = /(?:["'`])(\/[a-zA-Z0-9_?&=\/\-\#\.]+)(?:["'`])/g;
    let match;
    while ((match = endpointPattern.exec(content)) !== null) {
      if (match[1] && isValidEndpoint(match[1])) {
        results.endpoints.add(match[1]);
      }
    }

    // Pattern 2: Query parameters (starting with ?)
    const queryPattern = /(?:["'`])(\?[a-zA-Z0-9_&=\/\-\#\.]+)(?:["'`])/g;
    while ((match = queryPattern.exec(content)) !== null) {
      if (match[1] && match[1].length > 2) {
        results.endpoints.add(match[1]);
      }
    }

    // Pattern 3: Hash/Fragment URLs (starting with #)
    const hashPattern = /(?:["'`])(\#[a-zA-Z0-9_&=\/\-\.]+)(?:["'`])/g;
    while ((match = hashPattern.exec(content)) !== null) {
      if (match[1] && match[1].length > 2) {
        results.endpoints.add(match[1]);
      }
    }

    // Pattern 4: Full URLs
    const urlPattern = /https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}[a-zA-Z0-9\-\._~:\/\?#\[\]@!\$&'\(\)\*\+,;=]*/g;
    while ((match = urlPattern.exec(content)) !== null) {
      if (match[0] && isValidEndpoint(match[0])) {
        results.endpoints.add(match[0]);
      }
    }

    // Pattern 5: API endpoints
    const apiPattern = /\/(?:api|v[0-9]|graphql|rest|service|endpoint)[a-zA-Z0-9_?&=\/\-]*/gi;
    while ((match = apiPattern.exec(content)) !== null) {
      if (match[0]) {
        results.apis.add(match[0]);
      }
    }

    // Pattern 6: GraphQL
    const graphqlPattern = /(?:query|mutation|subscription)\s+\w+/gi;
    while ((match = graphqlPattern.exec(content)) !== null) {
      if (match[0]) {
        results.graphql.add(match[0]);
      }
    }

    // Pattern 7: Config files
    const configPattern = /(?:config|settings|env|\.json|\.xml)[a-zA-Z0-9_\/\-\.]*/gi;
    while ((match = configPattern.exec(content)) !== null) {
      if (match[0] && match[0].length > 4) {
        results.config.add(match[0]);
      }
    }
  }

  // Get page content
  const pageContent = document.documentElement.outerHTML;

  // 1. Scan JavaScript
  if (options.scanJS) {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].textContent) {
        scanContent(scripts[i].textContent);
      }
      if (scripts[i].src) {
        results.endpoints.add(scripts[i].src);
      }
    }
  }

  // 2. Scan CSS
  if (options.scanCSS) {
    const styles = document.getElementsByTagName('style');
    for (let i = 0; i < styles.length; i++) {
      scanContent(styles[i].textContent);
    }
    
    const links = document.getElementsByTagName('link');
    for (let i = 0; i < links.length; i++) {
      if (links[i].rel === 'stylesheet' && links[i].href) {
        results.endpoints.add(links[i].href);
      }
    }
  }

  // 3. Scan JSON
  if (options.scanJSON) {
    const jsonScripts = document.querySelectorAll('script[type="application/json"]');
    for (let script of jsonScripts) {
      scanContent(script.textContent);
    }
  }

  // 4. Scan HTML
  if (options.scanHTML) {
    scanContent(pageContent);
    
    // Extract from attributes
    const attrPattern = /(?:href|src|data-url|action|data-endpoint)=["']([^"']+)["']/g;
    let match;
    while ((match = attrPattern.exec(pageContent)) !== null) {
      if (match[1] && isValidEndpoint(match[1])) {
        results.endpoints.add(match[1]);
      }
    }
  }

  // 5. Scan GraphQL
  if (options.scanGraphQL) {
    const graphqlEndpointPattern = /["']?(\/graphql|\/gql|\/query)[a-zA-Z0-9_?&=\/\-]*["']?/gi;
    let match;
    while ((match = graphqlEndpointPattern.exec(pageContent)) !== null) {
      results.graphql.add(match[0].replace(/["']/g, ''));
    }
  }

  // 6. Scan XML/SOAP
  if (options.scanXML) {
    const xmlPattern = /(?:soap|xml|service|asmx|wsdl)[a-zA-Z0-9_?&=\/\-\.]*/gi;
    let match;
    while ((match = xmlPattern.exec(pageContent)) !== null) {
      if (match[0]) {
        results.other.add(match[0]);
      }
    }
  }

  // Convert Sets to Arrays and filter
  return {
    endpoints: Array.from(results.endpoints).filter(e => e && e.length > 1),
    graphql: Array.from(results.graphql).filter(e => e && e.length > 1),
    apis: Array.from(results.apis).filter(e => e && e.length > 1),
    config: Array.from(results.config).filter(e => e && e.length > 1),
    other: Array.from(results.other).filter(e => e && e.length > 1)
  };
}

function updateUI() {
  const totalCount = extractedData.endpoints.length + extractedData.graphql.length + extractedData.apis.length;
  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('apiCount').textContent = extractedData.apis.length;
  document.getElementById('graphqlCount').textContent = extractedData.graphql.length;

  // Enable export buttons if data exists
  const hasData = totalCount > 0;
  const baseUrl = document.getElementById('baseUrl').value;
  
  document.getElementById('viewResultsBtn').disabled = !hasData;
  document.getElementById('verifyButton').disabled = !hasData || !baseUrl;
  document.getElementById('downloadJSON').disabled = !hasData;
  document.getElementById('downloadCSV').disabled = !hasData;
  document.getElementById('downloadTXT').disabled = !hasData;
  document.getElementById('copyClipboard').disabled = !hasData;

  // Save to storage
  chrome.storage.local.set({ extractedData });
}

function viewResults() {
  // Open results page in a new tab
  chrome.tabs.create({
    url: chrome.runtime.getURL('results.html')
  });
}

async function verifyEndpoints() {
  const baseUrl = document.getElementById('baseUrl').value.trim();
  const rateLimit = parseInt(document.getElementById('rateLimit').value) || 100;
  
  if (!baseUrl) {
    showStatus('>> ERROR: BASE URL REQUIRED', 'error');
    return;
  }

  const verifyButton = document.getElementById('verifyButton');
  verifyButton.disabled = true;
  verifyButton.textContent = 'VERIFYING...';
  
  showStatus('>> VERIFYING ENDPOINTS...', 'info');

  // Collect all endpoints
  const allEndpoints = [
    ...extractedData.endpoints,
    ...extractedData.apis
  ].filter(ep => ep.startsWith('/'));

  if (allEndpoints.length === 0) {
    showStatus('>> NO ENDPOINTS TO VERIFY', 'error');
    verifyButton.disabled = false;
    verifyButton.textContent = 'VERIFY';
    return;
  }

  // Initialize verification results
  if (!extractedData.verification) {
    extractedData.verification = {};
  }

  let verified = 0;
  let failed = 0;

  // HTTP methods to test
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

  for (const endpoint of allEndpoints) {
    const fullUrl = baseUrl.replace(/\/$/, '') + endpoint;
    
    // Test each HTTP method
    for (const method of methods) {
      try {
        const response = await fetch(fullUrl, {
          method: method,
          mode: 'no-cors', // To avoid CORS issues
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Store result
        if (!extractedData.verification[endpoint]) {
          extractedData.verification[endpoint] = {};
        }
        
        extractedData.verification[endpoint][method] = {
          status: response.status || 'no-cors',
          accessible: true,
          timestamp: new Date().toISOString()
        };
        
        verified++;
        break; // If one method works, move to next endpoint
        
      } catch (error) {
        if (!extractedData.verification[endpoint]) {
          extractedData.verification[endpoint] = {};
        }
        extractedData.verification[endpoint][method] = {
          status: 'error',
          accessible: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        failed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, rateLimit));
    }

    // Update progress
    const progress = Math.round(((verified + failed) / (allEndpoints.length * methods.length)) * 100);
    showStatus(`>> VERIFYING... ${progress}%`, 'info');
  }

  // Save results
  chrome.storage.local.set({ extractedData });

  showStatus(`>> VERIFIED: ${verified} OK, ${failed} FAILED`, verified > 0 ? 'success' : 'error');
  verifyButton.disabled = false;
  verifyButton.textContent = 'VERIFY';
}

function loadStoredData() {
  chrome.storage.local.get('extractedData', (data) => {
    if (data.extractedData) {
      extractedData = data.extractedData;
      updateUI();
    }
  });
}

function clearData() {
  extractedData = {
    endpoints: [],
    graphql: [],
    apis: [],
    config: [],
    other: []
  };
  chrome.storage.local.set({ extractedData });
  updateUI();
  showStatus('>> DATA CLEARED', 'info');
}

function downloadData(format) {
  const allData = [
    ...extractedData.endpoints,
    ...extractedData.graphql,
    ...extractedData.apis,
    ...extractedData.config,
    ...extractedData.other
  ];

  if (allData.length === 0) {
    showStatus('>> ERROR: NO DATA TO EXPORT', 'error');
    return;
  }

  let content, filename, mimeType;

  switch (format) {
    case 'json':
      content = JSON.stringify(extractedData, null, 2);
      filename = 'jsner-endpoints.json';
      mimeType = 'application/json';
      break;
    case 'csv':
      const headers = 'Type,Value\n';
      const rows = allData.map((item, idx) => {
        let type = 'unknown';
        if (extractedData.endpoints.includes(item)) type = 'endpoint';
        else if (extractedData.graphql.includes(item)) type = 'graphql';
        else if (extractedData.apis.includes(item)) type = 'api';
        else if (extractedData.config.includes(item)) type = 'config';
        return `${type},"${item.replace(/"/g, '""')}"`;
      }).join('\n');
      content = headers + rows;
      filename = 'jsner-endpoints.csv';
      mimeType = 'text/csv';
      break;
    case 'txt':
      content = allData.join('\n');
      filename = 'jsner-endpoints.txt';
      mimeType = 'text/plain';
      break;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  showStatus(`>> DOWNLOADED: ${filename.toUpperCase()}`, 'success');
}

function copyToClipboard() {
  const allData = [
    ...extractedData.endpoints,
    ...extractedData.graphql,
    ...extractedData.apis,
    ...extractedData.config,
    ...extractedData.other
  ];

  if (allData.length === 0) {
    showStatus('>> ERROR: NO DATA TO COPY', 'error');
    return;
  }

  const text = allData.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showStatus('>> COPIED TO CLIPBOARD', 'success');
  }).catch(() => {
    showStatus('>> ERROR: COPY FAILED', 'error');
  });
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = type;
  
  setTimeout(() => {
    statusEl.className = '';
    statusEl.style.display = 'none';
  }, 4000);
}
