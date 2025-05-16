document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const backBtn = document.getElementById('backBtn');
  const autoRefresh = document.getElementById('autoRefresh');
  const fontSize = document.getElementById('fontSize');
  const theme = document.getElementById('theme');
  const exportBlacklistBtn = document.getElementById('exportBlacklistBtn');
  const exportFavoritesBtn = document.getElementById('exportFavoritesBtn');
  const importFile = document.getElementById('importFile');
  const importBlacklistBtn = document.getElementById('importBlacklistBtn');
  const importFavoritesBtn = document.getElementById('importFavoritesBtn');
  const feedbackBtn = document.getElementById('feedbackBtn');
  const tutorialBtn = document.getElementById('tutorialBtn');

  // Load settings
  chrome.storage.sync.get(['autoRefresh', 'fontSize', 'theme'], function(data) {
    autoRefresh.checked = data.autoRefresh !== false; // default to true
    fontSize.value = data.fontSize || 'normal';
    theme.value = data.theme || 'light';
    applyTheme(data.theme);
  });

  // Back button
  backBtn.addEventListener('click', function() {
    window.close();
  });

  // Save settings
  autoRefresh.addEventListener('change', function() {
    chrome.storage.sync.set({ autoRefresh: autoRefresh.checked });
  });

  fontSize.addEventListener('change', function() {
    chrome.storage.sync.set({ fontSize: fontSize.value });
    applyFontSize(fontSize.value);
  });

  theme.addEventListener('change', function() {
    chrome.storage.sync.set({ theme: theme.value });
    applyTheme(theme.value);
  });

  // Export buttons
  exportBlacklistBtn.addEventListener('click', function() {
    exportDomains('blacklistedDomains', 'focus_flow_blacklist.json');
  });

  exportFavoritesBtn.addEventListener('click', function() {
    exportDomains('favoriteDomains', 'focus_flow_favorites.json');
  });

  // Import buttons
  importBlacklistBtn.addEventListener('click', function() {
    if (importFile.files.length > 0) {
      importDomains('blacklistedDomains', importFile.files[0]);
    }
  });

  importFavoritesBtn.addEventListener('click', function() {
    if (importFile.files.length > 0) {
      importDomains('favoriteDomains', importFile.files[0]);
    }
  });

  // Feedback button
  feedbackBtn.addEventListener('click', function() {
    chrome.tabs.create({ url: 'https://forms.gle/your-feedback-form-link' });
  });

  // Tutorial button
  tutorialBtn.addEventListener('click', function() {
    chrome.tabs.create({ url: chrome.runtime.getURL('tutorial.html') });
  });

  // Functions
  function applyTheme(theme) {
    document.body.className = theme || 'light';
  }

  function applyFontSize(size) {
    document.body.style.fontSize = size === 'large' ? '16px' : '14px';
  }

  function exportDomains(key, filename) {
    chrome.storage.sync.get([key], function(data) {
      const domains = data[key] || [];
      const blob = new Blob([JSON.stringify(domains, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  function importDomains(key, file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const domains = JSON.parse(e.target.result);
        if (Array.isArray(domains)) {
          chrome.storage.sync.set({ [key]: domains }, function() {
            alert(`Successfully imported ${domains.length} domains to ${key === 'blacklistedDomains' ? 'blacklist' : 'favorites'}`);
          });
        } else {
          alert('Invalid file format. Expected an array of domains.');
        }
      } catch (error) {
        alert('Error parsing JSON file: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  }
});