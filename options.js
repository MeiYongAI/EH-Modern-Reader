(function() {
  'use strict';

  const i18n = window.MGR_I18N;

  document.addEventListener('DOMContentLoaded', () => {
    if (i18n && typeof i18n.applyI18n === 'function') {
      i18n.applyI18n(document);
    }

    try {
      const manifest = chrome.runtime && typeof chrome.runtime.getManifest === 'function'
        ? chrome.runtime.getManifest()
        : null;
      const versionEl = document.getElementById('ver');
      if (versionEl && manifest && manifest.version) {
        versionEl.textContent = `v${manifest.version}`;
      }
    } catch (error) {
      console.warn('[Modern Gallery Reader][options] Failed to read manifest version:', error);
    }

    const debugCheckbox = document.getElementById('opt-debug-mode');
    if (!debugCheckbox || !chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(['eh_debug_mode'], (result) => {
      debugCheckbox.checked = result.eh_debug_mode === true;
    });

    debugCheckbox.addEventListener('change', () => {
      chrome.storage.local.set({ eh_debug_mode: debugCheckbox.checked }, () => {
        console.log('[Modern Gallery Reader] Debug mode:', debugCheckbox.checked ? 'on' : 'off');
      });
    });
  });
})();
