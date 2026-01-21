/**
 * Background Script - 后台脚本
 * 处理扩展的后台逻辑
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[EH Modern Reader] 扩展已安装');
    
    // 显示欢迎页面
    chrome.tabs.create({
      url: 'welcome.html'
    });
  } else if (details.reason === 'update') {
    console.log('[EH Modern Reader] 扩展已更新');
  }
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
