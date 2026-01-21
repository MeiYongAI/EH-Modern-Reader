/**
 * Content Script - 内容脚本
 * 在 E-Hentai MPV 页面加载时注入自定义阅读器
 */

(function() {
  'use strict';

  // 防止重复注入
  if (window.ehModernReaderInjected) {
    return;
  }
  window.ehModernReaderInjected = true;

  // 屏蔽原站 MPV 脚本的异常（例如 ehg_mpv.c.js 在我们接管后仍访问已被移除的节点）
  // 优化：提前到最早时机注册，确保在原站脚本执行前就位
  try {
    const swallowErr = (ev) => {
      try {
        const src = ev && (ev.filename || (ev.error && ev.error.fileName) || '');
        const msg = (ev && (ev.message || (ev.reason && ev.reason.message))) || '';
        const stack = ev && ev.error && ev.error.stack || '';
        
        // 匹配 ehg_mpv 相关错误或 offsetTop 错误
        if ((src && /ehg_mpv/i.test(src)) || 
            /ehg_mpv/i.test(String(msg)) || 
            /offsetTop|preload_generic|preload_scroll_images|load_image/.test(msg) ||
            /ehg_mpv\.c\.js/.test(stack)) {
          // 阻止控制台报错传播
          if (ev.preventDefault) ev.preventDefault();
          if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
          // 静默处理，不输出任何日志
          return true;
        }
      } catch {}
      return false;
    };
    
    // 使用 capture 阶段捕获，优先级最高
    window.addEventListener('error', swallowErr, { capture: true, passive: false });
    window.addEventListener('unhandledrejection', swallowErr, { capture: true, passive: false });
    
    // 附加：覆盖 window.onerror 以最大化拦截
    const oldOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      const msgStr = String(message);
      const srcStr = String(source || '');
      const stackStr = error && error.stack || '';
      
      if (/ehg_mpv|offsetTop|preload_generic|preload_scroll_images/.test(msgStr) || 
          /ehg_mpv/.test(srcStr) ||
          /ehg_mpv\.c\.js/.test(stackStr)) {
        return true; // 吞掉，不显示在控制台
      }
      if (typeof oldOnError === 'function') {
        return oldOnError.apply(this, arguments);
      }
    };
    
    // 包装 console.error 过滤特定报错输出
    const origConsoleError = console.error;
    console.error = function(...args) {
      try {
        const joined = args.map(a => {
          if (typeof a === 'string') return a;
          if (a && a.message) return a.message;
          if (a && a.stack) return a.stack;
          return String(a);
        }).join(' ');
        
        if (/ehg_mpv|offsetTop|preload_generic|preload_scroll_images/.test(joined)) {
          return; // 静默，不输出到控制台
        }
      } catch {}
      return origConsoleError.apply(console, args);
    };
  } catch (e) {
    console.warn('[EH Modern Reader] 错误拦截器初始化失败:', e);
  }
  
  // 使用 MutationObserver 主动移除后续动态插入的 ehg_mpv 脚本
  // 优化：只监听 <head> 和 <body> 直接子节点，不需要 subtree: true（减少触发频率）
  let scriptBlockObserver = null;
  const startScriptBlocker = () => {
      if (scriptBlockObserver) return; // 已启动，不重复
      scriptBlockObserver = new MutationObserver(mutations => {
        try {
          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node.tagName === 'SCRIPT') {
                const src = node.getAttribute('src') || '';
                if (/ehg_mpv|mpv/.test(src)) {
                  node.type = 'javascript/blocked';
                  node.remove();
                } else if (!src && /mpvkey|preload_scroll_images|load_image/.test(node.textContent || '')) {
                  node.remove();
                }
              }
            }
          }
        } catch {}
      });
      try {
        // 只监听 <head> 和 <body> 的直接子节点，不需要递归整个 DOM
        const head = document.head;
        const body = document.body;
        if (head) scriptBlockObserver.observe(head, { childList: true });
        if (body) scriptBlockObserver.observe(body, { childList: true });
      } catch {}
    };
    // 延迟启动脚本阻止，避免初始化时干扰
    setTimeout(startScriptBlocker, 100);

  // 提取页面数据（MPV 页面脚本变量 + DOM 兜底）
  function extractPageData() {
    const pageData = {
      title: document.title || '未知画廊',
      pagecount: 0,
      imagelist: [],
      gid: '',
      mpvkey: '',
      gallery_url: ''
    };
    try {
      const scripts = Array.from(document.scripts).map(s => s.textContent || '');
      const all = scripts.join('\n');
      const mgid = all.match(/var\s+gid\s*=\s*(\d+)/);
      if (mgid) pageData.gid = mgid[1];
      const mkey = all.match(/var\s+mpvkey\s*=\s*['"]([^'"\n]+)['"]/);
      if (mkey) pageData.mpvkey = mkey[1];
      const mcount = all.match(/var\s+pagecount\s*=\s*(\d+)/);
      if (mcount) pageData.pagecount = parseInt(mcount[1], 10);
      const mtitle = all.match(/var\s+mpvtitle\s*=\s*['"]([^'"\n]+)['"]/);
      if (mtitle) pageData.title = mtitle[1];
      const mlist = all.match(/var\s+imagelist\s*=\s*(\[[\s\S]*?\]);/);
      if (mlist) {
        try { pageData.imagelist = JSON.parse(mlist[1]); } catch {}
      }
    } catch {}
    // gallery_url 兜底：DOM 链接或 referrer
    try {
      const a = document.querySelector('a[href^="/g/"], a[href*="/g/"]');
      if (a) pageData.gallery_url = new URL(a.getAttribute('href'), location.origin).href;
    } catch {}
    if (!pageData.gallery_url && document.referrer && /\/g\/\d+\//.test(document.referrer)) {
      try { pageData.gallery_url = new URL(document.referrer).href; } catch {}
    }
    if (!pageData.pagecount) pageData.pagecount = pageData.imagelist.length || 0;
    if (!pageData.title) pageData.title = '未知画廊';
    return pageData;
  }

  /**
   * 替换原页面内容
   */
  function injectModernReader(pageData) {
    // 阻止原始脚本继续运行 - 更彻底的方式
    try {
      // 移除所有原始脚本
      document.querySelectorAll('script[src*="ehg_mpv"], link[href*="ehg_mpv"]').forEach(s => s.remove());
      // 进一步移除内联脚本中含有 mpv 关键字的节点（尽力而为）
      document.querySelectorAll('script:not([src])').forEach(s => {
        try {
          const t = s.textContent || '';
          if (/mpvkey|preload_scroll_images|load_image/.test(t)) s.remove();
        } catch {}
      });
      
      // 停止页面加载
      window.stop();
    } catch (e) {
      console.warn('[EH Modern Reader] 阻止原脚本失败:', e);
    }
    
    // 禁用原脚本的全局变量（在清空 DOM 前做，避免错误）
    try {
      window.preload_generic = function() {};
      window.preload_scroll_images = function() {};
      window.load_image = function() {};
    } catch (e) {
      // 忽略错误
    }
    
    // 创建新的阅读器结构(参考JHentai,缩略图在底部)
    const readerHTML = `
      <div id="eh-reader-container">
        <!-- 顶部工具栏 -->
        <header id="eh-header">
          <div class="eh-header-left">
            <button id="eh-close-btn" class="eh-icon-btn" title="返回画廊">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 id="eh-title">${pageData.title || '加载中...'}</h1>
          </div>
          <div class="eh-header-center">
            <span id="eh-page-info" title="快捷键: ← → 翻页 | + - 缩放 | 0 重置 | 空格 下一页">1 / ${pageData.pagecount}</span>
          </div>
          <div class="eh-header-right">
            <button id="eh-reverse-btn" class="eh-icon-btn" title="反向阅读 (左右方向切换)">
              <span style="font-size: 20px; font-weight: bold;">⇄</span>
            </button>
            
            <button id="eh-auto-btn" class="eh-icon-btn" title="定时翻页 (单击开关, Alt+单击设置间隔)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v5l3 3"/>
              </svg>
            </button>
            <button id="eh-fullscreen-btn" class="eh-icon-btn" title="全屏 (F11)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            </button>
            <button id="eh-theme-btn" class="eh-icon-btn" title="切换主题">
              <!-- 初始深色模式下显示月亮，浅色模式显示太阳 -->
              <svg id="eh-theme-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
            <button id="eh-settings-btn" class="eh-icon-btn" title="阅读设置">
              <!-- Feather 风格设置图标（简洁描边，与其它图标统一） -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l0 0a2 2 0 1 1-2.83 2.83l0 0a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l0 0a2 2 0 1 1-2.83-2.83l0 0a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.67 0 1.28-.39 1.51-1 .23-.6.1-1.26-.33-1.82l0 0a2 2 0 1 1 2.83-2.83l0 0c.56.43 1.22.56 1.82.33.61-.23 1-.84 1-1.51V3a2 2 0 0 1 4 0v.09c0 .67.39 1.28 1 1.51.6.23 1.26.1 1.82-.33l0 0a2 2 0 1 1 2.83 2.83l0 0c-.43.56-.56 1.22-.33 1.82.23.61.84 1 1.51 1H21a2 2 0 0 1 0 4h-.09c-.67 0-1.28.39-1.51 1Z"></path>
              </svg>
            </button>
          </div>
        </header>

        <!-- 主内容区:图片显示 -->
        <main id="eh-main">
          <section id="eh-viewer">
            <div id="eh-image-container">
              <!-- 旧加载动画已移除，统一使用环形进度覆盖层 -->
              <!-- 图片加载进度覆盖层 -->
              <div id="eh-image-loading-overlay" class="eh-image-loading-overlay" style="display: none;">
                <div class="eh-circular-progress">
                  <!-- 使用 SVG 绘制空心环进度 -->
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <!-- 背景环 -->
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8"/>
                    <!-- 进度环 -->
                    <circle id="eh-progress-ring" cx="40" cy="40" r="32" fill="none" 
                            stroke="#FF6B9D" stroke-width="8" 
                            stroke-linecap="round"
                            stroke-dasharray="201.06 201.06"
                            stroke-dashoffset="201.06"
                            transform="rotate(-90 40 40)"
                            style="transition: stroke-dashoffset 0.15s ease"/>
                  </svg>
                </div>
                <div class="eh-loading-hint">Loading</div>
                <div id="eh-loading-page-number" class="eh-loading-page-number">Page 1</div>
              </div>
              <img id="eh-current-image" alt="当前页" />
            </div>

            <!-- 翻页按钮 -->
            <button id="eh-prev-btn" class="eh-nav-btn eh-nav-prev" title="上一页 (←)">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <button id="eh-next-btn" class="eh-nav-btn eh-nav-next" title="下一页 (→)">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </section>
        </main>

        <!-- 底部菜单(缩略图+进度条+快捷按钮) -->
        <footer id="eh-bottom-menu" class="eh-bottom-menu">
          <!-- 缩略图横向滚动区 -->
          <div id="eh-thumbnails-container" class="eh-thumbnails-container">
            <div id="eh-thumbnails" class="eh-thumbnails-horizontal"></div>
          </div>

          <!-- 进度条区 -->
          <div class="eh-slider-container">
            <span id="eh-progress-current" class="eh-progress-number">1</span>
            <div class="eh-slider-track" id="eh-slider-track">
              <div class="eh-slider-fill" id="eh-slider-fill"></div>
              <input 
                type="range" 
                id="eh-progress-bar" 
                min="1" 
                max="${pageData.pagecount}" 
                value="1" 
                class="eh-progress-slider"
              />
            </div>
            <span id="eh-progress-total" class="eh-progress-number">${pageData.pagecount}</span>
          </div>
        </footer>

        <!-- 设置面板 -->
        <div id="eh-settings-panel" class="eh-panel eh-hidden">
          <div class="eh-panel-content">
            <div class="eh-panel-header">
              <h3>阅读设置</h3>
              <button id="eh-settings-close" class="eh-panel-close" title="关闭设置">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <!-- 布局设置 -->
            <div class="eh-setting-group">
              <div class="eh-setting-label-group">布局模式</div>
              <div class="eh-setting-item">
                <div class="eh-radio-group">
                  <label class="eh-radio-label">
                    <input type="radio" name="eh-read-mode-radio" value="single" checked>
                    <span>横向单页</span>
                  </label>
                  <label class="eh-radio-label">
                    <input type="radio" name="eh-read-mode-radio" value="single-vertical">
                    <span>单页竖向</span>
                  </label>
                  <label class="eh-radio-label">
                    <input type="radio" name="eh-read-mode-radio" value="continuous-horizontal">
                    <span>横向连续</span>
                  </label>
                  <label class="eh-radio-label">
                    <input type="radio" name="eh-read-mode-radio" value="continuous-vertical">
                    <span>纵向连续</span>
                  </label>
                </div>
              </div>
            </div>
            
            <!-- 纵向连续专属设置 -->
            <div class="eh-setting-group" id="eh-vertical-settings">
              <div class="eh-setting-label-group">纵向连续专属</div>
              <div class="eh-setting-item">
                <label for="eh-vertical-padding">侧边留白</label>
                <div class="eh-slider-wrapper">
                  <input type="range" id="eh-vertical-padding" min="0" max="1000" step="4" value="12" class="eh-slider">
                  <span class="eh-slider-value"><span id="eh-vertical-padding-value">12</span> px</span>
                </div>
              </div>
            </div>
            
            <!-- 性能设置 -->
            <div class="eh-setting-group">
              <div class="eh-setting-label-group">性能优化</div>
              <div class="eh-setting-item">
                <label for="eh-preload-count">预加载页数</label>
                <div class="eh-slider-wrapper">
                  <input type="range" id="eh-preload-count" min="0" max="10" step="1" value="2" class="eh-slider">
                  <span class="eh-slider-value"><span id="eh-preload-count-value">2</span> 页</span>
                </div>
              </div>
            </div>

            <!-- 自动翻页设置 -->
            <div class="eh-setting-group">
              <div class="eh-setting-label-group">自动翻页</div>
              <div class="eh-setting-item">
                <label for="eh-auto-interval">翻页间隔</label>
                <div class="eh-slider-wrapper">
                  <input type="range" id="eh-auto-interval" min="1" max="60" step="0.5" value="3" class="eh-slider">
                  <span class="eh-slider-value"><span id="eh-auto-interval-value">3.0</span> 秒</span>
                </div>
              </div>
              <div class="eh-setting-item">
                <label for="eh-scroll-speed">自动滚动速度</label>
                <div class="eh-slider-wrapper">
                  <input type="range" id="eh-scroll-speed" min="0.1" max="5" step="0.1" value="0.5" class="eh-slider">
                  <span class="eh-slider-value"><span id="eh-scroll-speed-value">0.5</span> px/帧</span>
                </div>
              </div>
            </div>
            
            <!-- 恢复默认设置 -->
            <div class="eh-setting-group" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
              <button id="eh-reset-settings" class="eh-reset-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
                恢复默认设置
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 优化 DOM 重建：先清空再插入，避免浏览器处理原站脚本
    // 使用 requestAnimationFrame 延迟清空，让浏览器先渲染加载指示
    requestAnimationFrame(() => {
      // 清空原页面内容（但保留 body 元素本身）
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
      document.body.className = 'eh-modern-reader';
      
      // 使用 insertAdjacentHTML 而不是 innerHTML，性能更好
      document.body.insertAdjacentHTML('beforeend', readerHTML);
      
      // 立即初始化 CSS 加载
      loadReaderCSS();
    });
    
    function loadReaderCSS() {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('style/reader.css');
      document.head.appendChild(link);

      // 等待 CSS 加载完成后初始化阅读器
      const onCSSLoad = () => {
        console.log('[EH Modern Reader] CSS 加载完成');
        initializeReader(pageData);
      };
      
      link.onload = onCSSLoad;
      // 如果 CSS 加载失败，仍然初始化
      link.onerror = () => {
        console.warn('[EH Modern Reader] CSS 加载失败，使用默认样式');
        onCSSLoad();
      };
    }
  }

  /**
   * 初始化阅读器功能
   */
  function initializeReader(pageData) {
    if (window.__EH_READER_INIT) {
      console.warn('[EH Modern Reader] 已初始化，跳过重复执行');
      return;
    }
    window.__EH_READER_INIT = true;
    console.log('[EH Modern Reader] 初始化阅读器');
    console.log('[EH Modern Reader] 页面数:', pageData.pagecount);
    console.log('[EH Modern Reader] 图片列表长度:', pageData.imagelist?.length);
    console.log('[EH Modern Reader] 第一张图片数据示例:', pageData.imagelist?.[0]);
    console.log('[EH Modern Reader] GID:', pageData.gid);

    // 验证必要数据
    if (!pageData.imagelist || pageData.imagelist.length === 0) {
      console.error('[EH Modern Reader] 图片列表为空');
      alert('错误：无法加载图片列表');
      return;
    }

    if (!pageData.pagecount || pageData.pagecount === 0) {
      console.error('[EH Modern Reader] 页面数为 0');
      return;
    }

    // 阅读器状态
    const galleryId = pageData.gid || window.location.pathname.split('/')[2];
    // 默认设置
    const DEFAULT_SETTINGS = {
      prefetchAhead: 2,
      autoIntervalMs: 3000,
      scrollSpeed: 0.5,
      verticalSidePadding: 12,
      readMode: 'single',
      reverse: false
    };
    
    // 从 localStorage 加载设置
    function loadSettings() {
      try {
        const saved = localStorage.getItem('eh_reader_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            prefetchAhead: parsed.prefetchAhead ?? DEFAULT_SETTINGS.prefetchAhead,
            autoIntervalMs: parsed.autoIntervalMs ?? DEFAULT_SETTINGS.autoIntervalMs,
            scrollSpeed: parsed.scrollSpeed ?? DEFAULT_SETTINGS.scrollSpeed,
            verticalSidePadding: parsed.verticalSidePadding ?? DEFAULT_SETTINGS.verticalSidePadding,
            readMode: parsed.readMode ?? DEFAULT_SETTINGS.readMode,
            reverse: parsed.reverse ?? DEFAULT_SETTINGS.reverse
          };
        }
      } catch (e) {
        console.warn('[EH Modern Reader] 加载设置失败:', e);
      }
      return { ...DEFAULT_SETTINGS };
    }
    
    // 保存设置到 localStorage
    function saveSettings() {
      try {
        const settings = {
          prefetchAhead: state.settings.prefetchAhead,
          autoIntervalMs: state.autoPage.intervalMs,
          scrollSpeed: state.autoPage.scrollSpeed,
          verticalSidePadding: state.settings.verticalSidePadding,
          readMode: state.settings.readMode,
          reverse: state.settings.reverse
        };
        localStorage.setItem('eh_reader_settings', JSON.stringify(settings));
      } catch (e) {
        console.warn('[EH Modern Reader] 保存设置失败:', e);
      }
    }

    // 从 localStorage 加载设置并应用
    const savedSettings = loadSettings();
    
    const state = {
      currentPage: 1,
      pageCount: pageData.pagecount,
      imagelist: pageData.imagelist,
      galleryId: galleryId,
      imageCache: new Map(),
      imageRequests: new Map(),
      thumbnailObserver: null,
    draggingProgress: false,
      settings: {
        menuVisible: false,
        darkMode: true,
        imageScale: 1,
        imageOffsetX: 0,
        imageOffsetY: 0,
        readMode: savedSettings.readMode,
        prefetchAhead: savedSettings.prefetchAhead,
            reverse: savedSettings.reverse,
            verticalSidePadding: savedSettings.verticalSidePadding
      },
      autoPage: {
        running: false,
        intervalMs: savedSettings.autoIntervalMs,
        timer: null,
        scrollSpeed: savedSettings.scrollSpeed
      }
    };
    // 比例缓存：pageIndex -> ratio （从真实 URL 中解析或已加载图）
    const ratioCache = new Map();

    // 读取/保存进度（关闭阅读记忆：总是从第1页开始，且不写入存储）
    function loadProgress() { return 1; }
    function saveProgress(page) { /* no-op: disabled progress memory */ }

    // 获取 DOM 元素（带判空）
    const elements = {
      currentImage: document.getElementById('eh-current-image'),
  // loading: 已移除旧的加载动画
      pageInfo: document.getElementById('eh-page-info'),
      progressBar: document.getElementById('eh-progress-bar'),
      sliderTrack: document.getElementById('eh-slider-track'),
      sliderFill: document.getElementById('eh-slider-fill'),
      thumbnails: document.getElementById('eh-thumbnails'),
      bottomMenu: document.getElementById('eh-bottom-menu'),
      viewer: document.getElementById('eh-viewer'),
      prevBtn: document.getElementById('eh-prev-btn'),
      nextBtn: document.getElementById('eh-next-btn'),
      closeBtn: document.getElementById('eh-close-btn'),
      themeBtn: document.getElementById('eh-theme-btn'),
      fullscreenBtn: document.getElementById('eh-fullscreen-btn'),
    settingsBtn: document.getElementById('eh-settings-btn'),
  autoBtn: document.getElementById('eh-auto-btn'),
    // thumbnailsToggleBtn: 已移除
      reverseBtn: document.getElementById('eh-reverse-btn'),
      settingsPanel: document.getElementById('eh-settings-panel'),
      settingsCloseBtn: document.getElementById('eh-settings-close'),
      resetSettingsBtn: document.getElementById('eh-reset-settings'),
      resetSettingsBtn: document.getElementById('eh-reset-settings'),
      
  readModeRadios: document.querySelectorAll('input[name="eh-read-mode-radio"]'),
  preloadCountInput: document.getElementById('eh-preload-count'),
  autoIntervalInput: document.getElementById('eh-auto-interval'),
  scrollSpeedInput: document.getElementById('eh-scroll-speed'),
  verticalPaddingInput: document.getElementById('eh-vertical-padding'),
      
      // 滑块数值显示元素
      preloadCountValue: document.getElementById('eh-preload-count-value'),
      autoIntervalValue: document.getElementById('eh-auto-interval-value'),
      scrollSpeedValue: document.getElementById('eh-scroll-speed-value'),
      verticalPaddingValue: document.getElementById('eh-vertical-padding-value'),
      
      // 图片加载进度指示器元素
      imageLoadingOverlay: document.getElementById('eh-image-loading-overlay'),
      progressRing: document.getElementById('eh-progress-ring'),
      progressText: document.getElementById('eh-progress-text'),
      loadingPageNumber: document.getElementById('eh-loading-page-number')
    };
    // 验证必要的 DOM 元素
    const requiredElements = ['currentImage', 'viewer', 'thumbnails'];
    const missingElements = requiredElements.filter(key => !elements[key]);
    if (missingElements.length > 0) {
      throw new Error(`缺少必要的 DOM 元素: ${missingElements.join(', ')}`);
    }

    // 隐藏旧的左右小圆翻页按钮，改用左右区域点击
    try {
      if (elements.prevBtn) { elements.prevBtn.style.display = 'none'; elements.prevBtn.setAttribute('aria-hidden', 'true'); }
      if (elements.nextBtn) { elements.nextBtn.style.display = 'none'; elements.nextBtn.setAttribute('aria-hidden', 'true'); }
    } catch {}

    // 同步 UI 的阅读模式单选按钮到状态
    if (elements.readModeRadios && elements.readModeRadios.length > 0) {
      try {
        elements.readModeRadios.forEach(radio => {
          if (radio.value === state.settings.readMode) radio.checked = true;
        });
      } catch {}
    }

    // 同步反向按钮的状态
    function updateReverseBtn() {
      if (elements.reverseBtn) {
        if (state.settings.reverse) {
          elements.reverseBtn.classList.add('eh-active');
        } else {
          elements.reverseBtn.classList.remove('eh-active');
        }
      }
    }
    updateReverseBtn();

    // 同步定时翻页和滚动速度输入框到状态
    if (elements.autoIntervalInput) {
      elements.autoIntervalInput.value = (state.autoPage.intervalMs || 3000) / 1000;
      if (elements.autoIntervalValue) {
        elements.autoIntervalValue.textContent = ((state.autoPage.intervalMs || 3000) / 1000).toFixed(1);
      }
    }
    if (elements.scrollSpeedInput) {
      elements.scrollSpeedInput.value = state.autoPage.scrollSpeed || 0.5;
      if (elements.scrollSpeedValue) {
        elements.scrollSpeedValue.textContent = (state.autoPage.scrollSpeed || 0.5).toFixed(1);
      }
    }
    if (elements.verticalPaddingInput) {
      elements.verticalPaddingInput.value = state.settings.verticalSidePadding || 12;
      if (elements.verticalPaddingValue) {
        elements.verticalPaddingValue.textContent = state.settings.verticalSidePadding || 12;
      }
    }
    if (elements.preloadCountInput) {
      elements.preloadCountInput.value = state.settings.prefetchAhead || 2;
      if (elements.preloadCountValue) {
        elements.preloadCountValue.textContent = state.settings.prefetchAhead || 2;
      }
    }

    // 旧 showLoading/hideLoading 已废弃，保留空实现避免引用报错
    function showLoading() {}
    function hideLoading() {}

    // 显示错误信息和重试按钮
    function showErrorMessage(pageNum, errorMsg) {
      hideLoading();
      
      // 如果图片容器存在，隐藏它
      if (elements.currentImage) {
        elements.currentImage.style.display = 'none';
      }
      
      // 创建或获取错误提示容器
      let errorContainer = document.getElementById('eh-reader-error-container');
      if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'eh-reader-error-container';
        errorContainer.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          color: #fff;
          padding: 30px;
          border-radius: 8px;
          text-align: center;
          z-index: 10001;
          max-width: 500px;
        `;
        document.body.appendChild(errorContainer);
      }
      
      // 设置错误信息
      errorContainer.innerHTML = `
        <div style="font-size: 18px; margin-bottom: 10px;">⚠️ 图片加载失败</div>
        <div style="font-size: 14px; margin-bottom: 5px;">第 ${pageNum} 页</div>
        <div style="font-size: 12px; color: #aaa; margin-bottom: 20px;">${errorMsg}</div>
        <button id="eh-reader-retry-btn" style="
          background: #007bff;
          color: #fff;
          border: none;
          padding: 10px 30px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          margin-right: 10px;
        ">重试</button>
        <button id="eh-reader-close-error-btn" style="
          background: #6c757d;
          color: #fff;
          border: none;
          padding: 10px 30px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        ">关闭</button>
      `;
      
      errorContainer.style.display = 'block';
      
      // 绑定重试按钮
      const retryBtn = document.getElementById('eh-reader-retry-btn');
      if (retryBtn) {
        retryBtn.onclick = () => {
          errorContainer.style.display = 'none';
          // 清除缓存并重新加载
          state.imageCache.delete(pageNum - 1);
          scheduleShowPage(pageNum, { force: true });
        };
      }
      
      // 绑定关闭按钮
      const closeBtn = document.getElementById('eh-reader-close-error-btn');
      if (closeBtn) {
        closeBtn.onclick = () => {
          errorContainer.style.display = 'none';
        };
      }
    }

    // 隐藏错误信息
    function hideErrorMessage() {
      const errorContainer = document.getElementById('eh-reader-error-container');
      if (errorContainer) {
        errorContainer.style.display = 'none';
      }
    }

    // ==================== 图片加载进度指示器 ====================
    
    // 进度指示器隐藏动画的定时器ID
    let hideProgressTimer = null;
    
    // 显示图片加载进度覆盖层
    function showImageLoadingProgress(pageNum) {
      if (!elements.imageLoadingOverlay) return;
      
      // 取消之前的隐藏定时器（如果存在）
      if (hideProgressTimer) {
        clearTimeout(hideProgressTimer);
        hideProgressTimer = null;
      }
      
      // 立即移除淡出动画并显示
      elements.imageLoadingOverlay.classList.remove('eh-fade-out');
      elements.imageLoadingOverlay.style.display = 'flex';
      
      // 重置进度为 0
      updateImageLoadingProgress(0);
      
      // 更新页码
      if (elements.loadingPageNumber) {
        elements.loadingPageNumber.textContent = `Page ${pageNum}`;
      }
      
      console.log('[EH Loading Progress] 显示进度指示器, 页面:', pageNum);
    }
    
    // 更新图片加载进度 (0-1)
    function updateImageLoadingProgress(progress) {
      if (!elements.progressRing) return;
      
      // 确保进度在 0-1 范围内
      const clampedProgress = Math.max(0.01, Math.min(1, progress));
      const percentage = Math.round(clampedProgress * 100);
      
      // SVG 圆环周长计算: 2 * π * r = 2 * 3.1416 * 32 ≈ 201.06
      const circumference = 201.06;
      const offset = circumference * (1 - clampedProgress);
      
      // 更新 stroke-dashoffset 控制空心环进度显示
      elements.progressRing.style.strokeDashoffset = offset;
      
      // 可选：如存在进度文本元素则更新（当前版本已移除该元素）
      if (elements.progressText) {
        elements.progressText.textContent = `${percentage}%`;
      }
    }
    
    // 隐藏图片加载进度覆盖层
    function hideImageLoadingProgress() {
      if (!elements.imageLoadingOverlay) return;
      
      // 取消之前的隐藏定时器（如果存在）
      if (hideProgressTimer) {
        clearTimeout(hideProgressTimer);
        hideProgressTimer = null;
      }
      
      // 添加淡出动画
      elements.imageLoadingOverlay.classList.add('eh-fade-out');
      
      // 动画结束后隐藏
      hideProgressTimer = setTimeout(() => {
        if (elements.imageLoadingOverlay) {
          elements.imageLoadingOverlay.style.display = 'none';
        }
        hideProgressTimer = null;
      }, 300);
      
      console.log('[EH Loading Progress] 隐藏进度指示器');
    }


    // 获取图片 URL - E-Hentai MPV 使用 API 动态加载
    function getSiteOrigin() {
      try {
        if (pageData && pageData.gallery_url) {
          return new URL(pageData.gallery_url).origin;
        }
      } catch {}
      try { return location.origin; } catch {}
      return 'https://e-hentai.org';
    }
    function getImageUrl(pageIndex) {
      const imageData = state.imagelist[pageIndex];
      if (!imageData) return null;
      const base = getSiteOrigin();
      
      // E-Hentai MPV 格式: {n: 'filename', k: 'key', t: 'thumbnail'}
      // 我们需要使用 E-Hentai API 来获取完整图片
      if (typeof imageData === 'object' && imageData.k) {
        // 返回图片页面 URL，让浏览器处理加载
        return `${base}/s/${imageData.k}/${pageData.gid}-${pageIndex + 1}`;
      }
      
      // 兼容其他格式
      if (Array.isArray(imageData)) {
        if (typeof imageData[0] === 'string' && imageData[0].startsWith('http')) {
          return imageData[0];
        }
        const key = imageData[0];
        return `${base}/s/${key}/${pageData.gid}-${pageIndex + 1}`;
      }
      
      if (typeof imageData === 'object') {
        return imageData.url || imageData.src || imageData.u || imageData.s;
      }
      
      if (typeof imageData === 'string' && imageData.startsWith('http')) {
        return imageData;
      }
      
      console.error('[EH Modern Reader] 无法解析图片数据:', imageData);
      return null;
    }
    
    // 真实图片 URL 缓存与请求复用（增加会话级持久化，提升二次进入速度）
    const realUrlCache = new Map(); // pageIndex -> url
    const realUrlRequests = new Map(); // pageIndex -> {promise, controller}
    const realUrlFallbackToken = new Map(); // pageIndex -> nl token (用于失败时切换镜像)
    const persistentCacheKey = () => {
      // 使用 gid + mpvkey 组合减少误命中；缺失则仅用路径
      const gid = pageData.gid || 'nogid';
      const mpvkey = pageData.mpvkey || 'nokey';
      return `eh_mpv_realurl_${gid}_${mpvkey}`;
    };
    const REALURL_TTL = 24 * 60 * 60 * 1000; // 24h，可视为长期缓存，直到手动清理
    function preconnectToOrigin(sampleUrl) {
      try {
        const origin = new URL(sampleUrl).origin;
        if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
          const l = document.createElement('link');
          l.rel = 'preconnect';
          l.href = origin;
          l.crossOrigin = 'anonymous';
          document.head.appendChild(l);
          console.log('[EH Modern Reader] 预连接图片域名:', origin);
        }
      } catch {}
    }
    // 恢复持久缓存（localStorage 优先，回退 sessionStorage），含 TTL
    try {
      let payload = null;
      const ls = localStorage.getItem(persistentCacheKey());
      if (ls) {
        try { payload = JSON.parse(ls); } catch {}
      } else {
        const ss = sessionStorage.getItem(persistentCacheKey());
        if (ss) { try { payload = { ts: Date.now(), arr: JSON.parse(ss) }; } catch {} }
      }
      if (payload && Array.isArray(payload.arr)) {
        if (!payload.ts || (Date.now() - payload.ts) < REALURL_TTL) {
          payload.arr.forEach((u, idx) => { if (typeof u === 'string' && u.startsWith('http')) realUrlCache.set(idx, u); });
          console.log('[EH Modern Reader] 恢复真实图片URL缓存数量:', realUrlCache.size);
          for (let i = 0; i < payload.arr.length; i++) { const u = payload.arr[i]; if (typeof u === 'string' && u.startsWith('http')) { preconnectToOrigin(u); break; } }
        }
      }
    } catch (e) { console.warn('[EH Modern Reader] 恢复真实图片URL缓存失败', e); }
    function persistRealUrlCacheLater() {
      // 轻量节流：批量写入，避免每张图片写 sessionStorage
      if (persistRealUrlCacheLater.timer) clearTimeout(persistRealUrlCacheLater.timer);
      persistRealUrlCacheLater.timer = setTimeout(() => {
        try {
          const maxSave = 1000; // 限制保存数量，减小体积
          const arr = [];
          for (let i = 0; i < Math.min(state.pageCount, maxSave); i++) {
            arr[i] = realUrlCache.get(i) || null;
          }
          const payload = { ts: Date.now(), arr };
          try { localStorage.setItem(persistentCacheKey(), JSON.stringify(payload)); } catch {}
          // 兼容旧版本：继续写 sessionStorage（不带 ts）
          try { sessionStorage.setItem(persistentCacheKey(), JSON.stringify(arr)); } catch {}
        } catch (e) { console.warn('[EH Modern Reader] 持久化真实图片URL缓存失败', e); }
      }, 400); // 400ms 聚合
    }

    async function ensureRealImageUrl(pageIndex) {
      if (realUrlCache.has(pageIndex)) {
        return { url: realUrlCache.get(pageIndex), controller: null };
      }
      const pageUrl = getImageUrl(pageIndex);
      if (!pageUrl) throw new Error('图片页面 URL 不存在');
      const inflight = realUrlRequests.get(pageIndex);
      if (inflight) return inflight.promise;
      const controller = new AbortController();
      const promise = fetchRealImageUrlAndToken(pageUrl, controller.signal)
        .then(({ url, nlToken }) => {
          realUrlCache.set(pageIndex, url);
          if (nlToken) realUrlFallbackToken.set(pageIndex, nlToken);
          persistRealUrlCacheLater();
          preconnectToOrigin(url);
          // 解析 URL 中可能的宽高信息, 形如 ...-1280-1523-xxx 或 -3000-3000-png
          try {
            const sizeMatch = url.match(/-(\d{2,5})-(\d{2,5})-(?:jpg|jpeg|png|gif|webp)/i) || url.match(/-(\d{2,5})-(\d{2,5})-(?:png|jpg|webp|gif)/i);
            if (sizeMatch) {
              const w = parseInt(sizeMatch[1]);
              const h = parseInt(sizeMatch[2]);
              if (w > 0 && h > 0) {
                const r = Math.max(0.2, Math.min(5, w / h));
                ratioCache.set(pageIndex, r);
                // 若已进入横向模式且该 wrapper 仍是骨架, 立即更新占位比
                const imgEl = document.querySelector(`#eh-continuous-horizontal img[data-page-index="${pageIndex}"]`);
                if (imgEl) {
                  const wrap = imgEl.closest('.eh-ch-wrapper');
                  if (wrap && wrap.classList.contains('eh-ch-skeleton')) {
                    wrap.style.setProperty('--eh-aspect', String(r));
                  }
                }
              }
            }
          } catch {}
          realUrlRequests.delete(pageIndex);
          return { url, controller };
        })
        .catch(e => {
          realUrlRequests.delete(pageIndex);
          throw e;
        });
      realUrlRequests.set(pageIndex, { promise, controller });
      return promise;
    }

    // 预取队列（限制并发、可取消）
    const prefetch = { queue: [], running: 0, max: 2, controllers: new Map() }; // 降低并发从3到2
    function cancelPrefetchExcept(targetIndex) {
      prefetch.controllers.forEach((ctl, idx) => {
        if (idx !== targetIndex && ctl) { try { ctl.abort('prefetch-cancel'); } catch {}
        }
      });
      prefetch.queue = prefetch.queue.filter(it => it.pageIndex === targetIndex);
    }
    function startNextPrefetch() {
      while (prefetch.running < prefetch.max && prefetch.queue.length > 0) {
        const item = prefetch.queue.shift();
        const idx = item.pageIndex;
        const cached = state.imageCache.get(idx);
        if (cached && (cached.status === 'loaded' || cached.status === 'loading')) continue; // 跳过正在加载的
        prefetch.running++;
        const ctl = new AbortController();
        prefetch.controllers.set(idx, ctl);
        ensureRealImageUrl(idx)
          .then(({ url }) => {
            if (ctl.signal.aborted) throw new DOMException('aborted','AbortError');
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = (e) => reject(e);
              img.src = url;
            }).then(img => {
              if (ctl.signal.aborted) throw new DOMException('aborted','AbortError');
              state.imageCache.set(idx, { status: 'loaded', img });
            });
          })
          .catch(e => {
            if (!(e && e.name === 'AbortError')) {
              state.imageCache.set(idx, { status: 'error' });
            }
          })
          .finally(() => {
            prefetch.controllers.delete(idx);
            prefetch.running--;
            startNextPrefetch();
          });
      }
    }
    function enqueuePrefetch(indices, prioritize = false) {
      if (!indices || indices.length === 0) return;
      
      console.log('[EH Prefetch] 预取请求:', indices, '优先级:', prioritize);
      
      const queued = new Set(prefetch.queue.map(i => i.pageIndex));
      indices.forEach(idx => {
        if (idx < 0 || idx >= state.pageCount) return;
        const cached = state.imageCache.get(idx);
        if (cached?.status === 'loaded') {
          console.log('[EH Prefetch] 跳过已缓存:', idx);
          return;
        }
        if (!queued.has(idx)) {
          if (prioritize) prefetch.queue.unshift({ pageIndex: idx });
          else prefetch.queue.push({ pageIndex: idx });
          queued.add(idx);
          console.log('[EH Prefetch] 加入队列:', idx);
        }
      });
      startNextPrefetch();
    }
    
    // 从 E-Hentai 图片页面提取真实图片 URL + 备用 nl token
    async function fetchRealImageUrlAndToken(pageUrl, signal) {
      try {
        console.log('[EH Modern Reader] 开始获取图片页面:', pageUrl);
        
        const response = await fetch(pageUrl, {
          signal,
          credentials: 'include',
          mode: 'cors',
          referrer: location.href,
          referrerPolicy: 'strict-origin-when-cross-origin'
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        console.log('[EH Modern Reader] 页面 HTML 长度:', html.length);
        
        // 从页面中提取图片 URL (主要方法)
        const match = html.match(/<img[^>]+id="img"[^>]+src="([^"]+)"/);
        let foundUrl = null;
        if (match && match[1]) {
          foundUrl = match[1];
          console.log('[EH Modern Reader] 找到图片 URL (方法1):', foundUrl);
        }
        
        // 尝试备用匹配模式
        if (!foundUrl) {
          const match2 = html.match(/src="(https?:\/\/[^\"]+\.(?:jpg|jpeg|png|gif|webp)[^\"]*)"/i);
          if (match2 && match2[1]) {
            foundUrl = match2[1];
            console.log('[EH Modern Reader] 找到图片 URL (方法2):', foundUrl);
          }
        }
        
        // 尝试直接匹配 URL
        if (!foundUrl) {
          const match3 = html.match(/(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp))/i);
          if (match3 && match3[1]) {
            foundUrl = match3[1];
            console.log('[EH Modern Reader] 找到图片 URL (方法3):', foundUrl);
          }
        }

        // 提取 nl 备用令牌
        let nlToken = null;
        try {
          const nlMatch = html.match(/nl\(['"]([^'\"]+)['"]\)/i) || html.match(/id=['"]loadfail['"][^>]*onclick=['"][^'"]*nl\(['"]([^'\"]+)['"]\)/i);
          if (nlMatch && nlMatch[1]) nlToken = nlMatch[1];
        } catch {}
        
        if (foundUrl) return { url: foundUrl, nlToken };
        
        console.error('[EH Modern Reader] 无法从页面提取图片 URL');
        console.log('[EH Modern Reader] HTML 片段:', html.substring(0, 1000));
        throw new Error('无法从页面提取图片 URL');
      } catch (error) {
        console.error('[EH Modern Reader] 获取图片 URL 失败:', pageUrl, error);
        throw error;
      }
    }

    async function fetchRealImageUrlWithToken(pageUrl, nlToken, signal) {
      const url = pageUrl + (pageUrl.includes('?') ? '&' : '?') + 'nl=' + encodeURIComponent(nlToken);
      return fetchRealImageUrlAndToken(url, signal);
    }

    // 🎯 使用 Image 对象加载图片（模拟进度动画）
    // 注意：由于浏览器 CORS 限制，Content Script 中的 XMLHttpRequest 无法跨域请求图片
    // 因此使用 Image 对象加载，配合模拟的进度动画提升用户体验
    function loadImageWithProgress(imageUrl, onProgress) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const startTime = Date.now();
        let progressInterval = null;
        let currentProgress = 0;
        
        // 🎯 模拟进度更新（平滑增长曲线）
        const simulateProgress = () => {
          const elapsed = Date.now() - startTime;
          
          // 使用对数曲线模拟加载进度：快速增长后逐渐变慢
          // 0-1s: 0% -> 30%
          // 1-3s: 30% -> 60%
          // 3-5s: 60% -> 80%
          // 5s+: 80% -> 95% (永不到100%，等待真实加载完成)
          if (elapsed < 1000) {
            currentProgress = elapsed / 1000 * 0.3;
          } else if (elapsed < 3000) {
            currentProgress = 0.3 + (elapsed - 1000) / 2000 * 0.3;
          } else if (elapsed < 5000) {
            currentProgress = 0.6 + (elapsed - 3000) / 2000 * 0.2;
          } else {
            currentProgress = 0.8 + Math.min((elapsed - 5000) / 10000 * 0.15, 0.15);
          }
          
          if (onProgress) {
            onProgress(currentProgress);
          }
        };
        
        // 每100ms更新一次进度
        progressInterval = setInterval(simulateProgress, 100);
        
        img.onload = () => {
          clearInterval(progressInterval);
          // 加载完成，立即跳到100%
          if (onProgress) {
            onProgress(1.0);
          }
          console.log(`[EH Loading Progress] 图片加载完成: ${imageUrl.substring(0, 80)}...`);
          resolve(img);
        };
        
        img.onerror = (e) => {
          clearInterval(progressInterval);
          console.error('[EH Loading Progress] 图片加载失败:', imageUrl, e);
          reject(new Error('图片加载失败'));
        };
        
        // 设置超时
        const timeout = setTimeout(() => {
          clearInterval(progressInterval);
          if (!img.complete) {
            reject(new Error('图片加载超时'));
          }
        }, 60000); // 60秒超时
        
        img.onload = () => {
          clearTimeout(timeout);
          clearInterval(progressInterval);
          if (onProgress) {
            onProgress(1.0);
          }
          console.log(`[EH Loading Progress] 图片加载完成`);
          resolve(img);
        };
        
        img.src = imageUrl;
      });
    }

    // 加载图片（带重试机制）
    async function loadImage(pageIndex, retryCount = 0) {
      const MAX_RETRIES = 3;
      const TIMEOUT = 60000; // 增加到60秒
      
      try {
        // 缓存命中：直接返回
        if (state.imageCache.has(pageIndex)) {
          const cached = state.imageCache.get(pageIndex);
          if (cached.status === 'loaded' && cached.img) return cached.img;
          if (cached.status === 'loading' && cached.promise) return cached.promise;
          // 如果之前失败，清理缓存重新加载
          if (cached.status === 'error') {
            state.imageCache.delete(pageIndex);
          }
        }

        // Gallery 模式：获取单页 URL，然后像 MPV 一样抓取 HTML
        if (window.__ehGalleryBootstrap && window.__ehGalleryBootstrap.enabled) {
          console.log('[EH Modern Reader] Gallery 模式加载图片:', pageIndex);
          
          const fetchFn = window.__ehGalleryBootstrap.fetchPageImageUrl;
          if (!fetchFn) {
            throw new Error('fetchPageImageUrl 函数不存在');
          }

          // 获取单页 URL
          const pageData = await fetchFn(pageIndex);
          console.log('[EH Modern Reader] Gallery 页面数据:', pageData);

          const pageUrl = pageData.pageUrl;
          if (!pageUrl) {
            throw new Error('无法获取页面 URL');
          }

          // 更新 imagelist 中的 key
          if (window.__ehReaderData && window.__ehReaderData.imagelist[pageIndex]) {
            window.__ehReaderData.imagelist[pageIndex].k = pageData.imgkey || '';
          }

          // 使用和 MPV 相同的方式：抓取单页 HTML 提取图片 URL
          const abortController = new AbortController();
          state.imageRequests.set(pageIndex, abortController);

          const { url: imageUrl, nlToken } = await fetchRealImageUrlAndToken(pageUrl, abortController.signal);
          if (nlToken) realUrlFallbackToken.set(pageIndex, nlToken);
          
          // 🎯 使用 XMLHttpRequest 加载图片并追踪进度
          const pending = loadImageWithProgress(imageUrl, (progress) => {
            updateImageLoadingProgress(progress);
          }).then((img) => {
            console.log('[EH Modern Reader] Gallery 图片加载成功:', imageUrl);
            state.imageCache.set(pageIndex, { status: 'loaded', img });
            state.imageRequests.delete(pageIndex);
            return img;
          }).catch(async (error) => {
            console.error('[EH Modern Reader] Gallery 图片加载失败:', imageUrl, error);
            state.imageCache.delete(pageIndex);
            // 试图使用 nl 令牌切换镜像
            try {
              const token = realUrlFallbackToken.get(pageIndex);
              if (token) {
                const ac2 = new AbortController();
                const { url: altUrl } = await fetchRealImageUrlWithToken(pageUrl, token, ac2.signal);
                const img2 = await loadImageWithProgress(altUrl, (p)=>updateImageLoadingProgress(p));
                state.imageCache.set(pageIndex, { status: 'loaded', img: img2 });
                state.imageRequests.delete(pageIndex);
                return img2;
              }
            } catch (e2) {
              console.warn('[EH Modern Reader] Gallery 使用 nl 回退失败:', e2);
            }
            state.imageRequests.delete(pageIndex);
            throw new Error(`图片加载失败: ${imageUrl}`);
          });

          state.imageCache.set(pageIndex, { status: 'loading', promise: pending });
          return pending;
        }

        // MPV 模式：原有逻辑
        const pageUrl = getImageUrl(pageIndex);
        if (!pageUrl) {
          throw new Error('图片 URL 不存在');
        }

        const retryMsg = retryCount > 0 ? ` (重试 ${retryCount}/${MAX_RETRIES})` : '';
        console.log('[EH Modern Reader] 获取图片页面:', pageUrl, retryMsg);

        // 如果是 E-Hentai 的图片页面 URL，需要先获取真实图片 URL
        if (pageUrl.includes('/s/')) {
          // 为本页创建/覆盖一个 AbortController，便于取消请求
          const existing = state.imageRequests.get(pageIndex);
          if (existing && existing.controller) existing.controller.abort('navigate-cancel');
          const controller = new AbortController();
          state.imageRequests.set(pageIndex, { controller });

          const { url: realImageUrl } = await ensureRealImageUrl(pageIndex);
          if (!realImageUrl) {
            throw new Error('无法获取真实图片 URL');
          }

          console.log('[EH Modern Reader] 真实图片 URL:', realImageUrl);

          // 🎯 使用 XMLHttpRequest 加载图片并追踪进度
          const pending = loadImageWithProgress(realImageUrl, (progress) => {
            updateImageLoadingProgress(progress);
          }).then((img) => {
            console.log('[EH Modern Reader] 图片加载成功:', realImageUrl);
            state.imageCache.set(pageIndex, { status: 'loaded', img });
            return img;
          }).catch(async (error) => {
            console.error('[EH Modern Reader] 图片加载失败:', realImageUrl, error);
            state.imageCache.delete(pageIndex); // 清除缓存以便重试
            // 尝试使用 nl 令牌切换镜像一次
            try {
              const token = realUrlFallbackToken.get(pageIndex);
              if (token) {
                const controller2 = new AbortController();
                const { url: altUrl } = await fetchRealImageUrlWithToken(pageUrl, token, controller2.signal);
                realUrlCache.set(pageIndex, altUrl);
                persistRealUrlCacheLater();
                preconnectToOrigin(altUrl);
                const img2 = await loadImageWithProgress(altUrl, (p)=>updateImageLoadingProgress(p));
                state.imageCache.set(pageIndex, { status: 'loaded', img: img2 });
                return img2;
              }
            } catch (e2) {
              console.warn('[EH Modern Reader] 使用 nl 令牌回退失败:', e2);
            }
            throw new Error(`图片加载失败: ${realImageUrl}`);
          });

          state.imageCache.set(pageIndex, { status: 'loading', promise: pending });
          return pending;
        }
        
  // 如果已经是直接的图片 URL
        const pending = loadImageWithProgress(pageUrl, (progress) => {
          updateImageLoadingProgress(progress);
        }).then((img) => {
          state.imageCache.set(pageIndex, { status: 'loaded', img });
          return img;
        }).catch((error) => {
          state.imageCache.delete(pageIndex);
          throw error;
        });
        
        state.imageCache.set(pageIndex, { status: 'loading', promise: pending });
        return pending;
      } catch (error) {
        console.error('[EH Modern Reader] loadImage 错误:', error);
        
        // 自动重试机制
        if (retryCount < MAX_RETRIES) {
          console.log(`[EH Modern Reader] 将在2秒后重试... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return loadImage(pageIndex, retryCount + 1);
        }
        
        throw error;
      }
    }

    // 延时合并跳转与竞态控制
    let navTimer = null;
    let navDelay = 140; // 合并跳转延时(ms)
    let lastRequestedPage = null;
    let loadToken = 0; // 用于竞态控制
    let scrollJumping = false; // 标记正在程序化跳转
    let activeScrollAnim = null; // 横向模式自定义动画句柄

    // 固定时长的 scrollLeft 动画，统一“翻页动画手感”（JHenTai 为 200ms 缓动）
    function animateScrollLeft(el, target, opts = {}) {
      const duration = typeof opts.duration === 'number' ? opts.duration : 200; // ms
      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const to = clamp(target, 0, maxScroll);
      const from = el.scrollLeft;
      const delta = to - from;
      if (Math.abs(delta) < 0.5) {
        el.scrollLeft = to;
        return Promise.resolve();
      }
      // 取消之前的动画
      if (activeScrollAnim && typeof activeScrollAnim.cancel === 'function') {
        try { activeScrollAnim.cancel(); } catch {}
      }
      let rafId = 0;
      let cancelled = false;
      const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      scrollJumping = true;
      return new Promise((resolve) => {
        const startTs = performance.now();
        const step = (now) => {
          if (cancelled) { scrollJumping = false; resolve(); return; }
          const t = clamp((now - startTs) / duration, 0, 1);
          const eased = easeInOutCubic(t);
          el.scrollLeft = from + delta * eased;
          if (t < 1) rafId = requestAnimationFrame(step); else { scrollJumping = false; resolve(); }
        };
        rafId = requestAnimationFrame(step);
        activeScrollAnim = {
          cancel() { cancelled = true; if (rafId) cancelAnimationFrame(rafId); }
        };
      });
    }

    function scheduleShowPage(pageNum, options = {}) {
      if (pageNum < 1 || pageNum > state.pageCount) return;
      const immediate = !!options.immediate; // 用户点击等需要“立即响应”的场景（不走合并延时）
      // 连续横向模式：滚动居中目标页而不是直接替换单图
      const horizontalContainer = (state.settings.readMode === 'continuous-horizontal')
        ? document.getElementById('eh-continuous-horizontal')
        : null;
      if (horizontalContainer) {
        const idx = pageNum - 1;
        const img = horizontalContainer.querySelector(`img[data-page-index="${idx}"]`);
        if (img) {
          const wrapper = img.closest('.eh-ch-wrapper') || img.parentElement || img;
          // 计算目标居中 scrollLeft
          const allWrappers = Array.from(horizontalContainer.querySelectorAll('.eh-ch-wrapper'));
          const targetIndex = allWrappers.indexOf(wrapper);
          let cumulativeLeft = 0;
          const gap = 8; // 与容器 gap 保持一致（enterContinuousHorizontalMode 使用 8px）
          for (let i = 0; i < targetIndex; i++) {
            cumulativeLeft += allWrappers[i].clientWidth + gap;
          }
          const leftPadding = 12; // enterContinuousHorizontalMode 使用左右 12px padding
          cumulativeLeft += leftPadding;
          const basisWidth = wrapper.clientWidth || img.clientWidth || 0;
          const centerOffset = Math.max(0, (horizontalContainer.clientWidth - basisWidth) / 2);
          let targetScroll = cumulativeLeft - centerOffset;
          const maxScroll = Math.max(0, horizontalContainer.scrollWidth - horizontalContainer.clientWidth);
          targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
          console.log('[EH Modern Reader] 连续模式滚动定位 -> page=', pageNum, 'idx=', idx, 'targetIndex=', targetIndex, 'scroll=', targetScroll);
          if (options.instant) {
            scrollJumping = true;
            horizontalContainer.scrollLeft = targetScroll;
            setTimeout(() => { scrollJumping = false; }, 180);
          } else {
            horizontalContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
          }
          // 同步页码与缩略图高亮（避免等待 scroll 事件）
          state.currentPage = pageNum;
          if (elements.pageInfo) elements.pageInfo.textContent = `${pageNum} / ${state.pageCount}`;
          if (elements.progressBar) elements.progressBar.value = pageNum;
          updateThumbnailHighlight(pageNum);
          preloadAdjacentPages(pageNum);
          saveProgress(pageNum);
          // 提前加载目标与相邻图片
          const eager = [idx, idx-1, idx+1].filter(i => i >=0 && i < state.pageCount);
          enqueuePrefetch(eager, true);
          return;
        }
        // 找不到元素则回退为普通展示
      }
      
      // 连续纵向模式：滚动居中目标页
      const verticalContainer = (state.settings.readMode === 'continuous-vertical')
        ? document.getElementById('eh-continuous-vertical')
        : null;
      if (verticalContainer) {
        const idx = pageNum - 1;
        const img = verticalContainer.querySelector(`img[data-page-index="${idx}"]`);
        if (img) {
          const wrapper = img.closest('.eh-cv-wrapper') || img.parentElement || img;
          // 计算目标居中 scrollTop
          const allWrappers = Array.from(verticalContainer.querySelectorAll('.eh-cv-wrapper'));
          const targetIndex = allWrappers.indexOf(wrapper);
          let cumulativeTop = 0;
          const gap = 8;
          for (let i = 0; i < targetIndex; i++) {
            cumulativeTop += allWrappers[i].clientHeight + gap;
          }
          const topPadding = 12;
          cumulativeTop += topPadding;
          const basisHeight = wrapper.clientHeight || img.clientHeight || 0;
          const centerOffset = Math.max(0, (verticalContainer.clientHeight - basisHeight) / 2);
          let targetScroll = cumulativeTop - centerOffset;
          const maxScroll = Math.max(0, verticalContainer.scrollHeight - verticalContainer.clientHeight);
          targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
          console.log('[EH Modern Reader] 纵向连续模式滚动定位 -> page=', pageNum, 'idx=', idx, 'targetIndex=', targetIndex, 'scroll=', targetScroll);
          if (options.instant) {
            scrollJumping = true;
            verticalContainer.scrollTop = targetScroll;
            setTimeout(() => { scrollJumping = false; }, 180);
          } else {
            verticalContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
          }
          // 同步页码与缩略图高亮
          state.currentPage = pageNum;
          if (elements.pageInfo) elements.pageInfo.textContent = `${pageNum} / ${state.pageCount}`;
          if (elements.progressBar) elements.progressBar.value = pageNum;
          updateThumbnailHighlight(pageNum);
          preloadAdjacentPages(pageNum);
          saveProgress(pageNum);
          // 提前加载目标与相邻图片
          const eager = [idx, idx-1, idx+1].filter(i => i >=0 && i < state.pageCount);
          enqueuePrefetch(eager, true);
          return;
        }
        // 找不到元素则回退为普通展示
      }
      
      // 普通（单页）模式：延时合并为一次实际加载
      lastRequestedPage = pageNum;
      if (navTimer) clearTimeout(navTimer);
      navTimer = setTimeout(() => {
        navTimer = null;
        // 取消除目标页以外的正在加载请求，避免占用带宽
        state.imageRequests.forEach((entry, idx) => {
          if (idx !== lastRequestedPage - 1 && entry && entry.controller) {
            try { entry.controller.abort('navigation-switch'); } catch {}
          }
        });
        cancelPrefetchExcept(lastRequestedPage - 1);
        internalShowPage(lastRequestedPage);
      }, navDelay);
    }

    async function internalShowPage(pageNum) {
      const token = ++loadToken;
      await showPage(pageNum, token);
    }

    // 显示指定页面（带竞态令牌）
    async function showPage(pageNum, tokenCheck) {
      if (pageNum < 1 || pageNum > state.pageCount) return;
      // 重复点击相同页：若已经是当前页且图片已显示，则短路
      if (pageNum === state.currentPage && elements.currentImage && elements.currentImage.src) {
        return;
      }

      state.currentPage = pageNum;
      
      // 重置图片缩放
      resetImageZoom();
      
      // 如目标页已有缓存则跳过loading，否则仅在当前没有图片时显示加载状态
      const targetIndex = pageNum - 1;
      const cachedTarget = state.imageCache.get(targetIndex);
      const targetLoaded = cachedTarget && cachedTarget.status === 'loaded' && cachedTarget.img;
      
      // 🎯 显示进度指示器（如果图片未缓存）
      if (!targetLoaded) {
        if (!elements.currentImage || !elements.currentImage.src || elements.currentImage.style.display === 'none') {
          showLoading();
        }
        // 显示环形进度条覆盖层
        showImageLoadingProgress(pageNum);
      }

      try {
        const img = await loadImage(targetIndex);

        // 竞态检查：如果在加载期间发起了新的跳转请求，则丢弃当前结果
        if (typeof tokenCheck === 'number' && tokenCheck !== loadToken) {
          hideImageLoadingProgress(); // 取消时也要隐藏进度指示器
          return; // 丢弃过期加载
        }
        
        // 🎯 隐藏进度指示器
        hideImageLoadingProgress();
        
        // 隐藏加载状态
        hideLoading();
        
        // 隐藏错误提示（如果有）
        hideErrorMessage();
        
        // 更新图片
        if (elements.currentImage) {
          elements.currentImage.src = img.src;
          elements.currentImage.style.display = 'block';
          elements.currentImage.alt = `第 ${pageNum} 页`;
        }

        // 更新页码显示
        if (elements.pageInfo) {
          elements.pageInfo.textContent = `${pageNum} / ${state.pageCount}`;
        }

        // 更新进度条位置和两端页码
        if (elements.progressBar) {
          elements.progressBar.value = pageNum;
        }
        const progressCurrent = document.getElementById('eh-progress-current');
        if (progressCurrent) {
          progressCurrent.textContent = pageNum;
        }

        if (elements.pageInput) {
          elements.pageInput.value = pageNum;
        }

  console.log('[EH Modern Reader] 显示页面:', pageNum, '图片 URL:', img.src);

  // 更新缩略图高亮（单页模式必须）
  updateThumbnailHighlight(pageNum);

  // 保存阅读进度
  saveProgress(pageNum);

        // 预加载策略：预加载下一页和上一页（提升切换体验）
        preloadAdjacentPages(pageNum);

      } catch (error) {
        console.error('[EH Modern Reader] 加载图片失败:', error);
        
        // 🎯 隐藏进度指示器
        hideImageLoadingProgress();
        
        // 显示友好的错误信息和重试按钮
        showErrorMessage(pageNum, error.message);
      }
    }

    // 预加载相邻页面（提升切换体验）
    function preloadAdjacentPages(currentPage) {
      const indices = [];
      const ahead = state.settings.prefetchAhead || 2; // 默认预加载2页
      
      // Gallery 模式：更保守的预加载策略（仅1页前后）
      if (window.__ehGalleryBootstrap && window.__ehGalleryBootstrap.enabled) {
        // 当前页的前后各1页
        const prevIdx = currentPage - 2;
        const nextIdx = currentPage;
        if (prevIdx >= 0) indices.push(prevIdx);
        if (nextIdx < state.pageCount) indices.push(nextIdx);
        
        // 使用低优先级，避免触发风控
        if (indices.length > 0) {
          enqueuePrefetch(indices, false);
        }
        return;
      }
      
      // MPV 模式：正常预加载策略
      for (let i = 1; i <= ahead; i++) {
        const idx = currentPage - 1 + i; // 向后
        if (idx < state.pageCount) indices.push(idx);
      }
      // 向前也预加载相同数量
      for (let i = 1; i <= Math.min(ahead, 1); i++) {
        const idx = currentPage - 1 - i;
        if (idx >= 0) indices.push(idx);
      }
      
      if (indices.length > 0) {
        enqueuePrefetch(indices, false);
      }
    }

    // 更新缩略图高亮（优化性能，只操作当前和上一个）
    function updateThumbnailHighlight(pageNum) {
      const thumbnails = document.querySelectorAll('.eh-thumbnail');
      if (!thumbnails || thumbnails.length === 0) return;
      // 缩略图 DOM 顺序始终是 1,2,3...，反向阅读时用 flex-direction: row-reverse 视觉翻转
      // 因此高亮索引始终是 pageNum - 1（物理索引）
      const idx = Math.max(0, Math.min(thumbnails.length - 1, pageNum - 1));
      const currentThumb = thumbnails[idx];
      const prevActiveThumb = document.querySelector('.eh-thumbnail.active');

      // 移除旧的高亮
      if (prevActiveThumb && prevActiveThumb !== currentThumb) {
        prevActiveThumb.classList.remove('active');
      }

      // 添加新的高亮
      if (currentThumb) {
        currentThumb.classList.add('active');

        // 检查缩略图是否已在可视区域
        const container = elements.thumbnails;
        if (container) {
          const thumbRect = currentThumb.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const isVisible = (
            thumbRect.left >= containerRect.left &&
            thumbRect.right <= containerRect.right &&
            thumbRect.top >= containerRect.top &&
            thumbRect.bottom <= containerRect.bottom
          );

          // 程序化跳转时：滚动到目标并锁定观察器，随后“手动”批量加载可见范围（含两侧少量）
          if (!isVisible) {
            // 拖动进度条过程中不触发缩略图滚动，避免抖动与性能问题
            if (!state.draggingProgress) {
              thumbnailLoadQueue.setScrollLock();
              // 首次进入阅读器且有 startAt/恢复页时，使用瞬移定位，避免从 1 平滑滚到高页
              const instantFirstScroll = !state._thumbsInitialPositioned;
              if (instantFirstScroll) {
                state._thumbsInitialPositioned = true;
                // 计算居中的 scrollLeft（比 scrollIntoView 更稳定）
                try {
                  const cRect = container.getBoundingClientRect();
                  const tRect = currentThumb.getBoundingClientRect();
                  const deltaLeft = (tRect.left - cRect.left) + (tRect.width - cRect.width) / 2;
                  container.scrollLeft += deltaLeft;
                } catch {
                  currentThumb.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
                }
              } else {
                currentThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }
            }
          }

          // 无论是否已在可视区，均在短暂延迟后手动加载：目标缩略图 + 当前视口内的其他缩略图
          // 这样既不依赖 IntersectionObserver（被锁定），也避免滚动过程触发洪水请求
          const isGalleryMode = window.__ehGalleryBootstrap && window.__ehGalleryBootstrap.enabled;
          if (isGalleryMode) {
            setTimeout(() => {
              // 1) 目标页缩略图
              if (currentThumb.dataset.loaded === 'false') {
                currentThumb.dataset.loaded = 'true';
                const imageData = state.imagelist[pageNum - 1];
                thumbnailLoadQueue.add(currentThumb, imageData, pageNum);
              }
              // 2) 视口内其余缩略图（含两侧少量缓冲），最多加载 10 个，避免洪水
              manualLoadVisibleThumbnails(10, 120);
            }, 160); // 等滚动定位稳定后再取可见范围
          }
        }
      }
    }

    // 生成缩略图（懒加载优化版）
  function generateThumbnails() {
      if (!elements.thumbnails) {
        console.warn('[EH Modern Reader] 缩略图容器不存在');
        return;
      }

      // 清空容器，防止重复添加
      elements.thumbnails.innerHTML = '';
      
      // 数据校验
      if (!Array.isArray(state.imagelist) || state.imagelist.length === 0) {
        console.warn('[EH Modern Reader] 图片列表为空');
        elements.thumbnails.innerHTML = '<div style="color: rgba(255,255,255,0.6); padding: 20px; text-align: center;">暂无缩略图</div>';
        return;
      }
      
      const list = state.imagelist;
      const fragment = document.createDocumentFragment();
      
      list.forEach((imageData, iterIndex) => {
        const physicalIndex = iterIndex;
        const thumb = document.createElement('div');
        thumb.className = 'eh-thumbnail';
        thumb.dataset.page = physicalIndex + 1; // 存储页码用于懒加载
        thumb.dataset.loaded = 'false'; // 标记是否已加载
        // 提前放入一个简单占位，避免布局跳动
        const ph = document.createElement('div');
        ph.className = 'eh-thumb-placeholder';
        thumb.appendChild(ph);
        // 轻量级的首屏预览：用站点自带雪碧图片段作为背景（仅作为占位，不做精细对齐）
        if (imageData && typeof imageData.t === 'string') {
          try {
            // MPV 的 t 字段形如："(https://.../xxx.webp) -0px -284px"
            // 直接作为 background 以获得即时占位预览
            thumb.style.background = imageData.t;
            thumb.style.backgroundRepeat = 'no-repeat';
            thumb.style.backgroundColor = 'transparent';
          } catch {}
        }
        
  const displayNum = physicalIndex + 1; // 显示的页码
  const logicalPage = displayNum; // 逻辑页与 DOM 顺序一致

  // 在占位阶段就显示页码徽标，保证“未加载时也有页码”
  const badge = document.createElement('div');
  badge.className = 'eh-thumbnail-number';
  badge.textContent = String(displayNum);
  thumb.appendChild(badge);

        thumb.onclick = () => {
          // 统一逻辑页跳转
            scheduleShowPage(logicalPage, { instant: true });
        };
        
        fragment.appendChild(thumb);
      });
      
      // 一次性添加所有缩略图DOM（但不加载图片）
      elements.thumbnails.appendChild(fragment);
      
      // 设置懒加载观察器
      setupThumbnailLazyLoad();
    }
    
    // 🎯 节流工具（参考JHenTai的Throttling机制）
    function createThrottle(delay = 200) {
      let timer = null;
      let lastCall = 0;
      
      return {
        throttle(fn) {
          const now = Date.now();
          const timeSinceLastCall = now - lastCall;
          
          if (timer) {
            clearTimeout(timer);
          }
          
          // 如果距离上次调用超过delay，立即执行
          if (timeSinceLastCall >= delay) {
            lastCall = now;
            fn();
          } else {
            // 否则延迟执行
            timer = setTimeout(() => {
              lastCall = Date.now();
              timer = null;
              fn();
            }, delay - timeSinceLastCall);
          }
        },
        
        cancel() {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        }
      };
    }
    
    // 创建缩略图滚动节流器（200ms，参考JHenTai）
    const thumbnailScrollThrottle = createThrottle(200);
    
    // 请求队列管理（防止风控）
    const thumbnailLoadQueue = {
      queue: [],
      loading: new Set(),
      maxConcurrent: 3, // 最大并发数
      requestDelay: 250, // 每个请求间隔（毫秒），略微提速但保持安全
      isProgrammaticScroll: false, // 标记是否为程序触发的滚动
      scrollLockTimer: null, // 锁定计时器
      scrollAnimationFrame: null, // 滚动动画帧ID
      
      setScrollLock() {
        this.isProgrammaticScroll = true;
        
        // 取消节流器中待执行的任务
        thumbnailScrollThrottle.cancel();
        
        // 清除之前的计时器和动画帧
        if (this.scrollLockTimer) {
          clearTimeout(this.scrollLockTimer);
        }
        if (this.scrollAnimationFrame) {
          cancelAnimationFrame(this.scrollAnimationFrame);
        }
        
        // 🎯 改进：锁定期间完全禁用IntersectionObserver
        if (state.thumbnailObserver) {
          state.thumbnailObserver.disconnect();
        }
        
        // Gallery 模式：延长锁定时间到 2.5 秒（滚动动画 + 稳定时间）
        // MPV 模式：600ms（增加稳定时间）
        const isGalleryMode = window.__ehGalleryBootstrap && window.__ehGalleryBootstrap.enabled;
        const lockDuration = isGalleryMode ? 2500 : 600;
        
        console.log('[EH Scroll Lock] 锁定缩略图加载，持续', lockDuration, 'ms');
        
        this.scrollLockTimer = setTimeout(() => {
          this.isProgrammaticScroll = false;
          this.scrollLockTimer = null;
          
          // 🎯 解锁后只观察当前视口附近的缩略图（参考JHenTai的getCurrentVisibleThumbnails）
          if (state.thumbnailObserver && elements.thumbnails) {
            const container = elements.thumbnails;
            const containerRect = container.getBoundingClientRect();
            
            // 获取所有未加载的缩略图
            const allThumbnails = container.querySelectorAll('.eh-thumbnail[data-loaded="false"]');
            
            // 🎯 关键修复：只观察视口内及附近的缩略图（±300px buffer）
            const visibleThumbnails = Array.from(allThumbnails).filter(thumb => {
              const thumbRect = thumb.getBoundingClientRect();
              const isNearViewport = (
                thumbRect.right >= containerRect.left - 300 &&
                thumbRect.left <= containerRect.right + 300 &&
                thumbRect.bottom >= containerRect.top - 300 &&
                thumbRect.top <= containerRect.bottom + 300
              );
              return isNearViewport;
            });
            
            console.log(`[EH Scroll Lock] 解锁缩略图加载，重新观察 ${visibleThumbnails.length} 个视口附近的缩略图 (总计 ${allThumbnails.length} 个未加载)`);
            
            visibleThumbnails.forEach(thumb => state.thumbnailObserver.observe(thumb));
          }
        }, lockDuration);
      },
      
      add(thumb, imageData, pageNum) {
        if (this.loading.has(pageNum)) return;
        
        this.queue.push({ thumb, imageData, pageNum });
        this.process();
      },
      
      async process() {
        if (this.loading.size >= this.maxConcurrent) return;
        if (this.queue.length === 0) return;
        
        const item = this.queue.shift();
        if (!item || this.loading.has(item.pageNum)) {
          this.process();
          return;
        }
        
        this.loading.add(item.pageNum);
        
        try {
          await loadThumbnail(item.thumb, item.imageData, item.pageNum);
        } catch (err) {
          console.warn('[EH Modern Reader] 缩略图加载失败:', item.pageNum, err);
        } finally {
          this.loading.delete(item.pageNum);
          
          // 延迟后处理下一个
          setTimeout(() => {
            this.process();
          }, this.requestDelay);
        }
      },
      
      clear() {
        this.queue = [];
        this.loading.clear();
        if (this.scrollLockTimer) {
          clearTimeout(this.scrollLockTimer);
          this.scrollLockTimer = null;
        }
        this.isProgrammaticScroll = false;
      }
    };
    
    // 设置缩略图懒加载
    function setupThumbnailLazyLoad() {
      // 如果已有观察器，先断开
      if (state.thumbnailObserver) {
        state.thumbnailObserver.disconnect();
      }
      
      // 🎯 增大预加载缓冲区，避免"滚动到屏幕快结束时"才加载
      const isGalleryMode = window.__ehGalleryBootstrap && window.__ehGalleryBootstrap.enabled;
      const rootMargin = isGalleryMode ? '800px' : '1200px'; // Gallery: 800px (增大), MPV: 1200px
      
      const options = {
        root: elements.thumbnails,
        rootMargin: rootMargin,
        threshold: 0.01
      };
      
      console.log('[EH Lazy Load] 缩略图懒加载已启用, rootMargin:', rootMargin);
      
      // 🎯 IntersectionObserver 回调：不使用累积队列，直接处理
      state.thumbnailObserver = new IntersectionObserver((entries) => {
        // 🎯 关键修复：不累积，直接处理当前批次
        const currentBatch = [];
        
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 程序触发的滚动（跳页）时，忽略 IntersectionObserver 的触发
            if (thumbnailLoadQueue.isProgrammaticScroll) {
              return;
            }
            
            const thumb = entry.target;
            if (thumb.dataset.loaded === 'false') {
              currentBatch.push({ thumb, pageNum: parseInt(thumb.dataset.page) });
            }
          }
        });
        
        if (currentBatch.length === 0) return;
        
        // 🎯 立即处理，不再延迟（IntersectionObserver 本身已经有节流效果）
        console.log(`[EH Lazy Load] 批量加载 ${currentBatch.length} 个缩略图`);
        
        currentBatch.forEach(({ thumb, pageNum }) => {
          thumb.dataset.loaded = 'true';
          const imageData = state.imagelist[pageNum - 1];
          
          // 加入队列而非立即加载
          thumbnailLoadQueue.add(thumb, imageData, pageNum);
          
          // 加载后停止观察该元素
          state.thumbnailObserver.unobserve(thumb);
        });
      }, options);
      
      // 观察所有缩略图
      const thumbnails = elements.thumbnails.querySelectorAll('.eh-thumbnail');
      thumbnails.forEach(thumb => {
        state.thumbnailObserver.observe(thumb);
      });
      
      // 🎯 滚动事件使用节流（参考JHenTai的200ms节流）
      if (!isGalleryMode) {
        // MPV 模式：保留滚轮响应
        elements.thumbnails.addEventListener('wheel', (e) => {
          thumbnailScrollThrottle.throttle(() => {
            if (!thumbnailLoadQueue.isProgrammaticScroll) {
              triggerBatchLoad();
            }
          });
        }, { passive: true });
      }
      
      // 所有模式：保留拖动滚动条的响应（使用节流）
      elements.thumbnails.addEventListener('scroll', () => {
        thumbnailScrollThrottle.throttle(() => {
          if (!thumbnailLoadQueue.isProgrammaticScroll) {
            triggerBatchLoad();
          }
        });
      }, { passive: true });
    }
    
    // 批量触发可视区域及周围缩略图加载
    function triggerBatchLoad() {
      // 如果是程序触发的滚动（跳页），不执行批量加载
      if (thumbnailLoadQueue.isProgrammaticScroll) {
        return;
      }
      
      if (!elements.thumbnails || !state.thumbnailObserver) return;
      
      const container = elements.thumbnails;
      const containerRect = container.getBoundingClientRect();
      const isGalleryMode = window.__ehGalleryBootstrap && window.__ehGalleryBootstrap.enabled;
      const observeMargin = isGalleryMode ? 400 : 1500; // Gallery: 400px, MPV: 1500px
      
      // 🎯 关键修复：滚动时，先移除所有观察，然后只观察视口附近的缩略图
      // 这样可以避免 IntersectionObserver 触发加载远离当前位置的缩略图
      const allThumbnails = container.querySelectorAll('.eh-thumbnail[data-loaded="false"]');
      
      // Step 1: 停止观察所有缩略图（清空旧的观察列表）
      state.thumbnailObserver.disconnect();
      
      // Step 2: 只重新观察视口附近的缩略图
      let observedCount = 0;
      allThumbnails.forEach(thumb => {
        const thumbRect = thumb.getBoundingClientRect();
        const isNearViewport = (
          thumbRect.right >= containerRect.left - observeMargin &&
          thumbRect.left <= containerRect.right + observeMargin &&
          thumbRect.bottom >= containerRect.top - observeMargin &&
          thumbRect.top <= containerRect.bottom + observeMargin
        );
        
        if (isNearViewport) {
          state.thumbnailObserver.observe(thumb);
          observedCount++;
        }
      });
      
      if (observedCount > 0) {
        console.log(`[EH Scroll] 滚动检测，重新观察 ${observedCount} 个视口附近的缩略图 (清理了旧观察列表)`);
      }
    }

    // 手动加载当前缩略图容器“视口内”的缩略图，附带少量左右缓冲，忽略 programmatic scroll 锁
    // maxBatch：本次最多加载多少张；extraMargin：在上下文基础上扩展的像素缓冲
    function manualLoadVisibleThumbnails(maxBatch = 10, extraMargin = 120) {
      if (!elements.thumbnails) return;

      const container = elements.thumbnails;
      const containerRect = container.getBoundingClientRect();
      const start = containerRect.top - extraMargin;
      const end = containerRect.bottom + extraMargin;

      const thumbs = container.querySelectorAll('.eh-thumbnail');
      let loaded = 0;

      thumbs.forEach(thumb => {
        if (loaded >= maxBatch) return;
        if (thumb.dataset.loaded === 'true') return;

        const r = thumb.getBoundingClientRect();
        // 判断是否在扩展后的可见区域内（纵向和横向均需有交集）
        const verticalIn = r.bottom >= start && r.top <= end;
        const horizontalIn = r.right >= containerRect.left && r.left <= containerRect.right;
        if (!(verticalIn && horizontalIn)) return;

        thumb.dataset.loaded = 'true';
        const pageNum = parseInt(thumb.dataset.page);
        const imageData = state.imagelist[pageNum - 1];
        thumbnailLoadQueue.add(thumb, imageData, pageNum);
        loaded++;

        if (state.thumbnailObserver) {
          state.thumbnailObserver.unobserve(thumb);
        }
      });
    }

    // ===== 独立缩略图（基于雪碧图裁剪到 canvas，再按 contain 居中） =====
    const spriteCache = new Map(); // url -> { img, promise, tileW:200, tileH }

    function computeTileHeightForSprite(url) {
      // 从同一 sprite 的 y 偏移推断行高；取差值的众数或首个有效差值
      try {
        const ys = [];
        for (let i = 0; i < state.imagelist.length; i++) {
          const it = state.imagelist[i];
          if (!it || typeof it.t !== 'string') continue;
          const m = it.t.match(/\(?([^)]+)\)?\s+(-?\d+)(?:px)?\s+(-?\d+)(?:px)?/);
          if (m) {
            const u = m[1].replace(/^url\(['"]?|['"]?\)$/g, '').trim();
            if (u === url) {
              const y = Math.abs(parseInt(m[3] || '0'));
              if (!isNaN(y)) ys.push(y);
            }
          }
        }
        const uniq = Array.from(new Set(ys)).sort((a,b)=>a-b);
        const diffs = [];
        for (let i=1;i<uniq.length;i++) {
          const d = uniq[i]-uniq[i-1];
          if (d>0) diffs.push(d);
        }
        if (diffs.length === 0) return 267; // 回退
        // 众数
        const map = new Map();
        diffs.forEach(d=>map.set(d,(map.get(d)||0)+1));
        let best = diffs[0], cnt = 0;
        map.forEach((v,k)=>{ if (v>cnt) { cnt=v; best=k; } });
        return best || 267;
      } catch { return 267; }
    }

    function getSpriteMeta(url) {
      const hit = spriteCache.get(url);
      if (hit) return hit.promise;
      const img = new Image();
      const promise = new Promise((resolve, reject) => {
        img.onload = () => {
          const tileH = computeTileHeightForSprite(url);
          resolve({ img, tileW: 200, tileH });
        };
        img.onerror = (e) => reject(e);
      });
      img.src = url;
      const entry = { img, promise };
      spriteCache.set(url, entry);
      return promise;
    }

    function loadThumbnail(thumb, imageData, pageNum) {
      const idx = pageNum - 1;
      const title = (imageData && imageData.n) ? imageData.n : `Page ${pageNum}`;
      const containerW = 100, containerH = 142;
      
      // 🎯 雪碧图优化：兼容两种格式
      // 1) "url(https://.../sprite.webp) -200px -0px"
      // 2) "(https://.../3630904-0.webp) -0px 0" （MPV 原站格式，第二个偏移可能无 px）
      if (imageData && typeof imageData.t === 'string' && (imageData.t.includes('url(') || imageData.t.trim().startsWith('('))) {
        try {
          const raw = imageData.t.trim();
          let spriteUrl = null, offsetX = 0, offsetY = 0;
          // 格式1: url(...)
          const m1 = raw.match(/url\(['"]?([^'"()]+)['"]?\)\s*(-?\d+)px\s+(-?\d+)px/);
          if (m1) {
            spriteUrl = m1[1];
            offsetX = Math.abs(parseInt(m1[2]) || 0);
            offsetY = Math.abs(parseInt(m1[3]) || 0);
          } else {
            // 格式2: (https://... ) -0px 0   第二个偏移可能没有 px
            const m2 = raw.match(/^\(\s*([^()]+?)\s*\)\s*(-?\d+)px\s+(-?\d+)(?:px)?/);
            if (m2) {
              spriteUrl = m2[1];
              offsetX = Math.abs(parseInt(m2[2]) || 0);
              offsetY = Math.abs(parseInt(m2[3]) || 0);
            }
          }
          if (spriteUrl) {
            // 假设每个缩略图宽度200px，高度通过比例计算（E-Hentai通常是267px）
            const spriteThumbW = 200;
            const spriteThumbH = 267;
            console.log(`[EH Sprite] 页${pageNum} 使用雪碧图: ${spriteUrl}, 偏移: (${offsetX}, ${offsetY}) 原始: ${raw}`);
            
            // 加载雪碧图并裁剪
            getSpriteMeta(spriteUrl).then(({ img, tileW, tileH }) => {
              // 使用Canvas裁剪雪碧图片段（参考JHenTai的ExtendedRawImage.sourceRect）
              const canvas = document.createElement('canvas');
              canvas.width = containerW;
              canvas.height = containerH;
              const ctx = canvas.getContext('2d');
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              
              // 计算缩放比例以适应容器
              const scale = Math.min(containerW / spriteThumbW, containerH / spriteThumbH);
              const dw = Math.floor(spriteThumbW * scale);
              const dh = Math.floor(spriteThumbH * scale);
              const dx = Math.floor((containerW - dw) / 2);
              const dy = Math.floor((containerH - dh) / 2);
              
              // 从雪碧图裁剪：drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
              ctx.clearRect(0, 0, containerW, containerH);
              ctx.drawImage(
                img,
                offsetX, offsetY, spriteThumbW, spriteThumbH, // 源区域
                dx, dy, dw, dh // 目标区域
              );
              
              canvas.setAttribute('role', 'img');
              canvas.setAttribute('aria-label', `Page ${pageNum}: ${title}`);
              canvas.style.display = 'block';
              
              // 替换占位符
              thumb.style.background = 'none';
              thumb.replaceChildren();
              thumb.appendChild(canvas);
              
              const badge = document.createElement('div');
              badge.className = 'eh-thumbnail-number';
              badge.textContent = String(pageNum);
              thumb.appendChild(badge);
              
              console.log(`[EH Sprite] 页${pageNum} 雪碧图裁剪完成`);
            }).catch(err => {
              console.warn(`[EH Sprite] 页${pageNum} 雪碧图加载失败，回退到真实图:`, err);
              loadFullThumbnail(thumb, imageData, pageNum, idx, title, containerW, containerH);
            });
            
            return; // 雪碧图路径，直接返回
          }
          console.warn(`[EH Sprite] 页${pageNum} 未匹配雪碧图格式 raw="${raw}"`);
        } catch (e) {
          console.warn('[EH Sprite] 雪碧图解析失败:', e);
        }
      }

      // 回退：使用真实图片生成缩略图（与 v2.1.8 一致）
      loadFullThumbnail(thumb, imageData, pageNum, idx, title, containerW, containerH);
      return;
      
      // 回退（缓存）：若当前页主图已在缓存中，则用缓存生成缩略图；否则保留数字占位。
      const cached = state.imageCache.get(idx);
      if (cached && cached.status === 'loaded' && cached.img) {
        try {
          const img = cached.img;
          const iw = img.naturalWidth || img.width;
          const ih = img.naturalHeight || img.height;
          const scale = Math.min(containerW / iw, containerH / ih);
          const dw = Math.max(1, Math.floor(iw * scale));
          const dh = Math.max(1, Math.floor(ih * scale));
          const dx = Math.floor((containerW - dw) / 2);
          const dy = Math.floor((containerH - dh) / 2);
          const canvas = document.createElement('canvas');
          canvas.width = containerW; canvas.height = containerH;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0,0,containerW,containerH); ctx.drawImage(img, dx, dy, dw, dh);
          thumb.style.background = 'none'; thumb.replaceChildren(); thumb.appendChild(canvas);
          const badge = document.createElement('div'); badge.className='eh-thumbnail-number'; badge.textContent=String(pageNum); thumb.appendChild(badge);
          return;
        } catch {}
      }
      // 默认占位：仅显示页码
      thumb.style.background = 'none';
      thumb.replaceChildren();
      const badge = document.createElement('div');
      badge.className = 'eh-thumbnail-number';
      badge.textContent = String(pageNum);
      thumb.appendChild(badge);
    }
    
    // 提取原有的完整图片加载逻辑为独立函数
    function loadFullThumbnail(thumb, imageData, pageNum, idx, title, containerW, containerH) {
      // Gallery 模式：使用 fetchPageImageUrl 获取单页 URL
      let imageUrlPromise;
      if (window.__ehGalleryBootstrap && window.__ehGalleryBootstrap.enabled) {
        const fetchFn = window.__ehGalleryBootstrap.fetchPageImageUrl;
        if (!fetchFn) {
          console.warn('[EH Modern Reader] fetchPageImageUrl not available');
          thumb.innerHTML = `<div class="eh-thumbnail-number">${pageNum}</div>`;
          return;
        }
        
        imageUrlPromise = fetchFn(idx)
          .then(pageData =>
            fetchRealImageUrlAndToken(pageData.pageUrl, new AbortController().signal)
              .then(res => res && res.url)
          );
      } else {
        // MPV 模式：使用 ensureRealImageUrl
        imageUrlPromise = ensureRealImageUrl(idx).then(({ url }) => url);
      }
      
      // 使用真实图片生成缩略图
      imageUrlPromise
        .then(url => new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
          img.src = url;
        }))
        .then((img) => {
          const iw = img.naturalWidth || img.width;
          const ih = img.naturalHeight || img.height;
          const scale = Math.min(containerW / iw, containerH / ih);
          const dw = Math.max(1, Math.floor(iw * scale));
          const dh = Math.max(1, Math.floor(ih * scale));
          const dx = Math.floor((containerW - dw) / 2);
          const dy = Math.floor((containerH - dh) / 2);

          const canvas = document.createElement('canvas');
          canvas.width = containerW;
          canvas.height = containerH;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0,0,containerW,containerH);
          ctx.drawImage(img, dx, dy, dw, dh);

          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `Page ${pageNum}: ${title}`);
          canvas.style.display = 'block';

          // 移除占位与背景，插入最终缩略图
          thumb.style.background = 'none';
          thumb.replaceChildren();
          thumb.appendChild(canvas);
          const badge = document.createElement('div');
          badge.className = 'eh-thumbnail-number';
          badge.textContent = String(pageNum);
          thumb.appendChild(badge);
        })
        .catch(err => {
          console.warn('[EH Modern Reader] 缩略图加载失败（真实图）:', err);
          thumb.style.background = 'none';
          thumb.replaceChildren();
          thumb.innerHTML = `<div class=\"eh-thumbnail-number\">${pageNum}</div>`;
        });
    }

    // 事件监听
    if (elements.prevBtn) {
      elements.prevBtn.onclick = () => {
        // 反向阅读：prev按钮视觉上在右边，应该向逻辑后翻（数字增大）
        const direction = state.settings.reverse ? 1 : -1;
        let target = state.currentPage + direction;
        
  // 普通单页模式翻页
        
        if (target < 1 || target > state.pageCount) return;
        scheduleShowPage(target, { immediate: true });
      };
    }

    if (elements.nextBtn) {
      elements.nextBtn.onclick = () => {
        // 反向阅读：next按钮视觉上在左边，应该向逻辑前翻（数字减小）
        const direction = state.settings.reverse ? -1 : 1;
        let target = state.currentPage + direction;
        
  // 普通单页模式翻页
        
        if (target < 1 || target > state.pageCount) return;
        scheduleShowPage(target, { immediate: true });
      };
    }

    if (elements.closeBtn) {
      elements.closeBtn.onclick = () => {
        if (pageData.gallery_url) {
          window.location.href = pageData.gallery_url;
        } else {
          window.history.back();
        }
      };
    }

    // 点击图片左右区域翻页（适用所有模式）
    if (elements.viewer) {
      elements.viewer.onclick = (e) => {
        // 排除按钮、缩略图、进度条的点击
        if (e.target.tagName === 'BUTTON' || 
            e.target.closest('button') || 
            e.target.closest('#eh-bottom-menu')) {
          return;
        }
        
        // 获取点击位置
        const rect = elements.viewer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const viewerWidth = rect.width;
        
        const leftThreshold = viewerWidth / 3;
        const rightThreshold = viewerWidth * 2 / 3;
        
        // 中间1/3区域：切换顶栏与底部菜单的显示/隐藏（所有模式通用）
        if (clickX >= leftThreshold && clickX <= rightThreshold) {
          const header = document.getElementById('eh-header');
          const main = document.getElementById('eh-main');
          const bottom = elements.bottomMenu;
          if (header) {
            const isHidden = header.classList.toggle('eh-hidden');
            // 同步调整main的padding
            if (main) {
              main.classList.toggle('eh-fullheight', isHidden);
            }
            // 同步底部菜单显示/隐藏
            if (bottom) {
              if (isHidden) bottom.classList.add('eh-menu-hidden');
              else bottom.classList.remove('eh-menu-hidden');
            }
            console.log('[EH Modern Reader] 顶栏/底栏显示状态:', !isHidden);
          }
          e.stopPropagation();
          return;
        }
        
        // 在所有模式下左/右区域直接按页翻（连续横向模式下滚动居中到相邻页）
        let direction = 0;
        if (clickX < leftThreshold) {
          // 点击左侧：反向时向后翻（+1），正常时向前翻（-1）
          direction = state.settings.reverse ? 1 : -1;
        } else if (clickX > rightThreshold) {
          // 点击右侧：反向时向前翻（-1），正常时向后翻（+1）
          direction = state.settings.reverse ? -1 : 1;
        } else {
          return;
        }
        
        let target = state.currentPage + direction;
        
        // 翻页逻辑（连续横向模式由 scheduleShowPage 处理居中）
        
        if (target < 1 || target > state.pageCount) return;
        scheduleShowPage(target);
        e.stopPropagation();
      };
    }

    // 主题图标切换（深色：月亮；浅色：太阳）
  // Feather 风格的 Sun 图标（MIT），更简洁，与现有描边风格一致
  const SUN_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#000">\
<circle cx="12" cy="12" r="5"/>\
<line x1="12" y1="1" x2="12" y2="3"/>\
<line x1="12" y1="21" x2="12" y2="23"/>\
<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>\
<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>\
<line x1="1" y1="12" x2="3" y2="12"/>\
<line x1="21" y1="12" x2="23" y2="12"/>\
<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>\
<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>\
</svg>';
    const MOON_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    function updateThemeIcon() {
      if (!elements.themeBtn) return;
      const iconHtml = document.body.classList.contains('eh-dark-mode') ? MOON_ICON : SUN_ICON;
      elements.themeBtn.innerHTML = iconHtml;
    }

    if (elements.themeBtn) {
      elements.themeBtn.onclick = () => {
        state.settings.darkMode = !state.settings.darkMode;
        document.body.classList.toggle('eh-dark-mode');
        updateThemeIcon();
      };
    }

    if (elements.fullscreenBtn) {
      elements.fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      };
    }
    // 定时翻页功能
    function updateAutoButtonVisual() {
      if (!elements.autoBtn) return;
      elements.autoBtn.classList.toggle('eh-active', state.autoPage.running);
      const inContinuousScroll = state.settings && (state.settings.readMode === 'continuous-horizontal' || state.settings.readMode === 'continuous-vertical');
      if (state.autoPage.running) {
        if (inContinuousScroll) {
          const spd = state.autoPage.scrollSpeed || 3;
          elements.autoBtn.title = `自动滚动中 (${spd}px/帧) - 单击停止, Alt+单击设置速度`;
        } else {
          elements.autoBtn.title = `定时翻页中 (${Math.round(state.autoPage.intervalMs/1000)}s) - 单击停止, Alt+单击设置间隔`;
        }
      } else {
        elements.autoBtn.title = inContinuousScroll
          ? '自动滚动 (单击开始, Alt+单击设置速度)'
          : '定时翻页 (单击开始, Alt+单击设置间隔)';
      }
    }
    function stopAutoPaging() {
      if (state.autoPage.timer) {
        if (typeof state.autoPage.timer === 'object' && state.autoPage.timer.rafId) {
          cancelAnimationFrame(state.autoPage.timer.rafId);
        } else {
          clearInterval(state.autoPage.timer);
        }
      }
      state.autoPage.timer = null;
      state.autoPage.running = false;
      updateAutoButtonVisual();
    }
    function startAutoPaging() {
      stopAutoPaging();
      state.autoPage.running = true;
      // 横向/纵向连续模式：切换为持续自动滚动
      const horizontalContainer = (state.settings && state.settings.readMode === 'continuous-horizontal')
        ? document.getElementById('eh-continuous-horizontal')
        : null;
      const verticalContainer = (state.settings && state.settings.readMode === 'continuous-vertical')
        ? document.getElementById('eh-continuous-vertical')
        : null;
      if (horizontalContainer || verticalContainer) {
        state.autoPage.scrollSpeed = state.autoPage.scrollSpeed || 3; // px/帧，支持小数
        const step = () => {
          if (!state.autoPage.running) return;
          const dir = 1; // 始终向 DOM 正方向推进，保证页码递增
          if (horizontalContainer) {
            horizontalContainer.scrollLeft += state.autoPage.scrollSpeed * dir;
            const atEnd = horizontalContainer.scrollLeft + horizontalContainer.clientWidth >= horizontalContainer.scrollWidth - 2;
            if (atEnd) {
              stopAutoPaging();
              return;
            }
          } else if (verticalContainer) {
            verticalContainer.scrollTop += state.autoPage.scrollSpeed * dir;
            const atEnd = verticalContainer.scrollTop + verticalContainer.clientHeight >= verticalContainer.scrollHeight - 2;
            if (atEnd) {
              stopAutoPaging();
              return;
            }
          }
          state.autoPage.timer.rafId = requestAnimationFrame(step);
        };
        state.autoPage.timer = { rafId: requestAnimationFrame(step) };
      } else {
        // 单页自动翻页：逻辑页递增（1→N），反向阅读只改变交互语义
        state.autoPage.timer = setInterval(() => {
          const next = state.currentPage + 1;
          if (next > state.pageCount) {
            stopAutoPaging();
          } else if (next >= 1) {
            scheduleShowPage(next);
          }
        }, state.autoPage.intervalMs);
      }
      updateAutoButtonVisual();
    }
    if (elements.autoBtn) {
      elements.autoBtn.onclick = (e) => {
        if (e.altKey) {
          const inContinuousScroll = state.settings && (state.settings.readMode === 'continuous-horizontal' || state.settings.readMode === 'continuous-vertical');
          if (inContinuousScroll) {
            const val = prompt('设置自动滚动速度(px/帧，支持小数，建议2~10)', String(state.autoPage.scrollSpeed || 3));
            if (val) {
              const spd = Math.max(0.1, Math.min(100, parseFloat(val)));
              if (!isNaN(spd)) {
                state.autoPage.scrollSpeed = spd;
                // 同步到设置面板
                if (elements.scrollSpeedInput) elements.scrollSpeedInput.value = spd;
                if (state.autoPage.running) startAutoPaging(); else updateAutoButtonVisual();
              }
            }
          } else {
            const val = prompt('设置翻页间隔(秒，可小数)', String((state.autoPage.intervalMs/1000).toFixed(2)));
            if (val) {
              const sec = Math.max(0.1, Math.min(120, parseFloat(val)));
              if (!isNaN(sec)) {
                state.autoPage.intervalMs = Math.round(sec * 1000);
                // 同步到设置面板
                if (elements.autoIntervalInput) elements.autoIntervalInput.value = sec;
                if (state.autoPage.running) startAutoPaging(); else updateAutoButtonVisual();
              }
            }
          }
        } else {
          if (state.autoPage.running) stopAutoPaging(); else startAutoPaging();
        }
      };
      updateAutoButtonVisual();
    }

    // 设置按钮和面板
    if (elements.settingsBtn) {
      elements.settingsBtn.onclick = () => {
        console.log('[EH Modern Reader] 点击设置按钮');
        if (elements.settingsPanel) {
          elements.settingsPanel.classList.toggle('eh-hidden');
          console.log('[EH Modern Reader] 设置面板显示状态:', !elements.settingsPanel.classList.contains('eh-hidden'));
        }
      };
    }

    // 设置面板关闭按钮
    if (elements.settingsCloseBtn) {
      elements.settingsCloseBtn.onclick = () => {
        if (elements.settingsPanel) {
          elements.settingsPanel.classList.add('eh-hidden');
        }
      };
    }
    
    // 恢复默认设置按钮
    if (elements.resetSettingsBtn) {
      elements.resetSettingsBtn.onclick = () => {
        if (confirm('确定要恢复所有设置到默认值吗？')) {
          // 恢复默认值
          state.settings.prefetchAhead = DEFAULT_SETTINGS.prefetchAhead;
          state.autoPage.intervalMs = DEFAULT_SETTINGS.autoIntervalMs;
          state.autoPage.scrollSpeed = DEFAULT_SETTINGS.scrollSpeed;
          state.settings.verticalSidePadding = DEFAULT_SETTINGS.verticalSidePadding;
          state.settings.readMode = DEFAULT_SETTINGS.readMode;
          state.settings.reverse = DEFAULT_SETTINGS.reverse;
          
          // 更新 UI
          if (elements.preloadCountInput) {
            elements.preloadCountInput.value = DEFAULT_SETTINGS.prefetchAhead;
            if (elements.preloadCountValue) elements.preloadCountValue.textContent = DEFAULT_SETTINGS.prefetchAhead;
          }
          if (elements.autoIntervalInput) {
            elements.autoIntervalInput.value = DEFAULT_SETTINGS.autoIntervalMs / 1000;
            if (elements.autoIntervalValue) elements.autoIntervalValue.textContent = (DEFAULT_SETTINGS.autoIntervalMs / 1000).toFixed(1);
          }
          if (elements.scrollSpeedInput) {
            elements.scrollSpeedInput.value = DEFAULT_SETTINGS.scrollSpeed;
            if (elements.scrollSpeedValue) elements.scrollSpeedValue.textContent = DEFAULT_SETTINGS.scrollSpeed.toFixed(1);
          }
          if (elements.verticalPaddingInput) {
            elements.verticalPaddingInput.value = DEFAULT_SETTINGS.verticalSidePadding;
            if (elements.verticalPaddingValue) elements.verticalPaddingValue.textContent = DEFAULT_SETTINGS.verticalSidePadding;
          }
          if (elements.readModeRadios) {
            elements.readModeRadios.forEach(radio => {
              radio.checked = (radio.value === DEFAULT_SETTINGS.readMode);
            });
          }
          
          // 应用模式切换
          if (state.settings.readMode !== DEFAULT_SETTINGS.readMode) {
            const oldMode = state.settings.readMode;
            state.settings.readMode = DEFAULT_SETTINGS.readMode;
            if (oldMode === 'continuous-horizontal' || oldMode === 'continuous-vertical') {
              const singleViewer = document.getElementById('eh-viewer');
              if (singleViewer) singleViewer.style.display = '';
              if (continuous.observer) { continuous.observer.disconnect(); continuous.observer = null; }
              if (continuous.container && continuous.container.parentElement) {
                continuous.container.parentElement.removeChild(continuous.container);
              }
              continuous.container = null;
            }
            scheduleShowPage(state.currentPage, { instant: true });
          }
          
          // 应用反向状态
          applyReverseState();
          
          // 保存到 localStorage
          saveSettings();
          
          console.log('[EH Modern Reader] 已恢复默认设置');
        }
      };
    }

    // 点击面板外部关闭
    if (elements.settingsPanel) {
      elements.settingsPanel.addEventListener('click', (e) => {
        // 如果点击的是面板背景层（overlay），而不是面板内容
        if (e.target === elements.settingsPanel) {
          elements.settingsPanel.classList.add('eh-hidden');
        }
      });
    }

    // 反向开关
    function applyReverseState() {
      try {
        const reversed = !!state.settings.reverse;
        // 缩略图容器方向（使用 flex-direction 实现从右向左的起点）
        if (elements.thumbnails) {
          elements.thumbnails.style.display = 'flex';
          elements.thumbnails.style.flexDirection = reversed ? 'row-reverse' : 'row';
          // 清理任何历史 transform
          const thumbs = elements.thumbnails.querySelectorAll('.eh-thumbnail');
          thumbs.forEach(t => { t.style.transform = ''; });
        }
        // 横向连续容器也反向
        const horizontalContainer = document.getElementById('eh-continuous-horizontal');
        if (horizontalContainer) {
          horizontalContainer.style.transform = reversed ? 'scaleX(-1)' : '';
          // 每个图片wrapper也要翻转回来
          const wrappers = horizontalContainer.querySelectorAll('.eh-ch-wrapper');
          wrappers.forEach(wrapper => {
            wrapper.style.transform = reversed ? 'scaleX(-1)' : '';
          });
        }
        // 纵向连续容器也反向
        const verticalContainer = document.getElementById('eh-continuous-vertical');
        if (verticalContainer) {
          verticalContainer.style.transform = reversed ? 'scaleY(-1)' : '';
          const wrappers = verticalContainer.querySelectorAll('.eh-cv-wrapper');
          wrappers.forEach(wrapper => {
            wrapper.style.transform = reversed ? 'scaleY(-1)' : '';
          });
        }
        // 进度条视觉翻转：使用 transform scaleX(-1)
        const track = elements.sliderTrack;
        if (track) {
          if (reversed) {
            track.style.transform = 'scaleX(-1)';
          } else {
            track.style.transform = '';
          }
        }
        // 进度条两端页码切换位置
        const progressCurrent = document.getElementById('eh-progress-current');
        const progressTotal = document.getElementById('eh-progress-total');
        const sliderContainer = document.querySelector('.eh-slider-container');
        if (progressCurrent && progressTotal && sliderContainer) {
          if (reversed) {
            // 反向：总页数在左，当前页在右
            sliderContainer.style.flexDirection = 'row-reverse';
          } else {
            // 正常：当前页在左，总页数在右
            sliderContainer.style.flexDirection = 'row';
          }
        }
        // 如果自动播放正在运行，重启以应用新方向
        if (state.autoPage && state.autoPage.running) {
          startAutoPaging();
        }
        // 更新按钮状态
        updateReverseBtn();
      } catch {}
    }
    
    // 反向按钮点击事件
    if (elements.reverseBtn) {
      elements.reverseBtn.onclick = () => {
        state.settings.reverse = !state.settings.reverse;
        applyReverseState();
      };
    }

    // 进度条的 onchange 统一在后文的“进度条拖动/改变事件”中处理，避免重复绑定

    if (elements.pageInput) {
      elements.pageInput.onchange = () => {
        const pageNum = parseInt(elements.pageInput.value);
        if (pageNum >= 1 && pageNum <= state.pageCount) {
          scheduleShowPage(pageNum, { instant: true });
        }
      };
    }

  // 阅读模式单选按钮监听
    if (elements.readModeRadios && elements.readModeRadios.length > 0) {
      elements.readModeRadios.forEach(radio => {
        radio.onchange = () => {
          if (!radio.checked) return;
          const newMode = radio.value;
          const oldMode = state.settings.readMode;
          if (newMode === oldMode) return;
          state.settings.readMode = newMode;
          console.log('[EH Modern Reader] 阅读模式切换:', oldMode, '→', newMode);
          // 退出旧模式（可能是 continuous-horizontal、continuous-vertical 或 single）
          if (oldMode === 'continuous-horizontal' || oldMode === 'continuous-vertical') {
            const singleViewer = document.getElementById('eh-viewer');
            if (singleViewer) singleViewer.style.display = '';
            if (continuous.observer) { continuous.observer.disconnect(); continuous.observer = null; }
            if (continuous.container && continuous.container.parentElement) {
              continuous.container.parentElement.removeChild(continuous.container);
            }
            continuous.container = null;
          }
          // 进入新模式
          if (newMode === 'continuous-horizontal') {
            enterContinuousHorizontalMode();
          } else if (newMode === 'continuous-vertical') {
            enterContinuousVerticalMode();
          } else {
            const singleViewer = document.getElementById('eh-viewer');
            if (singleViewer) singleViewer.style.display = '';
            scheduleShowPage(state.currentPage, { instant: true });
          }
          saveSettings(); // 保存设置
        };
      });
    }

    if (elements.preloadCountInput) {
      // 实时显示滑块数值
      elements.preloadCountInput.addEventListener('input', () => {
        const v = parseInt(elements.preloadCountInput.value);
        if (!isNaN(v) && elements.preloadCountValue) {
          elements.preloadCountValue.textContent = v;
        }
      });
      // 应用设置
      elements.preloadCountInput.addEventListener('change', () => {
        const v = parseInt(elements.preloadCountInput.value);
        if (!isNaN(v) && v >= 0 && v <= 10) {
          state.settings.prefetchAhead = v;
          preloadAdjacentPages(state.currentPage);
          saveSettings();
        }
      });
    }

    // 纵向连续侧边边距滑块
    if (elements.verticalPaddingInput) {
      // 实时显示滑块数值
      elements.verticalPaddingInput.addEventListener('input', () => {
        const v = parseInt(elements.verticalPaddingInput.value);
        if (!isNaN(v) && elements.verticalPaddingValue) {
          elements.verticalPaddingValue.textContent = v;
        }
      });
      // 应用设置（实时更新）
      elements.verticalPaddingInput.addEventListener('input', () => {
        const v = parseInt(elements.verticalPaddingInput.value);
        if (!isNaN(v) && v >= 0 && v <= 1000) {
          state.settings.verticalSidePadding = v;
          const verticalContainer = document.getElementById('eh-continuous-vertical');
          if (verticalContainer) {
            const topBottom = 12;
            // 改变 padding 前记录当前页
            const currentPageBefore = state.currentPage;
            verticalContainer.style.padding = `${topBottom}px ${v}px`;
            
            // 改变 padding 后，重新定位到当前页以保持页面不变
            requestAnimationFrame(() => {
              const targetIdx = currentPageBefore - 1;
              const targetImg = verticalContainer.querySelector(`img[data-page-index="${targetIdx}"]`);
              if (targetImg) {
                requestAnimationFrame(() => {
                  try {
                    const c = verticalContainer;
                    const wrapper = targetImg.closest('.eh-cv-wrapper') || targetImg.parentElement;
                    const basisHeight = wrapper?.clientHeight || targetImg.clientHeight || 0;
                    
                    const allWrappers = Array.from(c.querySelectorAll('.eh-cv-wrapper'));
                    const targetWrapperIndex = allWrappers.indexOf(wrapper);
                    let cumulativeTop = 0;
                    const gap = 8;
                    for (let i = 0; i < targetWrapperIndex; i++) {
                      cumulativeTop += allWrappers[i].clientHeight + gap;
                    }
                    const topPadding = topBottom;
                    cumulativeTop += topPadding;
                    
                    const centerOffset = Math.max(0, (c.clientHeight - basisHeight) / 2);
                    let target = cumulativeTop - centerOffset;
                    
                    const maxScrollNow = Math.max(0, c.scrollHeight - c.clientHeight);
                    target = Math.max(0, Math.min(maxScrollNow, target));
                    c.scrollTop = target;
                  } catch {}
                });
              }
            });
          }
          saveSettings();
        }
      });
    }

    // 翻页间隔滑块
    if (elements.autoIntervalInput) {
      // 实时显示滑块数值
      elements.autoIntervalInput.addEventListener('input', () => {
        const v = parseFloat(elements.autoIntervalInput.value);
        if (!isNaN(v) && elements.autoIntervalValue) {
          elements.autoIntervalValue.textContent = v.toFixed(1);
        }
      });
      // 应用设置
      elements.autoIntervalInput.addEventListener('change', () => {
        const v = parseFloat(elements.autoIntervalInput.value);
        if (!isNaN(v) && v >= 1 && v <= 60) {
          state.autoPage.intervalMs = Math.round(v * 1000);
          if (state.autoPage.running) {
            startAutoPaging();
          } else {
            updateAutoButtonVisual();
          }
          saveSettings();
        }
      });
    }

    // 滚动速度滑块
    if (elements.scrollSpeedInput) {
      // 实时显示滑块数值
      elements.scrollSpeedInput.addEventListener('input', () => {
        const v = parseFloat(elements.scrollSpeedInput.value);
        if (!isNaN(v) && elements.scrollSpeedValue) {
          elements.scrollSpeedValue.textContent = v.toFixed(1);
        }
      });
      // 应用设置
      elements.scrollSpeedInput.addEventListener('change', () => {
        const v = parseFloat(elements.scrollSpeedInput.value);
        if (!isNaN(v) && v >= 0.1 && v <= 5) {
          state.autoPage.scrollSpeed = v;
          if (state.autoPage.running && state.settings.readMode.includes('continuous')) {
            startAutoPaging();
          } else {
            updateAutoButtonVisual();
          }
          saveSettings();
        }
      });
    }

    // 进度条拖动/改变事件
    if (elements.progressBar) {
      let preheatTimer = null;
      
      // 实时同步拖动状态
      elements.progressBar.oninput = () => {
        const page = parseInt(elements.progressBar.value);
        const idx = page - 1;
        
        // 1. 实时更新左侧（反向时右侧）页码显示
        const progressCurrent = document.getElementById('eh-progress-current');
        if (progressCurrent) {
          progressCurrent.textContent = page;
        }
        
        // 2. 实时滚动缩略图到对应位置（拖动过程中禁用，避免缩略图滚动抖动）
        if (!state.draggingProgress) {
          const thumbnails = document.querySelectorAll('.eh-thumbnail');
          if (thumbnails && thumbnails.length > 0 && elements.thumbnails) {
            const targetThumb = thumbnails[Math.min(idx, thumbnails.length - 1)];
            if (targetThumb) {
              // 禁用懒加载锁，避免手动滚动时被拦截
              if (thumbnailLoadQueue) {
                thumbnailLoadQueue.isProgrammaticScroll = false;
              }
              targetThumb.scrollIntoView({ 
                behavior: 'auto',
                block: 'nearest', 
                inline: 'center' 
              });
            }
          }
        }
        
        // 3. 延迟预热目标页图片（避免频繁请求）
        // 优化：减少延迟从 150ms 到 50ms，加快初始响应
        if (preheatTimer) clearTimeout(preheatTimer);
        preheatTimer = setTimeout(() => {
          enqueuePrefetch([idx], true); // 高优先级预热目标页
          // 同时预热相邻页
          const neighbors = [idx - 1, idx + 1].filter(i => i >= 0 && i < state.pageCount);
          enqueuePrefetch(neighbors, false);
        }, 50);
      };
      
      // 拖动开始/结束标记
      const markDraggingTrue = () => { state.draggingProgress = true; };
      const markDraggingFalse = () => { state.draggingProgress = false; };
      // 指针事件优先，兼容性回退到鼠标/触摸
      elements.progressBar.addEventListener('pointerdown', markDraggingTrue);
      window.addEventListener('pointerup', markDraggingFalse);
      elements.progressBar.addEventListener('mousedown', markDraggingTrue);
      window.addEventListener('mouseup', markDraggingFalse);
      elements.progressBar.addEventListener('touchstart', markDraggingTrue, { passive: true });
      window.addEventListener('touchend', markDraggingFalse, { passive: true });

      elements.progressBar.onchange = (e) => {
        // 松开鼠标时跳转到目标页
        const imageNum = parseInt(e.target.value);
        scheduleShowPage(imageNum, { instant: true });
        // 结束拖动态（某些浏览器只触发change不触发pointerup/mouseup）
        state.draggingProgress = false;
      };
    }


    // 缩略图横向滚动支持鼠标滚轮
    if (elements.thumbnails) {
      elements.thumbnails.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          // 提升滚动灵敏度：放大系数 2.5
          elements.thumbnails.scrollLeft += e.deltaY * 2.5;
          e.preventDefault();
        }
      }, { passive: false });
    }

    // 图片缩放功能 (参考PicaComic)
    // 图片缩放相关（改用键盘快捷键，避免与滚轮冲突）
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastOffsetX = 0;
    let lastOffsetY = 0;

    // 重置图片缩放
    function resetImageZoom() {
      state.settings.imageScale = 1;
      state.settings.imageOffsetX = 0;
      state.settings.imageOffsetY = 0;
      if (elements.currentImage) {
        elements.currentImage.style.transform = 'scale(1) translate(0, 0)';
        elements.currentImage.style.cursor = 'pointer';
      }
    }

    // 应用图片缩放
    function applyImageZoom() {
      if (elements.currentImage) {
        const scale = state.settings.imageScale;
        const offsetX = state.settings.imageOffsetX;
        const offsetY = state.settings.imageOffsetY;
        elements.currentImage.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
        elements.currentImage.style.cursor = scale > 1 ? 'grab' : 'pointer';
      }
    }

    // 缩略图区域滚轮横向滚动（已在上方添加，此处去重）

    // 双击图片重置缩放
    if (elements.viewer) {
      elements.viewer.addEventListener('dblclick', (e) => {
        if (!e.target.closest('#eh-bottom-menu') && !e.target.closest('button')) {
          resetImageZoom();
          e.preventDefault();
        }
      });
      // 鼠标滚轮翻页 (单页/单页竖向模式下) 上一页/下一页
      elements.viewer.addEventListener('wheel', (e) => {
        if (state.settings.readMode !== 'single' && state.settings.readMode !== 'single-vertical') return; // 仅单页类模式翻页
        const delta = e.deltaY;
        // 反向阅读：滚轮向下（delta > 0）应该向前翻（-1），正常时向后翻（+1）
        const direction = state.settings.reverse ? -1 : 1;
        if (delta > 0) {
          scheduleShowPage(state.currentPage + direction);
        } else if (delta < 0) {
          scheduleShowPage(state.currentPage - direction);
        }
        e.preventDefault();
      }, { passive: false });
    }

    // 图片拖动 (仅在缩放时生效)
    if (elements.currentImage) {
      elements.currentImage.addEventListener('mousedown', (e) => {
        if (state.settings.imageScale > 1) {
          isDragging = true;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          lastOffsetX = state.settings.imageOffsetX;
          lastOffsetY = state.settings.imageOffsetY;
          elements.currentImage.style.cursor = 'grabbing';
          e.preventDefault();
        }
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          const deltaX = e.clientX - dragStartX;
          const deltaY = e.clientY - dragStartY;
          state.settings.imageOffsetX = lastOffsetX + deltaX / state.settings.imageScale;
          state.settings.imageOffsetY = lastOffsetY + deltaY / state.settings.imageScale;
          applyImageZoom();
        }
      });

      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          if (elements.currentImage && state.settings.imageScale > 1) {
            elements.currentImage.style.cursor = 'grab';
          }
        }
      });
    }

  // （双页模式已删除，仅保留单页与横向连续）

    // 连续模式：横向 MVP（懒加载 + 观察器）
    let continuous = { container: null, observer: null };
    function enterContinuousHorizontalMode() {
  // 仅处理横向模式容器
      // 若已存在则直接显示
      if (!continuous.container) {
  continuous.container = document.createElement('div');
  continuous.container.id = 'eh-continuous-horizontal';
  const CH_GAP = 8; // 替换原 16px 间距
  const CH_PAD = 12; // 替换原 16px 左右内边距
  continuous.container.style.cssText = `display:flex; flex-direction:row; align-items:center; gap:${CH_GAP}px; overflow-x:auto; overflow-y:hidden; height:100%; width:100%; padding:0 ${CH_PAD}px;`;
        
        // 反向模式下整体镜像翻转
        if (state.settings.reverse) {
          continuous.container.style.transform = 'scaleX(-1)';
        }

        // 初始估算比例：若当前单页已加载则用其真实比例，否则用默认 0.7
        let baseRatio = 0.7;
        if (elements.currentImage && elements.currentImage.naturalWidth && elements.currentImage.naturalHeight) {
          const r = elements.currentImage.naturalWidth / elements.currentImage.naturalHeight;
          if (r && isFinite(r)) baseRatio = Math.max(0.2, Math.min(5, r));
        }
        // 生成占位卡片（带骨架与比例占位）
        for (let i = 0; i < state.pageCount; i++) {
          const card = document.createElement('div');
          card.className = 'eh-ch-card';
          // 卡片取消层级 gap 留白由容器统一控制，避免内部再加额外对齐导致多层嵌套间距感加大
          card.style.cssText = 'flex:0 0 auto; height:100%; position:relative; display:flex;';

          const wrapper = document.createElement('div');
          wrapper.className = 'eh-ch-wrapper eh-ch-skeleton';
          // wrapper 仅负责比例占位与 img 自适应，移除内部再次居中造成的视觉间距
          wrapper.style.cssText = 'height:100%; aspect-ratio: var(--eh-aspect, 0.7); position:relative; min-width:120px; display:flex;';
          // 反向模式下每个图片也要翻转回来
          if (state.settings.reverse) {
            wrapper.style.transform = 'scaleX(-1)';
          }
          // 设置初始估算比例：若已有缓存比例则使用，否则用 baseRatio
          const cachedR = ratioCache.get(i);
          wrapper.style.setProperty('--eh-aspect', String(cachedR || baseRatio));

          const img = document.createElement('img');
          // 使用宽高100%以便 object-fit:contain 真实填充 wrapper
          img.style.cssText = 'width:100%; height:100%; display:block; object-fit:contain;';
          img.setAttribute('data-page-index', String(i));

          wrapper.appendChild(img);
          card.appendChild(wrapper);
          continuous.container.appendChild(card);
        }

        // 进入后根据已解析的 URL 比例实时刷新一次所有骨架
        requestAnimationFrame(() => {
          try {
            continuous.container.querySelectorAll('img[data-page-index]').forEach(img => {
              const idx = parseInt(img.getAttribute('data-page-index'));
              const r = ratioCache.get(idx);
              if (r) {
                const wrap = img.closest('.eh-ch-wrapper');
                if (wrap && wrap.classList.contains('eh-ch-skeleton')) {
                  wrap.style.setProperty('--eh-aspect', String(r));
                }
              }
            });
          } catch {}
        });

        // 放入主区域并隐藏单页 viewer
        const main = document.getElementById('eh-main');
        if (main) {
          main.appendChild(continuous.container);
          const singleViewer = document.getElementById('eh-viewer');
          if (singleViewer) singleViewer.style.display = 'none';
        }

        // 应用一次反向状态（方向、进度条值）
        try { if (typeof applyReverseState === 'function') applyReverseState(); } catch {}

        // 工具：根据已加载图片设置占位宽高比并移除骨架
        function applyAspectFor(imgEl, loadedImg) {
          try {
            if (!imgEl) return;
            const wrap = imgEl.parentElement;
            const w = loadedImg?.naturalWidth || loadedImg?.width;
            const h = loadedImg?.naturalHeight || loadedImg?.height;
            if (wrap && w && h && h > 0) {
              const ratio = Math.max(0.2, Math.min(5, w / h));
              wrap.style.setProperty('--eh-aspect', String(ratio));
              wrap.classList.remove('eh-ch-skeleton');
            }
          } catch {}
        }

        // 观察器懒加载 - 统一使用 loadImage 避免重复请求
        continuous.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const idx = parseInt(img.getAttribute('data-page-index'));
              // 仅当未加载时触发
              if (!img.src && !img.getAttribute('data-loading')) {
                img.setAttribute('data-loading', 'true');
                
                // 检查缓存状态
                const cached = state.imageCache.get(idx);
                if (cached && cached.status === 'loaded' && cached.img && cached.img.src) {
                  // 已加载完成，直接使用
                  img.src = cached.img.src;
                  applyAspectFor(img, cached.img);
                  img.removeAttribute('data-loading');
                } else if (cached && cached.status === 'loading' && cached.promise) {
                  // 正在加载中，等待 Promise
                  cached.promise.then(loadedImg => {
                    if (loadedImg && loadedImg.src) {
                      img.src = loadedImg.src;
                    }
                    applyAspectFor(img, loadedImg);
                  }).catch(err => {
                    console.warn('[EH Modern Reader] 横向模式图片加载失败:', idx, err);
                  }).finally(() => {
                    img.removeAttribute('data-loading');
                  });
                } else {
                  // 未加载，启动加载
                  loadImage(idx).then(loadedImg => {
                    if (loadedImg && loadedImg.src) {
                      img.src = loadedImg.src;
                    }
                    applyAspectFor(img, loadedImg);
                  }).catch(err => {
                    console.warn('[EH Modern Reader] 横向模式图片加载失败:', idx, err);
                  }).finally(() => {
                    img.removeAttribute('data-loading');
                  });
                }
              }
            }
          });
  }, { root: continuous.container, rootMargin: '1200px', threshold: 0.01 });

        // 观察所有图片
        continuous.container.querySelectorAll('img[data-page-index]').forEach(img => {
          continuous.observer.observe(img);
        });

        // 映射垂直滚轮为水平滚动
        continuous.container.addEventListener('wheel', (e) => {
          if (e.deltaY !== 0) {
            const dirVisual = state.settings.reverse ? -1 : 1; // 视觉滚动方向
            continuous.container.scrollLeft += e.deltaY * dirVisual;
            // 预测翻页方向以提前预取
            const forward = e.deltaY > 0; // true: 向右滚
            const logicalDir = forward ? 1 : -1; // 页码逻辑递增/递减
            const base = state.currentPage - 1;
            const targets = [];
            for (let i = 1; i <= 4; i++) {
              const idx = base + logicalDir * i;
              if (idx >= 0 && idx < state.pageCount) targets.push(idx);
            }
            if (targets.length) enqueuePrefetch(targets, true);
            e.preventDefault();
          }
        }, { passive: false });

        // 连续横向模式：左/中/右三分区点击（中间需同步隐藏/显示底部菜单与缩略图区）
        continuous.container.addEventListener('click', (e) => {
          // 排除底部菜单与按钮
          if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('#eh-bottom-menu')) {
            return;
          }
          const rect = continuous.container.getBoundingClientRect();
          const rawX = e.clientX - rect.left;
          const width = rect.width;
          // 注意：反向阅读下容器使用了 scaleX(-1) 做视觉镜像，此时 DOM 坐标与视觉含义相反。
          // 为了让“左/中/右”判断遵循视觉区域，这里在反向时将坐标镜像回来。
          const clickX = state.settings.reverse ? (width - rawX) : rawX;
          const leftThreshold = width / 3;
          const rightThreshold = width * 2 / 3;
          // 中间切换顶栏 + 底部菜单（与单页模式行为保持一致）
          if (clickX >= leftThreshold && clickX <= rightThreshold) {
            const header = document.getElementById('eh-header');
            const main = document.getElementById('eh-main');
            const bottom = elements.bottomMenu;
            if (header) {
              const isHidden = header.classList.toggle('eh-hidden');
              if (main) main.classList.toggle('eh-fullheight', isHidden);
              if (bottom) {
                // 使用与单页模式一致的类名控制，可配合 CSS 动画
                bottom.classList.toggle('eh-menu-hidden', isHidden);
              }
              console.log('[EH Modern Reader] 连续模式中间点击 -> 顶栏/底栏切换, hidden=', isHidden);
            }
            e.stopPropagation();
            return;
          }
          // 左右按页移动
          let direction = 0;
          if (clickX < leftThreshold) {
            // 视觉左侧：正常为向前（-1），反向为向后（+1）
            direction = state.settings.reverse ? 1 : -1;
          } else if (clickX > rightThreshold) {
            // 视觉右侧：正常为向后（+1），反向为向前（-1）
            direction = state.settings.reverse ? -1 : 1;
          } else {
            return;
          }
          const target = Math.max(1, Math.min(state.pageCount, state.currentPage + direction));
          scheduleShowPage(target, { immediate: true });
          console.log('[EH Modern Reader] 连续模式点击区域:', clickX < leftThreshold ? 'LEFT' : 'RIGHT', 'reverse=', !!state.settings.reverse, '→ target=', target);
          e.stopPropagation();
        });

        // 滚动时根据居中元素更新当前页与进度条/高亮
        let scrollUpdating = false;
        const onScroll = () => {
          // 跳过程序化跳转期间的滚动回调，避免误判当前页
          if (scrollJumping || scrollUpdating) return;
          scrollUpdating = true;
          requestAnimationFrame(() => {
            try {
              const viewportMid = continuous.container.clientWidth / 2;
              let bestIdx = 0; let bestDist = Infinity;
              const imgs = continuous.container.querySelectorAll('img[data-page-index]');
              imgs.forEach((img) => {
                const rect = img.getBoundingClientRect();
                const parentRect = continuous.container.getBoundingClientRect();
                const mid = rect.left - parentRect.left + rect.width / 2;
                const dist = Math.abs(mid - viewportMid);
                const idx = parseInt(img.getAttribute('data-page-index'));
                if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
              });
              // 物理索引 bestIdx (0-based) -> 逻辑页号 (1-based)
              // 反向阅读时容器 scaleX(-1) 镜像但 data-page-index 不变，直接 +1
              const pageNum = bestIdx + 1;

              // 确保视口中心页优先加载（做到“看哪里就加载哪里”）
              const centerImg = continuous.container.querySelector(`img[data-page-index="${bestIdx}"]`);
              if (centerImg && !centerImg.src && !centerImg.getAttribute('data-loading')) {
                // 优先取消其他预取，集中带宽到中心页
                cancelPrefetchExcept(bestIdx);
                centerImg.setAttribute('data-loading', 'true');
                loadImage(bestIdx).then(loadedImg => {
                  if (loadedImg && loadedImg.src) centerImg.src = loadedImg.src;
                }).catch(err => {
                  console.warn('[EH Modern Reader] 中心页加载失败:', bestIdx, err);
                }).finally(() => {
                  centerImg.removeAttribute('data-loading');
                });
                // 立即安排相邻3-4张的高优先级预热
                const neighbors = [bestIdx - 2, bestIdx - 1, bestIdx + 1, bestIdx + 2].filter(i => i >= 0 && i < state.pageCount);
                enqueuePrefetch(neighbors, true);
              }

              if (pageNum !== state.currentPage) {
                state.currentPage = pageNum;
                if (elements.pageInfo) elements.pageInfo.textContent = `${pageNum} / ${state.pageCount}`;
                if (elements.progressBar) {
                  elements.progressBar.value = pageNum;
                }
                updateThumbnailHighlight(pageNum);
                preloadAdjacentPages(pageNum);
                saveProgress(pageNum);
              }
            } finally {
              scrollUpdating = false;
            }
          });
        };
        continuous.container.addEventListener('scroll', onScroll);

        // 进入横向模式后若已有 currentPage，确保滚动到该页中心（避免切换模式后位置不对）
        const targetIdx = state.currentPage - 1;
        const targetImg = continuous.container.querySelector(`img[data-page-index="${targetIdx}"]`);
        if (targetImg) {
          // 等待一次 frame 保证布局完成
          requestAnimationFrame(() => {
            const c = continuous.container;
            const wrapper = targetImg.closest('.eh-ch-wrapper') || targetImg.parentElement;
            const basisWidth = wrapper?.clientWidth || targetImg.clientWidth || 0;
            
            // flex 布局中 offsetLeft 不可靠，改用累计前面所有元素宽度 + gap
            const allWrappers = Array.from(c.querySelectorAll('.eh-ch-wrapper'));
            const targetIndex = allWrappers.indexOf(wrapper);
            let cumulativeLeft = 0;
            const gap = 8; // 与容器 gap 保持一致
            for (let i = 0; i < targetIndex; i++) {
              cumulativeLeft += allWrappers[i].clientWidth + gap;
            }
            const leftPadding = 12; // 与容器左右 padding 保持一致
            cumulativeLeft += leftPadding;
            
            const centerOffset = Math.max(0, (c.clientWidth - basisWidth) / 2);
            let target = cumulativeLeft - centerOffset;
            // scaleX(-1) 镜像模式：scrollLeft 坐标系也被镜像，无需转换
            
            const maxScrollNow = Math.max(0, c.scrollWidth - c.clientWidth);
            target = Math.max(0, Math.min(maxScrollNow, target));
            c.scrollLeft = target;
          });
        }
      }
    }

    function enterContinuousVerticalMode() {
      // 纵向连续模式：垂直滚动
      if (!continuous.container) {
        continuous.container = document.createElement('div');
        continuous.container.id = 'eh-continuous-vertical';
        const CV_GAP = 8; // 图片间距
        const CV_PAD = 12; // 上下内边距
        const sidePad = Math.max(0, Math.min(1000, Number(state.settings.verticalSidePadding ?? 12)));
        continuous.container.style.cssText = `display:flex; flex-direction:column; align-items:center; gap:${CV_GAP}px; overflow-y:auto; overflow-x:hidden; height:100%; width:100%; padding:${CV_PAD}px ${sidePad}px;`;
        
        // 反向模式下整体垂直翻转
        if (state.settings.reverse) {
          continuous.container.style.transform = 'scaleY(-1)';
        }

        // 初始估算比例
        let baseRatio = 0.7;
        if (elements.currentImage && elements.currentImage.naturalWidth && elements.currentImage.naturalHeight) {
          const r = elements.currentImage.naturalWidth / elements.currentImage.naturalHeight;
          if (r && isFinite(r)) baseRatio = Math.max(0.2, Math.min(5, r));
        }

        // 生成占位卡片
        for (let i = 0; i < state.pageCount; i++) {
          const card = document.createElement('div');
          card.className = 'eh-cv-card';
          card.style.cssText = 'flex:0 0 auto; width:100%; position:relative; display:flex; justify-content:center;';

          const wrapper = document.createElement('div');
          wrapper.className = 'eh-cv-wrapper eh-cv-skeleton';
          wrapper.style.cssText = 'width:100%; aspect-ratio: var(--eh-aspect, 0.7); position:relative; max-width:100%; display:flex;';
          
          // 反向模式下每个图片也要翻转回来
          if (state.settings.reverse) {
            wrapper.style.transform = 'scaleY(-1)';
          }
          
          const cachedR = ratioCache.get(i);
          wrapper.style.setProperty('--eh-aspect', String(cachedR || baseRatio));

          const img = document.createElement('img');
          img.style.cssText = 'width:100%; height:100%; display:block; object-fit:contain;';
          img.setAttribute('data-page-index', String(i));

          wrapper.appendChild(img);
          card.appendChild(wrapper);
          continuous.container.appendChild(card);
        }

        // 刷新骨架比例
        requestAnimationFrame(() => {
          try {
            continuous.container.querySelectorAll('img[data-page-index]').forEach(img => {
              const idx = parseInt(img.getAttribute('data-page-index'));
              const r = ratioCache.get(idx);
              if (r) {
                const wrap = img.closest('.eh-cv-wrapper');
                if (wrap && wrap.classList.contains('eh-cv-skeleton')) {
                  wrap.style.setProperty('--eh-aspect', String(r));
                }
              }
            });
          } catch {}
        });

        // 放入主区域并隐藏单页 viewer
        const main = document.getElementById('eh-main');
        if (main) {
          main.appendChild(continuous.container);
          const singleViewer = document.getElementById('eh-viewer');
          if (singleViewer) singleViewer.style.display = 'none';
        }

        // 应用反向状态
        try { if (typeof applyReverseState === 'function') applyReverseState(); } catch {}

        // 应用宽高比并移除骨架
        function applyAspectFor(imgEl, loadedImg) {
          try {
            if (!imgEl) return;
            const wrap = imgEl.parentElement;
            const w = loadedImg?.naturalWidth || loadedImg?.width;
            const h = loadedImg?.naturalHeight || loadedImg?.height;
            if (wrap && w && h && h > 0) {
              const ratio = Math.max(0.2, Math.min(5, w / h));
              wrap.style.setProperty('--eh-aspect', String(ratio));
              wrap.classList.remove('eh-cv-skeleton');
            }
          } catch {}
        }

        // 懒加载观察器
        continuous.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const idx = parseInt(img.getAttribute('data-page-index'));
              if (!img.src && !img.getAttribute('data-loading')) {
                img.setAttribute('data-loading', 'true');
                
                const cached = state.imageCache.get(idx);
                if (cached && cached.status === 'loaded' && cached.img && cached.img.src) {
                  img.src = cached.img.src;
                  applyAspectFor(img, cached.img);
                  img.removeAttribute('data-loading');
                } else if (cached && cached.status === 'loading' && cached.promise) {
                  cached.promise.then(loadedImg => {
                    if (loadedImg && loadedImg.src) {
                      img.src = loadedImg.src;
                    }
                    applyAspectFor(img, loadedImg);
                  }).catch(err => {
                    console.warn('[EH Modern Reader] 纵向模式图片加载失败:', idx, err);
                  }).finally(() => {
                    img.removeAttribute('data-loading');
                  });
                } else {
                  loadImage(idx).then(loadedImg => {
                    if (loadedImg && loadedImg.src) {
                      img.src = loadedImg.src;
                    }
                    applyAspectFor(img, loadedImg);
                  }).catch(err => {
                    console.warn('[EH Modern Reader] 纵向模式图片加载失败:', idx, err);
                  }).finally(() => {
                    img.removeAttribute('data-loading');
                  });
                }
              }
            }
          });
        }, { root: continuous.container, rootMargin: '1200px', threshold: 0.01 });

        // 观察所有图片
        continuous.container.querySelectorAll('img[data-page-index]').forEach(img => {
          continuous.observer.observe(img);
        });

        // 不需要映射滚轮，纵向滚动是默认行为
        // 但仍然预测翻页方向以提前预取
        continuous.container.addEventListener('wheel', (e) => {
          const forward = e.deltaY > 0; // true: 向下滚
          const logicalDir = forward ? 1 : -1;
          const base = state.currentPage - 1;
          const targets = [];
          for (let i = 1; i <= 4; i++) {
            const idx = base + logicalDir * i;
            if (idx >= 0 && idx < state.pageCount) targets.push(idx);
          }
          if (targets.length) enqueuePrefetch(targets, true);
        }, { passive: true });

        // 连续纵向模式：上/中/下三分区点击
        continuous.container.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('#eh-bottom-menu')) {
            return;
          }
          const rect = continuous.container.getBoundingClientRect();
          const rawY = e.clientY - rect.top;
          const height = rect.height;
          const clickY = state.settings.reverse ? (height - rawY) : rawY;
          const topThreshold = height / 3;
          const bottomThreshold = height * 2 / 3;
          
          // 中间切换顶栏 + 底部菜单
          if (clickY >= topThreshold && clickY <= bottomThreshold) {
            const header = document.getElementById('eh-header');
            const main = document.getElementById('eh-main');
            const bottom = elements.bottomMenu;
            if (header) {
              const isHidden = header.classList.toggle('eh-hidden');
              if (main) main.classList.toggle('eh-fullheight', isHidden);
              if (bottom) {
                bottom.classList.toggle('eh-menu-hidden', isHidden);
              }
              console.log('[EH Modern Reader] 纵向模式中间点击 -> 顶栏/底栏切换, hidden=', isHidden);
            }
            e.stopPropagation();
            return;
          }
          
          // 上下按页移动
          let direction = 0;
          if (clickY < topThreshold) {
            direction = state.settings.reverse ? 1 : -1;
          } else if (clickY > bottomThreshold) {
            direction = state.settings.reverse ? -1 : 1;
          } else {
            return;
          }
          const target = Math.max(1, Math.min(state.pageCount, state.currentPage + direction));
          scheduleShowPage(target, { immediate: true });
          console.log('[EH Modern Reader] 纵向模式点击区域:', clickY < topThreshold ? 'TOP' : 'BOTTOM', 'reverse=', !!state.settings.reverse, '→ target=', target);
          e.stopPropagation();
        });

        // 滚动时根据居中元素更新当前页
        let scrollUpdating = false;
        const onScroll = () => {
          if (scrollJumping || scrollUpdating) return;
          scrollUpdating = true;
          requestAnimationFrame(() => {
            try {
              const viewportMid = continuous.container.clientHeight / 2;
              let bestIdx = 0; let bestDist = Infinity;
              const imgs = continuous.container.querySelectorAll('img[data-page-index]');
              imgs.forEach((img) => {
                const rect = img.getBoundingClientRect();
                const parentRect = continuous.container.getBoundingClientRect();
                const mid = rect.top - parentRect.top + rect.height / 2;
                const dist = Math.abs(mid - viewportMid);
                const idx = parseInt(img.getAttribute('data-page-index'));
                if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
              });
              
              const pageNum = bestIdx + 1;

              // 确保视口中心页优先加载
              const centerImg = continuous.container.querySelector(`img[data-page-index="${bestIdx}"]`);
              if (centerImg && !centerImg.src && !centerImg.getAttribute('data-loading')) {
                cancelPrefetchExcept(bestIdx);
                centerImg.setAttribute('data-loading', 'true');
                loadImage(bestIdx).then(loadedImg => {
                  if (loadedImg && loadedImg.src) centerImg.src = loadedImg.src;
                }).catch(err => {
                  console.warn('[EH Modern Reader] 中心页加载失败:', bestIdx, err);
                }).finally(() => {
                  centerImg.removeAttribute('data-loading');
                });
                const neighbors = [bestIdx - 2, bestIdx - 1, bestIdx + 1, bestIdx + 2].filter(i => i >= 0 && i < state.pageCount);
                enqueuePrefetch(neighbors, true);
              }

              if (pageNum !== state.currentPage) {
                state.currentPage = pageNum;
                if (elements.pageInfo) elements.pageInfo.textContent = `${pageNum} / ${state.pageCount}`;
                if (elements.progressBar) {
                  elements.progressBar.value = pageNum;
                }
                updateThumbnailHighlight(pageNum);
                preloadAdjacentPages(pageNum);
                saveProgress(pageNum);
              }
            } finally {
              scrollUpdating = false;
            }
          });
        };
        continuous.container.addEventListener('scroll', onScroll);

        // 进入纵向模式后滚动到当前页中心
        const targetIdx = state.currentPage - 1;
        const targetImg = continuous.container.querySelector(`img[data-page-index="${targetIdx}"]`);
        if (targetImg) {
          requestAnimationFrame(() => {
            const c = continuous.container;
            const wrapper = targetImg.closest('.eh-cv-wrapper') || targetImg.parentElement;
            const basisHeight = wrapper?.clientHeight || targetImg.clientHeight || 0;
            
            const allWrappers = Array.from(c.querySelectorAll('.eh-cv-wrapper'));
            const targetIndex = allWrappers.indexOf(wrapper);
            let cumulativeTop = 0;
            const gap = 8;
            for (let i = 0; i < targetIndex; i++) {
              cumulativeTop += allWrappers[i].clientHeight + gap;
            }
            const topPadding = 12;
            cumulativeTop += topPadding;
            
            const centerOffset = Math.max(0, (c.clientHeight - basisHeight) / 2);
            let target = cumulativeTop - centerOffset;
            
            const maxScrollNow = Math.max(0, c.scrollHeight - c.clientHeight);
            target = Math.max(0, Math.min(maxScrollNow, target));
            c.scrollTop = target;
          });
        }
      }
    }

    function exitContinuousMode() {
  // 退出横向模式
      
      // 显示单页 viewer，移除连续容器
      const singleViewer = document.getElementById('eh-viewer');
      if (singleViewer) singleViewer.style.display = '';
      if (continuous.observer) { continuous.observer.disconnect(); continuous.observer = null; }
      if (continuous.container && continuous.container.parentElement) {
        continuous.container.parentElement.removeChild(continuous.container);
      }
      continuous.container = null;
      // 退出横向模式时，取消除当前页外的预取与加载，避免占用带宽
      try {
        cancelPrefetchExcept(state.currentPage - 1);
        state.imageRequests.forEach((entry, idx) => {
          if (idx !== state.currentPage - 1 && entry && entry.controller) {
            try { entry.controller.abort('exit-horizontal'); } catch {}
          }
        });
      } catch {}
      // 返回单页模式后主动显示当前页图片（有时还未加载）
      scheduleShowPage(state.currentPage, { instant: true });
    }

    // 兜底：在捕获阶段优先处理 ESC 退出元素全屏，避免被页面监听拦截
    document.addEventListener('keydown', (e) => {
      try {
        if (e.key === 'Escape' && document.fullscreenElement) {
          e.stopPropagation();
          e.preventDefault();
          document.exitFullscreen();
          return;
        }
      } catch {}
    }, true);

    // 键盘导航和缩放
    document.addEventListener('keydown', (e) => {
      // 忽略长按重复与输入控件聚焦状态
      if (e.repeat) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag && ['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
      // 图片缩放快捷键（+ / - / 0）
      if (e.key === '+' || e.key === '=') {
        // 放大
        const newScale = Math.min(5, state.settings.imageScale + 0.1);
        state.settings.imageScale = newScale;
        applyImageZoom();
        e.preventDefault();
        return;
      }
      
      if (e.key === '-' || e.key === '_') {
        // 缩小
        const newScale = Math.max(0.5, state.settings.imageScale - 0.1);
        state.settings.imageScale = newScale;
        applyImageZoom();
        e.preventDefault();
        return;
      }
      
      if (e.key === '0') {
        // 重置缩放
        resetImageZoom();
        e.preventDefault();
        return;
      }

      // 页面导航
      switch(e.key) {
        case 'f':
        case 'F': {
          // 切换缩略图栏显示/隐藏
          const container = document.getElementById('eh-thumbnails-container');
          if (container) {
            container.classList.toggle('eh-hidden');
          }
          e.preventDefault();
          break; }
        case 'h':
        case 'H':
          // 切到横向连续
          state.settings.readMode = 'continuous-horizontal';
          // 同步单选按钮状态
          if (elements.readModeRadios && elements.readModeRadios.length > 0) {
            elements.readModeRadios.forEach(radio => {
              if (radio.value === 'continuous-horizontal') radio.checked = true;
            });
          }
          enterContinuousHorizontalMode();
          e.preventDefault();
          break;
        case 's':
        case 'S':
          // 切到单页
          state.settings.readMode = 'single';
          // 同步单选按钮状态
          if (elements.readModeRadios && elements.readModeRadios.length > 0) {
            elements.readModeRadios.forEach(radio => {
              if (radio.value === 'single') radio.checked = true;
            });
          }
          exitContinuousMode();
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A': {
          // 反向阅读：左箭头应该向逻辑后翻（+1），正常时向前翻（-1）
          const direction = state.settings.reverse ? 1 : -1;
          let target = state.currentPage + direction;
          // 单页左右方向翻页
          
          if (target < 1 || target > state.pageCount) target = state.currentPage;
          if (target !== state.currentPage) scheduleShowPage(target);
          e.preventDefault();
          break; }
        case 'ArrowRight':
        case 'd':
        case 'D':
        case ' ': {
          // 反向阅读：右箭头应该向逻辑前翻（-1），正常时向后翻（+1）
          const direction = state.settings.reverse ? -1 : 1;
          let target = state.currentPage + direction;
          // 单页左右方向翻页
          
          if (target < 1 || target > state.pageCount) target = state.currentPage;
          if (target !== state.currentPage) scheduleShowPage(target);
          e.preventDefault();
          break; }
        case 'ArrowUp': {
          if (state.settings.readMode !== 'single-vertical') break;
          const direction = state.settings.reverse ? -1 : 1;
          let target = state.currentPage - direction;
          if (target < 1 || target > state.pageCount) target = state.currentPage;
          if (target !== state.currentPage) scheduleShowPage(target);
          e.preventDefault();
          break; }
        case 'ArrowDown': {
          if (state.settings.readMode !== 'single-vertical') break;
          const direction = state.settings.reverse ? -1 : 1;
          let target = state.currentPage + direction;
          if (target < 1 || target > state.pageCount) target = state.currentPage;
          if (target !== state.currentPage) scheduleShowPage(target);
          e.preventDefault();
          break; }
        case 'p':
        case 'P':
          // 切换定时翻页
          if (state.autoPage.running) {
            // 减少与空格冲突，只有在未焦点输入框时生效
            stopAutoPaging();
          } else {
            startAutoPaging();
          }
          break;
        case 'Home':
          scheduleShowPage(1);
          e.preventDefault();
          break;
        case 'End':
          scheduleShowPage(state.pageCount);
          e.preventDefault();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
      }
    });

    // 初始化
    generateThumbnails();
    
    // 阅读记忆：优先使用外部启动指定页，其次恢复“永久”进度（chrome.storage.local / localStorage）
    let savedPage = (typeof pageData.startAt === 'number' && pageData.startAt >= 1 && pageData.startAt <= state.pageCount)
      ? pageData.startAt
      : 1;
    const gid = pageData.gid || 'nogid';
    const LS_KEY = `eh_reader_lastpage_permanent_${gid}`;
    const loadLastPagePermanent = () => new Promise((resolve) => {
      // chrome.storage.local 优先
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([LS_KEY], (res) => {
            const val = res && res[LS_KEY];
            resolve(typeof val === 'number' ? val : null);
          });
          return;
        }
      } catch {}
      // 回退 localStorage
      try {
        const raw = localStorage.getItem(LS_KEY);
        resolve(raw ? parseInt(raw, 10) : null);
      } catch { resolve(null); }
    });
    const saveLastPagePermanent = (page) => {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          const obj = {}; obj[LS_KEY] = page;
          chrome.storage.local.set(obj);
        } else {
          localStorage.setItem(LS_KEY, String(page));
        }
      } catch {}
    };
    try {
      loadLastPagePermanent().then((v) => {
        if (savedPage === 1 && typeof v === 'number' && v >= 1 && v <= state.pageCount) {
          savedPage = v;
        }
        // hook showPage，在每次成功显示后写入永久存储
        let persistTimer = null;
        const persistLastPage = () => {
          if (persistTimer) clearTimeout(persistTimer);
          persistTimer = setTimeout(() => { saveLastPagePermanent(state.currentPage); }, 400);
        };
        const _origShowPage = showPage;
        showPage = async function(pageNum, tokenCheck){
          const r = await _origShowPage(pageNum, tokenCheck);
          persistLastPage();
          return r;
        };
        console.log('[EH Modern Reader] 恢复上次阅读页:', savedPage);
        
        // 先将 state.currentPage 设置为保存的页码，这样模式函数可以滚动到正确的位置
        state.currentPage = savedPage;
        
        // 应用加载的阅读模式
        const loadedMode = state.settings.readMode;
        if (loadedMode && loadedMode !== 'single') {
          console.log('[EH Modern Reader] 初始化加载的阅读模式:', loadedMode);
          if (loadedMode === 'continuous-horizontal') {
            enterContinuousHorizontalMode();
          } else if (loadedMode === 'continuous-vertical') {
            enterContinuousVerticalMode();
          } else if (loadedMode === 'single-vertical') {
            // single-vertical 已在 state.settings.readMode 中设置，UI 会自动处理
            console.log('[EH Modern Reader] 应用单页竖向模式');
          }
        }
        
        // 进入阅读器并定位
        try { requestAnimationFrame(() => { try { updateThumbnailHighlight(savedPage); } catch {} }); } catch {}
        internalShowPage(savedPage);
        // 后续 UI 初始化（主题等）
        if (state.settings.darkMode) { document.body.classList.add('eh-dark-mode'); }
        try { (typeof updateThemeIcon === 'function') && updateThemeIcon(); } catch {}
        console.log('[EH Modern Reader] 阅读器初始化完成，从第', savedPage, '页继续阅读');
      }).catch((e) => {
        console.warn('[EH Modern Reader] 恢复阅读记忆失败', e);
        
        // 先将 state.currentPage 设置为保存的页码
        state.currentPage = savedPage;
        
        // 应用加载的阅读模式
        const loadedMode = state.settings.readMode;
        if (loadedMode && loadedMode !== 'single') {
          console.log('[EH Modern Reader] 初始化加载的阅读模式:', loadedMode);
          if (loadedMode === 'continuous-horizontal') {
            enterContinuousHorizontalMode();
          } else if (loadedMode === 'continuous-vertical') {
            enterContinuousVerticalMode();
          } else if (loadedMode === 'single-vertical') {
            console.log('[EH Modern Reader] 应用单页竖向模式');
          }
        }
        
        // 失败时使用默认路径
        try { requestAnimationFrame(() => { try { updateThumbnailHighlight(savedPage); } catch {} }); } catch {}
        internalShowPage(savedPage);
        if (state.settings.darkMode) { document.body.classList.add('eh-dark-mode'); }
        try { (typeof updateThemeIcon === 'function') && updateThemeIcon(); } catch {}
        console.log('[EH Modern Reader] 阅读器初始化完成，从第', savedPage, '页继续阅读');
      });
      // 提前 return 避免下面重复执行
      return;
    } catch (e) {
      console.warn('[EH Modern Reader] 初始化阅读记忆系统失败', e);
    }
    // 如果上面因异常未提前 return，这里执行默认路径
    
    // 先将 state.currentPage 设置为保存的页码
    state.currentPage = savedPage;
    
    // 应用加载的阅读模式
    const loadedMode = state.settings.readMode;
    if (loadedMode && loadedMode !== 'single') {
      console.log('[EH Modern Reader] 初始化加载的阅读模式:', loadedMode);
      if (loadedMode === 'continuous-horizontal') {
        enterContinuousHorizontalMode();
      } else if (loadedMode === 'continuous-vertical') {
        enterContinuousVerticalMode();
      } else if (loadedMode === 'single-vertical') {
        console.log('[EH Modern Reader] 应用单页竖向模式');
      }
    }
    
    try { requestAnimationFrame(() => { try { updateThumbnailHighlight(savedPage); } catch {} }); } catch {}
    internalShowPage(savedPage);
    if (state.settings.darkMode) { document.body.classList.add('eh-dark-mode'); }
    try { (typeof updateThemeIcon === 'function') && updateThemeIcon(); } catch {}
    console.log('[EH Modern Reader] 阅读器初始化完成，从第', savedPage, '页继续阅读');
  }

  /**
   * 初始化
   */
  function init() {
    // 监听 Gallery 模式的启动事件
    document.addEventListener('ehGalleryReaderReady', (e) => {
      console.log('[EH Modern Reader] Gallery reader ready event received');
      const galleryData = e.detail || window.__ehReaderData;
      if (galleryData && galleryData.imagelist) {
        console.log('[EH Modern Reader] Starting from Gallery mode with', galleryData.pagecount, 'pages');
        injectModernReader(galleryData);
      }
    });

    // 如果不是 MPV 页面，等待 Gallery 事件
    if (!window.location.pathname.includes('/mpv/')) {
      console.log('[EH Modern Reader] Waiting for Gallery bootstrap...');
      return;
    }

    // MPV 模式初始化
    try {
      // 优化等待器：使用 exponential backoff 而不是固定 50ms 轮询
      // 减少 CPU 占用同时快速失败
      const waitForImagelist = (timeoutMs = 3000) => new Promise((resolve) => {
        const start = Date.now();
        let interval = 10; // 初始 10ms
        let nextCheck = 10;
        
        const check = () => {
          const cap = window.__ehCaptured || {};
          if (Array.isArray(cap.imagelist) && cap.imagelist.length > 0) {
            resolve(true);
            return;
          }
          
          const elapsed = Date.now() - start;
          if (elapsed >= timeoutMs) {
            resolve(false);
            return;
          }
          
          // Exponential backoff: 10->20->40->80->...->300ms (max)
          nextCheck = Math.min(300, interval);
          interval = interval < 150 ? interval * 2 : 300;
          setTimeout(check, nextCheck);
        };
        
        check();
      });

      // 兜底：直接抓取当前 MPV 页面 HTML 并解析 imagelist
      async function fallbackFetchImagelist() {
        try {
          const resp = await fetch(window.location.href, { cache: 'no-store', credentials: 'same-origin' });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const html = await resp.text();
          const data = { imagelist: [], gid: null, mpvkey: null, pagecount: null, gallery_url: null, title: document.title.replace(/ - E-Hentai.*/, '') };
          const listMatch = html.match(/var\s+imagelist\s*=\s*(\[[\s\S]*?\]);/);
          if (listMatch) {
            try { data.imagelist = JSON.parse(listMatch[1]); } catch {}
          }
          const gidMatch = html.match(/var\s+gid\s*=\s*(\d+);/);
          if (gidMatch) data.gid = gidMatch[1];
          const keyMatch = html.match(/var\s+mpvkey\s*=\s*"([^"]+)";/);
          if (keyMatch) data.mpvkey = keyMatch[1];
          const countMatch = html.match(/var\s+pagecount\s*=\s*(\d+);/);
          if (countMatch) data.pagecount = parseInt(countMatch[1]);
          const gurlMatch = html.match(/var\s+gallery_url\s*=\s*"([^"]+)";/);
          if (gurlMatch) data.gallery_url = gurlMatch[1];
          if (Array.isArray(data.imagelist) && data.imagelist.length > 0) {
            return data;
          }
        } catch (e) {
          console.warn('[EH Modern Reader] fallbackFetchImagelist 失败:', e);
        }
        return null;
      }

      // 等待 DOM 加载完成
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          // Gallery 模式：直接启动
          if (window.__ehGalleryBootstrap && window.__ehGalleryBootstrap.enabled) {
            console.log('[EH Modern Reader] Gallery 模式启动');
            const galleryData = window.__ehReaderData;
            if (galleryData && galleryData.imagelist) {
              injectModernReader(galleryData);
              return;
            }
          }

          // MPV 模式：原有逻辑（优化为并行提取）
          try {
            const pageData = extractPageData();
            if (pageData.imagelist && pageData.imagelist.length > 0) {
              console.log('[EH Modern Reader] 快速路径：DOM 直接提取成功');
              injectModernReader(pageData);
            } else {
              // 并行触发 waitForImagelist 和 fallbackFetchImagelist，而不是串行
              console.log('[EH Modern Reader] 慢速路径：等待数据或回源抓取');
              Promise.race([
                waitForImagelist().then(() => {
                  console.log('[EH Modern Reader] MutationObserver 捕获成功');
                  const retryData = extractPageData();
                  if (retryData.imagelist && retryData.imagelist.length > 0) {
                    return retryData;
                  }
                  throw new Error('等待后仍无 imagelist');
                }),
                fallbackFetchImagelist().then((data) => {
                  if (data && data.imagelist && data.imagelist.length > 0) {
                    console.log('[EH Modern Reader] 回源抓取成功');
                    return data;
                  }
                  throw new Error('回源抓取失败');
                })
              ]).then((finalData) => {
                console.log('[EH Modern Reader] 使用并行获取的数据初始化');
                injectModernReader(finalData);
              }).catch((e) => {
                console.error('[EH Modern Reader] 并行初始化均失败:', e);
                alert('EH Modern Reader: 无法加载图片列表，请刷新页面重试。');
              });
            }
          } catch (e) {
            console.error('[EH Modern Reader] 初始化失败:', e);
            alert(`EH Modern Reader 初始化失败: ${e.message}\n\n请刷新页面重试或联系开发者。`);
          }
        });
      } else {
        // Gallery 模式：直接启动
        if (window.__ehGalleryBootstrap && window.__ehGalleryBootstrap.enabled) {
          console.log('[EH Modern Reader] Gallery 模式启动 (readyState=complete)');
          const galleryData = window.__ehReaderData;
          if (galleryData && galleryData.imagelist) {
            injectModernReader(galleryData);
            return;
          }
        }

        // MPV 模式：原有逻辑（优化为并行提取）
        const pageData = extractPageData();
        if (pageData.imagelist && pageData.imagelist.length > 0) {
          console.log('[EH Modern Reader] 快速路径：DOM 直接提取成功');
          injectModernReader(pageData);
        } else {
          // 并行触发，加快初始化速度
          console.log('[EH Modern Reader] 慢速路径：等待数据或回源抓取');
          Promise.race([
            waitForImagelist().then(() => {
              console.log('[EH Modern Reader] MutationObserver 捕获成功');
              const retryData = extractPageData();
              if (retryData.imagelist && retryData.imagelist.length > 0) {
                return retryData;
              }
              throw new Error('等待后仍无 imagelist');
            }),
            fallbackFetchImagelist().then((data) => {
              if (data && data.imagelist && data.imagelist.length > 0) {
                console.log('[EH Modern Reader] 回源抓取成功');
                return data;
              }
              throw new Error('回源抓取失败');
            })
          ]).then((finalData) => {
            console.log('[EH Modern Reader] 使用并行获取的数据初始化');
            injectModernReader(finalData);
          }).catch((e) => {
            console.error('[EH Modern Reader] 并行初始化均失败:', e);
            alert('EH Modern Reader: 无法加载图片列表，请刷新页面重试。');
          });
        }
      }
    } catch (e) {
      console.error('[EH Modern Reader] 初始化失败:', e);
      alert(`EH Modern Reader 初始化失败: ${e.message}\n\n请刷新页面重试或联系开发者。`);
    }
  }

  init();
})();
