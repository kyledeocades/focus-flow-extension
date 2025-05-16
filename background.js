// Initialize context menu items
chrome.runtime.onInstalled.addListener(function() {
  // Create context menu for links
  chrome.contextMenus.create({
    id: "addToFavorites",
    title: "Add to Favorite Domains (Focus Flow)",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "addToBlacklist",
    title: "Add to Blacklisted Domains (Focus Flow)",
    contexts: ["link"]
  });

  // Set default settings
  chrome.storage.sync.set({
    extensionActive: true,
    favoriteDomains: [],
    blacklistedDomains: [],
    autoRefresh: true,
    fontSize: 'normal',
    theme: 'light'
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "addToFavorites") {
    addDomainToStorage('favoriteDomains', extractDomain(info.linkUrl));
  } else if (info.menuItemId === "addToBlacklist") {
    addDomainToStorage('blacklistedDomains', extractDomain(info.linkUrl));
  }
});

// Helper function to extract domain from URL
function extractDomain(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch (e) {
    console.error("Error extracting domain:", e);
    return null;
  }
}

// Helper function to add domain to storage
function addDomainToStorage(key, domain) {
  if (!domain) return;

  chrome.storage.sync.get([key, 'extensionActive'], function(data) {
    const domains = data[key] || [];
    const isActive = data.extensionActive !== false;

    if (!domains.includes(domain)) {
      domains.unshift(domain);
      chrome.storage.sync.set({ [key]: domains }, function() {
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Focus Flow',
          message: `Added ${domain} to ${key === 'favoriteDomains' ? 'favorites' : 'blacklist'}`
        });

        // Send message to content script to update filtering if active
        if (isActive) {
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "updateFiltering",
                isActive: true
              });
            }
          });
        }
      });
    }
  });
}