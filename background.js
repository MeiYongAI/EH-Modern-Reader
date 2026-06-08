/**
 * Background service worker.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Modern Gallery Reader] installed');
    chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    console.log('[Modern Gallery Reader] updated');
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ensureReaderContentScript') {
    const tabId = sender && sender.tab && sender.tab.id;
    const frameId = sender && typeof sender.frameId === 'number' ? sender.frameId : 0;

    if (typeof tabId !== 'number') {
      sendResponse({ success: false, error: 'No sender tab available' });
      return false;
    }

    if (!chrome.scripting || typeof chrome.scripting.executeScript !== 'function') {
      sendResponse({ success: false, error: 'chrome.scripting is unavailable' });
      return false;
    }

    try {
      const injection = chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        files: ['i18n.js', 'content.js']
      });

      if (injection && typeof injection.then === 'function') {
        injection
          .then(() => sendResponse({ success: true }))
          .catch((error) => {
            sendResponse({
              success: false,
              error: error && error.message ? error.message : String(error)
            });
          });
        return true;
      }

      sendResponse({ success: true });
    } catch (error) {
      sendResponse({
        success: false,
        error: error && error.message ? error.message : String(error)
      });
    }
    return true;
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['readerSettings'], (result) => {
      sendResponse(result.readerSettings || {});
    });
    return true;
  }

  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({ readerSettings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
