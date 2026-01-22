(function(){
  'use strict';
  
  // 显示版本号
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
  
  // 调试模式开关
  const debugCheckbox = document.getElementById('opt-debug-mode');
  if (debugCheckbox) {
    // 读取当前设置
    chrome.storage.local.get(['eh_debug_mode'], (result) => {
      debugCheckbox.checked = result.eh_debug_mode === true;
    });
    
    // 保存设置变更
    debugCheckbox.addEventListener('change', () => {
      chrome.storage.local.set({ eh_debug_mode: debugCheckbox.checked }, () => {
        console.log('[EH Modern Reader] 调试模式:', debugCheckbox.checked ? '开启' : '关闭');
      });
    });
  }
})();
