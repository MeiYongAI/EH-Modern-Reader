(function() {
  'use strict';

  const zh = {
    appName: 'Modern Gallery Reader',
    appSubtitle: '现代化多站点漫画阅读器',
    appDescription: '面向 E-Hentai、ExHentai、nhentai 和 hitomi.la 的现代化多站点阅读器。',
    backToGallery: '返回画廊',
    loadingTitle: '加载中...',
    loading: '加载中',
    page: '第 {page} 页',
    shortcutsTitle: '快捷键',
    shortcutsHint: '快捷键: ← → 翻页 | + - 缩放 | 0 重置 | 空格 下一页',
    reverseReading: '反向阅读',
    autoPage: '自动翻页（单击开关，Alt+单击设置间隔）',
    autoScroll: '自动滚动（单击开始，Alt+单击设置速度）',
    autoScrollRunning: '自动滚动中（{speed}px/帧）- 单击停止，Alt+单击设置速度',
    autoPageRunning: '自动翻页中（{seconds}s）- 单击停止，Alt+单击设置间隔',
    fullscreen: '全屏 (F11)',
    toggleTheme: '切换主题',
    readerSettings: '阅读设置',
    closeSettings: '关闭设置',
    layoutMode: '布局',
    singleHorizontal: '横向单页',
    singleVertical: '纵向单页',
    continuousHorizontal: '横向连续',
    continuousVertical: '纵向连续',
    continuousSettings: '连续模式',
    verticalPadding: '纵向侧边留白',
    horizontalGap: '横向图片间距',
    verticalGap: '纵向图片间距',
    performance: '性能',
    preloadCount: '预加载页数',
    pagesUnit: '页',
    autoPaging: '自动翻页',
    autoInterval: '翻页间隔',
    secondsUnit: '秒',
    scrollSpeed: '自动滚动速度',
    pxPerFrameUnit: 'px/帧',
    resetSettings: '恢复默认设置',
    resetConfirm: '确定要恢复所有设置到默认值吗？',
    setScrollSpeedPrompt: '设置自动滚动速度（px/帧，支持小数，建议 2-10）',
    setPageIntervalPrompt: '设置翻页间隔（秒，支持小数）',
    missingElements: '缺少必要 DOM 元素: {items}',
    imageListEmpty: '错误：无法加载图片列表',
    imageListEmptyAlert: '无法加载图片列表，请刷新页面重试。',
    initFailedAlert: 'Modern Gallery Reader 初始化失败: {message}\n\n请刷新页面重试。',
    imagePageUrlMissing: '图片页面 URL 不存在',
    imageUrlMissing: '图片 URL 不存在',
    pageUrlMissing: '无法获取页面 URL',
    fetchPageMissing: 'fetchPageImageUrl 函数不存在',
    realImageUrlMissing: '无法获取真实图片 URL',
    realImageUrlExtractFailed: '无法从页面提取图片 URL',
    imageLoadFailed: '图片加载失败',
    imageLoadTimeout: '图片加载超时',
    unknownGallery: '未知画廊',
    previousPage: '前一页',
    currentPage: '当前页',
    nextPage: '后一页',
    previousPageTitle: '上一页 (←)',
    nextPageTitle: '下一页 (→)',
    retry: '重试',
    close: '关闭',
    launchFailed: '启动阅读器失败：{message}',
    unsupportedSite: '非目标站点',
    detecting: '检测中...',
    running: '运行中',
    extensionStatus: '扩展状态',
    currentSite: '当前站点',
    shortcuts: '快捷键',
    features: '核心功能',
    turnPage: '翻页',
    homeEnd: '首页/末页',
    toggleSidebar: '切换缩略图栏',
    exitFullscreen: '退出全屏',
    modernUi: '现代化 UI',
    darkMode: '深色模式',
    smartPreload: '智能图片预加载',
    progressMemory: '阅读进度记忆',
    responsiveLayout: '响应式布局',
    keyboardMouse: '键盘/鼠标控制',
    realLoadingProgress: '真实图片加载进度',
    multiSiteSupport: '多站点支持',
    options: '设置',
    reloadPage: '刷新页面',
    popupTagline: '现代化多站点阅读体验',
    footer: 'Made for better reading',
    optionsTitle: 'Modern Gallery Reader 设置',
    currentVersion: '当前版本:',
    builtinStrategies: '以下策略已内置，暂不提供开关。',
    debugMode: '调试模式（控制台日志）',
    debugModeTip: '开启后会在控制台输出详细日志，可能影响性能。调试问题时可临时开启。',
    thumbnailFallback: '缩略图：使用画廊小图回退',
    nlFallback: '图片失败：nl-token 镜像回退',
    keyF: '键盘：F 切换缩略图栏',
    docsLinks: '文档:',
    feedbackTip: '反馈问题时请附带控制台日志',
    welcomeTitle: '欢迎使用 Modern Gallery Reader',
    welcomeSubtitle: '现代化多站点阅读器（E-Hentai / ExHentai / nhentai / hitomi.la）',
    openE: '表站 (e-hentai.org)',
    openEx: '里站 (exhentai.org)',
    openNh: 'nhentai.net',
    openHitomi: 'hitomi.la',
    siteSupport: '支持站点',
    installation: '安装与调试',
    installStep1: '打开 chrome://extensions/',
    installStep2: '开启开发者模式',
    installStep3: '点击“加载已解压的扩展程序”并选择项目目录',
    installStep4: '修改代码后在扩展管理页点击刷新按钮',
    hitomiNote: 'hitomi.la 已修正图片 CDN 子域选择，并支持候选地址回退。',
    readReadme: '打开 README',
    openOptions: '打开设置'
  };

  const en = {
    appName: 'Modern Gallery Reader',
    appSubtitle: 'Modern multi-site manga reader',
    appDescription: 'A modern multi-site reader for E-Hentai, ExHentai, nhentai, and hitomi.la.',
    backToGallery: 'Back to gallery',
    loadingTitle: 'Loading...',
    loading: 'Loading',
    page: 'Page {page}',
    shortcutsTitle: 'Shortcuts',
    shortcutsHint: 'Shortcuts: ← → turn pages | + - zoom | 0 reset | Space next page',
    reverseReading: 'Reverse reading direction',
    autoPage: 'Auto page (click to toggle, Alt+click to set interval)',
    autoScroll: 'Auto scroll (click to start, Alt+click to set speed)',
    autoScrollRunning: 'Auto scrolling ({speed}px/frame) - click to stop, Alt+click to set speed',
    autoPageRunning: 'Auto paging ({seconds}s) - click to stop, Alt+click to set interval',
    fullscreen: 'Fullscreen (F11)',
    toggleTheme: 'Toggle theme',
    readerSettings: 'Reader Settings',
    closeSettings: 'Close settings',
    layoutMode: 'Layout',
    singleHorizontal: 'Single horizontal',
    singleVertical: 'Single vertical',
    continuousHorizontal: 'Continuous horizontal',
    continuousVertical: 'Continuous vertical',
    continuousSettings: 'Continuous Mode',
    verticalPadding: 'Vertical side padding',
    horizontalGap: 'Horizontal gap',
    verticalGap: 'Vertical gap',
    performance: 'Performance',
    preloadCount: 'Prefetch pages',
    pagesUnit: 'pages',
    autoPaging: 'Auto Paging',
    autoInterval: 'Page interval',
    secondsUnit: 'sec',
    scrollSpeed: 'Auto scroll speed',
    pxPerFrameUnit: 'px/frame',
    resetSettings: 'Reset settings',
    resetConfirm: 'Reset all settings to defaults?',
    setScrollSpeedPrompt: 'Set auto scroll speed (px/frame, decimals allowed, 2-10 recommended)',
    setPageIntervalPrompt: 'Set page interval (seconds, decimals allowed)',
    missingElements: 'Missing required DOM elements: {items}',
    imageListEmpty: 'Error: unable to load image list',
    imageListEmptyAlert: 'Unable to load the image list. Please refresh and try again.',
    initFailedAlert: 'Modern Gallery Reader failed to initialize: {message}\n\nPlease refresh and try again.',
    imagePageUrlMissing: 'Image page URL is missing',
    imageUrlMissing: 'Image URL is missing',
    pageUrlMissing: 'Unable to get page URL',
    fetchPageMissing: 'fetchPageImageUrl is missing',
    realImageUrlMissing: 'Unable to get real image URL',
    realImageUrlExtractFailed: 'Unable to extract image URL from the page',
    imageLoadFailed: 'Image failed to load',
    imageLoadTimeout: 'Image load timed out',
    unknownGallery: 'Untitled gallery',
    previousPage: 'Previous page',
    currentPage: 'Current page',
    nextPage: 'Next page',
    previousPageTitle: 'Previous page (←)',
    nextPageTitle: 'Next page (→)',
    retry: 'Retry',
    close: 'Close',
    launchFailed: 'Failed to launch reader: {message}',
    unsupportedSite: 'Unsupported site',
    detecting: 'Detecting...',
    running: 'Running',
    extensionStatus: 'Extension status',
    currentSite: 'Current site',
    shortcuts: 'Shortcuts',
    features: 'Core Features',
    turnPage: 'Turn pages',
    homeEnd: 'First/last page',
    toggleSidebar: 'Toggle thumbnail bar',
    exitFullscreen: 'Exit fullscreen',
    modernUi: 'Modern UI',
    darkMode: 'Dark mode',
    smartPreload: 'Smart image preloading',
    progressMemory: 'Reading progress memory',
    responsiveLayout: 'Responsive layout',
    keyboardMouse: 'Keyboard/mouse controls',
    realLoadingProgress: 'Real image loading progress',
    multiSiteSupport: 'Multi-site support',
    options: 'Options',
    reloadPage: 'Reload page',
    popupTagline: 'Modern multi-site reading experience',
    footer: 'Made for better reading',
    optionsTitle: 'Modern Gallery Reader Options',
    currentVersion: 'Current version:',
    builtinStrategies: 'These strategies are built in and are not configurable yet.',
    debugMode: 'Debug mode (console logs)',
    debugModeTip: 'When enabled, detailed logs are printed to the console and may affect performance. Turn it on only while debugging.',
    thumbnailFallback: 'Thumbnails: fallback to gallery thumbnails',
    nlFallback: 'Image failures: nl-token mirror fallback',
    keyF: 'Keyboard: F toggles thumbnail bar',
    docsLinks: 'Documentation:',
    feedbackTip: 'Include console logs when reporting issues',
    welcomeTitle: 'Welcome to Modern Gallery Reader',
    welcomeSubtitle: 'Modern multi-site reader (E-Hentai / ExHentai / nhentai / hitomi.la)',
    openE: 'E-Hentai',
    openEx: 'ExHentai',
    openNh: 'nhentai.net',
    openHitomi: 'hitomi.la',
    siteSupport: 'Supported Sites',
    installation: 'Install and Debug',
    installStep1: 'Open chrome://extensions/',
    installStep2: 'Enable Developer mode',
    installStep3: 'Click "Load unpacked" and choose this project folder',
    installStep4: 'After editing code, click the reload button on the extension card',
    hitomiNote: 'hitomi.la now uses the corrected image CDN subdomain and candidate URL fallback.',
    readReadme: 'Open README',
    openOptions: 'Open Options'
  };

  function detectLang() {
    const candidates = [];
    try {
      if (chrome && chrome.i18n && chrome.i18n.getUILanguage) {
        candidates.push(chrome.i18n.getUILanguage());
      }
    } catch {}
    try {
      candidates.push(navigator.language);
      if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    } catch {}
    return candidates.some((lang) => /^zh(?:-|_|$)/i.test(String(lang || ''))) ? 'zh' : 'en';
  }

  const lang = detectLang();
  const dict = lang === 'zh' ? zh : en;

  function t(key, params) {
    let text = dict[key] || en[key] || key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
      }
    }
    return text;
  }

  function applyI18n(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    if (document && document.documentElement) {
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    }
  }

  window.MGR_I18N = { lang, t, applyI18n };
})();
