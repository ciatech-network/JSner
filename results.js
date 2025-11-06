// Load and display results
let allData = {
  endpoints: [],
  graphql: [],
  apis: [],
  config: [],
  other: []
};

let currentFilter = 'all';
let searchTerm = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
});

function setupEventListeners() {
  // Search functionality
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderResults();
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderResults();
    });
  });

  // Export button
  document.getElementById('exportAllBtn').addEventListener('click', exportAll);
}

function loadData() {
  chrome.storage.local.get('extractedData', (data) => {
    if (data.extractedData) {
      allData = data.extractedData;
      updateStats();
      renderResults();
    } else {
      showEmptyState();
    }
  });
}

function updateStats() {
  document.getElementById('totalStat').textContent = 
    allData.endpoints.length + allData.graphql.length + allData.apis.length + allData.config.length + allData.other.length;
  document.getElementById('apiStat').textContent = allData.apis.length;
  document.getElementById('graphqlStat').textContent = allData.graphql.length;
  document.getElementById('configStat').textContent = allData.config.length;
}

function renderResults() {
  const container = document.getElementById('resultsContainer');
  const emptyState = document.getElementById('emptyState');
  
  container.innerHTML = '';
  
  let hasResults = false;

  // Filter data based on current filter and search
  const filteredData = filterData();

  // Render each category
  if (currentFilter === 'all' || currentFilter === 'endpoints') {
    if (filteredData.endpoints.length > 0) {
      container.appendChild(createCategorySection('Endpoints', '🌐', filteredData.endpoints, 'endpoints'));
      hasResults = true;
    }
  }

  if (currentFilter === 'all' || currentFilter === 'apis') {
    if (filteredData.apis.length > 0) {
      container.appendChild(createCategorySection('API Endpoints', '⚡', filteredData.apis, 'apis'));
      hasResults = true;
    }
  }

  if (currentFilter === 'all' || currentFilter === 'graphql') {
    if (filteredData.graphql.length > 0) {
      container.appendChild(createCategorySection('GraphQL', '🔷', filteredData.graphql, 'graphql'));
      hasResults = true;
    }
  }

  if (currentFilter === 'all' || currentFilter === 'config') {
    if (filteredData.config.length > 0) {
      container.appendChild(createCategorySection('Configuration', '⚙️', filteredData.config, 'config'));
      hasResults = true;
    }
  }

  if (filteredData.other.length > 0) {
    container.appendChild(createCategorySection('Other', '📦', filteredData.other, 'other'));
    hasResults = true;
  }

  // Show empty state if no results
  if (!hasResults) {
    emptyState.style.display = 'block';
    container.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    container.style.display = 'block';
  }
}

function filterData() {
  const filtered = {
    endpoints: [],
    apis: [],
    graphql: [],
    config: [],
    other: []
  };

  // Apply search filter
  if (searchTerm) {
    filtered.endpoints = allData.endpoints.filter(e => e.toLowerCase().includes(searchTerm));
    filtered.apis = allData.apis.filter(e => e.toLowerCase().includes(searchTerm));
    filtered.graphql = allData.graphql.filter(e => e.toLowerCase().includes(searchTerm));
    filtered.config = allData.config.filter(e => e.toLowerCase().includes(searchTerm));
    filtered.other = allData.other.filter(e => e.toLowerCase().includes(searchTerm));
  } else {
    filtered.endpoints = [...allData.endpoints];
    filtered.apis = [...allData.apis];
    filtered.graphql = [...allData.graphql];
    filtered.config = [...allData.config];
    filtered.other = [...allData.other];
  }

  return filtered;
}

