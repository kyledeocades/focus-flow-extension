// Listen for messages from popup/background
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "updateFiltering") {
    if (request.isActive) {
      applyFilters();
    } else {
      // If extension is turned off, remove all filtering
      const hiddenElements = document.querySelectorAll('[data-focus-flow-hidden]');
      hiddenElements.forEach(el => {
        el.style.display = '';
        el.removeAttribute('data-focus-flow-hidden');
      });
    }
  }
});

// Apply filters when page loads
if (document.readyState === 'complete') {
  applyFilters();
} else {
  window.addEventListener('load', applyFilters);
}

// Main filtering function
function applyFilters() {
  chrome.storage.sync.get(['extensionActive', 'favoriteDomains', 'blacklistedDomains'], function(data) {
    // Only proceed if extension is active (default to true if not set)
    if (data.extensionActive === false) return;

    const favorites = data.favoriteDomains || [];
    const blacklisted = data.blacklistedDomains || [];

    // Process search results (assuming Google Search)
    if (window.location.hostname.includes('google.')) {
      filterGoogleResults(favorites, blacklisted);
    }
    // Could add other search engines here
  });
}

function filterGoogleResults(favorites, blacklisted) {
  const results = document.querySelectorAll('div.g'); // Google result elements

  results.forEach(result => {
    const link = result.querySelector('a[href^="http"]');
    if (!link) return;

    const url = link.href;
    const domain = extractDomain(url);

    if (!domain) return;

    // Hide blacklisted results
    if (blacklisted.includes(domain)) {
      result.style.display = 'none';
      result.setAttribute('data-focus-flow-hidden', 'blacklisted');
      return;
    }

    // Highlight favorite results
    if (favorites.includes(domain)) {
      result.style.borderLeft = '3px solid #4CAF50';
      result.style.paddingLeft = '10px';
      result.style.backgroundColor = '#f0fff0';
      result.setAttribute('data-focus-flow-highlighted', 'true');
    }
  });

  // Optionally reorder results to bring favorites to top
  if (favorites.length > 0) {
    const container = document.getElementById('rso') || document.querySelector('div#search');
    if (container) {
      const highlighted = Array.from(document.querySelectorAll('[data-focus-flow-highlighted="true"]'));
      
      highlighted.forEach(item => {
        container.prepend(item);
      });
    }
  }
}

function extractDomain(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch (e) {
    return null;
  }
}

if (isGoogle()) {
  filterGoogleResults(favorites, blacklisted);
} else if (isBing()) {
  filterBingResults(favorites, blacklisted);
}

function isGoogle() {
  return window.location.hostname.includes('google.');
}

function isBing() {
  return window.location.hostname.includes('bing.');
}