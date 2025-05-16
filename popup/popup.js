document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const toggleExtension = document.getElementById('toggleExtension');
  const statusIndicator = document.getElementById('statusIndicator');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const addFavoriteBtn = document.getElementById('addFavoriteBtn');
  const addFavoriteInput = document.getElementById('addFavoriteInput');
  const favoriteList = document.getElementById('favoriteList');
  const favoriteSort = document.getElementById('favoriteSort');
  const addBlacklistBtn = document.getElementById('addBlacklistBtn');
  const addBlacklistInput = document.getElementById('addBlacklistInput');
  const blacklistList = document.getElementById('blacklistList');
  const blacklistSort = document.getElementById('blacklistSort');
  const settingsBtn = document.getElementById('settingsBtn');
  const toast = document.getElementById('toast');

  // Load extension state
  chrome.storage.sync.get(['extensionActive', 'favoriteDomains', 'blacklistedDomains'], function(data) {
    // Set toggle state
    toggleExtension.checked = data.extensionActive !== false; // default to true
    updateStatusIndicator();

    // Load domains
    loadDomains('favorite', data.favoriteDomains || []);
    loadDomains('blacklist', data.blacklistedDomains || []);
  });

  // Toggle extension on/off
  toggleExtension.addEventListener('change', function() {
    const isActive = toggleExtension.checked;
    chrome.storage.sync.set({ extensionActive: isActive }, function() {
      updateStatusIndicator();
      showToast(isActive ? 'Extension activated ✅' : 'Extension deactivated ❌');
      
      // Send message to content script to update filtering
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "updateFiltering", isActive: isActive});
      });
    });
  });

  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      this.classList.add('active');
      const tabId = this.getAttribute('data-tab');
      document.getElementById(`${tabId}Tab`).classList.add('active');
    });
  });

  // Add favorite domain
  addFavoriteBtn.addEventListener('click', addFavorite);
  addFavoriteInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addFavorite();
  });

  // Add blacklisted domain
  addBlacklistBtn.addEventListener('click', addBlacklist);
  addBlacklistInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addBlacklist();
  });

  // Sort controls
  favoriteSort.addEventListener('change', function() {
    sortDomains('favorite', this.value);
  });

  blacklistSort.addEventListener('change', function() {
    sortDomains('blacklist', this.value);
  });

  // Open settings
  settingsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  // Functions
  function updateStatusIndicator() {
    statusIndicator.textContent = toggleExtension.checked ? '✅ Active' : '❌ Inactive';
    statusIndicator.style.color = toggleExtension.checked ? '#4CAF50' : '#f44336';
  }

  function addFavorite() {
    const domain = addFavoriteInput.value.trim();
    if (!domain) return;

    chrome.storage.sync.get(['favoriteDomains'], function(data) {
      const favorites = data.favoriteDomains || [];
      if (!favorites.includes(domain)) {
        favorites.unshift(domain); // Add to beginning for newest first
        chrome.storage.sync.set({ favoriteDomains: favorites }, function() {
          loadDomains('favorite', favorites);
          addFavoriteInput.value = '';
          showToast(`Added ${domain} to favorites ⭐`);
        });
      } else {
        showToast(`${domain} is already in favorites`);
      }
    });
  }

  function addBlacklist() {
    const domain = addBlacklistInput.value.trim();
    if (!domain) return;

    chrome.storage.sync.get(['blacklistedDomains'], function(data) {
      const blacklisted = data.blacklistedDomains || [];
      if (!blacklisted.includes(domain)) {
        blacklisted.unshift(domain); // Add to beginning for newest first
        chrome.storage.sync.set({ blacklistedDomains: blacklisted }, function() {
          loadDomains('blacklist', blacklisted);
          addBlacklistInput.value = '';
          showToast(`Added ${domain} to blacklist 🚫`);
        });
      } else {
        showToast(`${domain} is already blacklisted`);
      }
    });
  }

  function loadDomains(type, domains) {
    const listElement = type === 'favorite' ? favoriteList : blacklistList;
    listElement.innerHTML = '';

    if (domains.length === 0) {
      const emptyMsg = document.createElement('li');
      emptyMsg.textContent = `No ${type === 'favorite' ? 'favorite' : 'blacklisted'} domains yet`;
      emptyMsg.style.color = '#999';
      emptyMsg.style.fontStyle = 'italic';
      listElement.appendChild(emptyMsg);
      return;
    }

    domains.forEach(domain => {
      const li = document.createElement('li');
      
      const domainSpan = document.createElement('span');
      domainSpan.textContent = domain;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', function() {
        removeDomain(type, domain);
      });

      li.appendChild(domainSpan);
      li.appendChild(deleteBtn);
      listElement.appendChild(li);
    });
  }

  function removeDomain(type, domain) {
    const storageKey = type === 'favorite' ? 'favoriteDomains' : 'blacklistedDomains';
    
    chrome.storage.sync.get([storageKey], function(data) {
      const domains = data[storageKey] || [];
      const updatedDomains = domains.filter(d => d !== domain);
      
      chrome.storage.sync.set({ [storageKey]: updatedDomains }, function() {
        loadDomains(type, updatedDomains);
        showToast(`Removed ${domain} from ${type === 'favorite' ? 'favorites' : 'blacklist'}`);
      });
    });
  }

  function sortDomains(type, sortBy) {
    const storageKey = type === 'favorite' ? 'favoriteDomains' : 'blacklistedDomains';
    
    chrome.storage.sync.get([storageKey], function(data) {
      let domains = data[storageKey] || [];
      
      switch (sortBy) {
        case 'newest':
          // Already stored newest first
          break;
        case 'oldest':
          domains = [...domains].reverse();
          break;
        case 'a-z':
          domains = [...domains].sort((a, b) => a.localeCompare(b));
          break;
        case 'z-a':
          domains = [...domains].sort((a, b) => b.localeCompare(a));
          break;
      }
      
      loadDomains(type, domains);
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
});