function createCategorySection(title, icon, items, category) {
  const section = document.createElement('div');
  section.className = 'category-section';
  section.dataset.category = category;

  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `
    <div class="category-title">
      <div class="category-icon">${icon}</div>
      <span>${title}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 16px;">
      <div class="category-count">${items.length} items</div>
      <div class="category-toggle">▼</div>
    </div>
  `;

  const content = document.createElement('div');
  content.className = 'category-content';

  items.forEach(item => {
    const endpointItem = document.createElement('div');
    endpointItem.className = 'endpoint-item';
    
    // Check verification status
    let verificationBadge = '';
    if (allData.verification && allData.verification[item]) {
      const verified = Object.values(allData.verification[item]).some(v => v.accessible);
      if (verified) {
        verificationBadge = '<span class="verification-badge verified">✓ VERIFIED</span>';
      } else {
        verificationBadge = '<span class="verification-badge failed">✗ FAILED</span>';
      }
    }
    
    endpointItem.innerHTML = `
      <div class="endpoint-text">${escapeHtml(item)}${verificationBadge}</div>
      <div class="endpoint-actions">
        <div class="action-icon" title="Copy" data-action="copy" data-value="${escapeHtml(item)}">📋</div>
        <div class="action-icon" title="Open" data-action="open" data-value="${escapeHtml(item)}">🔗</div>
      </div>
    `;
    content.appendChild(endpointItem);
  });

  // Toggle functionality
  header.addEventListener('click', () => {
    header.classList.toggle('collapsed');
    content.classList.toggle('hidden');
  });

  // Action buttons
  content.addEventListener('click', (e) => {
    const actionIcon = e.target.closest('.action-icon');
    if (actionIcon) {
      const action = actionIcon.dataset.action;
      const value = actionIcon.dataset.value;
      
      if (action === 'copy') {
        copyToClipboard(value);
      } else if (action === 'open') {
        openUrl(value);
      }
    }
  });

  section.appendChild(header);
  section.appendChild(content);
  return section;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('>> COPIED TO CLIPBOARD');
  }).catch(() => {
    showToast('>> ERROR: COPY FAILED', 'error');
  });
}

function openUrl(url) {
  try {
    // If it's a full URL, open it directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
      return;
    }
    
    // For relative URLs (starting with / or ? or #), use base URL from storage
    if (url.startsWith('/') || url.startsWith('?') || url.startsWith('#')) {
      chrome.storage.local.get('baseUrl', (data) => {
        if (data.baseUrl) {
          let fullUrl;
          if (url.startsWith('/')) {
            fullUrl = data.baseUrl.replace(/\/$/, '') + url;
          } else if (url.startsWith('?') || url.startsWith('#')) {
            // For query params and fragments, append to base URL
            fullUrl = data.baseUrl.replace(/\/$/, '') + '/' + url;
          }
          window.open(fullUrl, '_blank');
        } else {
          showToast('>> ERROR: NO BASE URL SET', 'error');
        }
      });
    } else {
      showToast('>> ERROR: CANNOT OPEN ENDPOINT', 'error');
    }
  } catch (e) {
    showToast('>> ERROR: INVALID URL', 'error');
  }
}

function exportAll() {
  const allItems = [
    ...allData.endpoints.map(e => ({ type: 'endpoint', value: e })),
    ...allData.apis.map(e => ({ type: 'api', value: e })),
    ...allData.graphql.map(e => ({ type: 'graphql', value: e })),
    ...allData.config.map(e => ({ type: 'config', value: e })),
    ...allData.other.map(e => ({ type: 'other', value: e }))
  ];

  // Create JSON
  const jsonContent = JSON.stringify(allData, null, 2);
  
  // Create CSV
  const csvContent = 'Type,Value\n' + allItems.map(item => 
    `${item.type},"${item.value.replace(/"/g, '""')}"`
  ).join('\n');

  // Create TXT
  const txtContent = allItems.map(item => item.value).join('\n');

  // Download all formats
  downloadFile(jsonContent, 'jsner-results.json', 'application/json');
  downloadFile(csvContent, 'jsner-results.csv', 'text/csv');
  downloadFile(txtContent, 'jsner-results.txt', 'text/plain');

  showToast('>> EXPORTED ALL FORMATS');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function showEmptyState() {
  document.getElementById('emptyState').style.display = 'block';
  document.getElementById('resultsContainer').style.display = 'none';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

