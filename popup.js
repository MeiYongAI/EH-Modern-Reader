(function() {
  'use strict';

  const i18n = window.MGR_I18N;
  const t = (key, params) => i18n && typeof i18n.t === 'function' ? i18n.t(key, params) : key;

  function setSiteStatus(label, state) {
    const siteElement = document.getElementById('current-site');
    if (!siteElement) return;
    siteElement.textContent = label;
    siteElement.classList.remove('ok', 'warn', 'bad');
    siteElement.classList.add(state);
  }

  function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      const url = currentTab && currentTab.url ? currentTab.url : '';

      if (/e-hentai\.org\/mpv\//i.test(url)) {
        setSiteStatus('E-Hentai MPV', 'ok');
      } else if (/exhentai\.org\/mpv\//i.test(url)) {
        setSiteStatus('ExHentai MPV', 'ok');
      } else if (/e-hentai\.org/i.test(url)) {
        setSiteStatus('E-Hentai', 'warn');
      } else if (/exhentai\.org/i.test(url)) {
        setSiteStatus('ExHentai', 'warn');
      } else if (/nhentai\.(?:net|xxx)\/g\//i.test(url)) {
        setSiteStatus('nhentai Gallery', 'warn');
      } else if (/hitomi\.la/i.test(url)) {
        setSiteStatus('hitomi.la', 'warn');
      } else {
        setSiteStatus(t('unsupportedSite'), 'bad');
      }
    });
  }

  function reloadTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && typeof tabs[0].id === 'number') {
        chrome.tabs.reload(tabs[0].id);
        window.close();
      }
    });
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (i18n && typeof i18n.applyI18n === 'function') {
      i18n.applyI18n(document);
    }

    checkCurrentTab();

    const reloadButton = document.getElementById('reload-tab');
    const optionsButton = document.getElementById('open-options');
    if (reloadButton) reloadButton.addEventListener('click', reloadTab);
    if (optionsButton) optionsButton.addEventListener('click', openOptions);

    try {
      const verEl = document.getElementById('ext-version');
      const manifest = chrome.runtime.getManifest && chrome.runtime.getManifest();
      if (verEl && manifest && manifest.version) {
        verEl.textContent = `v${manifest.version}`;
      }
    } catch {}
  });
})();
