(function(){
  'use strict';
  try {
    const m = chrome.runtime && typeof chrome.runtime.getManifest === 'function'
      ? chrome.runtime.getManifest()
      : null;
    if (m && m.version) {
      const el = document.getElementById('ver');
      if (el) el.textContent = `v${m.version}`;
    }
  } catch (e) {
    console.warn('[EH Modern Reader][options] 读取版本失败:', e);
  }
})();
