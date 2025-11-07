/**
 * Popup Script - 弹出窗口逻辑
 */

(function() {
  'use strict';

  // 检测当前标签页
  function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      const siteElement = document.getElementById('current-site');
      
      if (currentTab && currentTab.url) {
        if (currentTab.url.includes('e-hentai.org/mpv/')) {
          siteElement.textContent = 'E-Hentai MPV';
          siteElement.style.color = '#4ade80';
        } else if (currentTab.url.includes('exhentai.org/mpv/')) {
          siteElement.textContent = 'ExHentai MPV';
          siteElement.style.color = '#4ade80';
        } else if (currentTab.url.includes('e-hentai.org')) {
          siteElement.textContent = 'E-Hentai';
          siteElement.style.color = '#fbbf24';
        } else if (currentTab.url.includes('exhentai.org')) {
          siteElement.textContent = 'ExHentai';
          siteElement.style.color = '#fbbf24';
        } else {
          siteElement.textContent = '非目标站点';
          siteElement.style.color = '#ef4444';
        }
      }
    });
  }

  // 刷新页面
  function reloadTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
        window.close();
      }
    });
  }

  // 打开选项页面
  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  // 初始化
  document.addEventListener('DOMContentLoaded', () => {
    checkCurrentTab();

    // 绑定按钮事件
    document.getElementById('reload-tab').addEventListener('click', reloadTab);
    document.getElementById('open-options').addEventListener('click', openOptions);
  });

})();
