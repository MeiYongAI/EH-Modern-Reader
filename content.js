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

  console.log('[EH Modern Reader] 正在初始化...');

  // 提前阻止原 MPV 脚本注入与执行（document_start 生效）
  try {
    const blockScriptObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node && node.tagName === 'SCRIPT') {
            const src = node.src || '';
            if (/ehg_mpv\./i.test(src)) {
              console.warn('[EH Modern Reader] 阻止原MPV脚本加载:', src);
              node.remove();
            } else if (!src && node.textContent && /var\s+imagelist\s*=\s*\[/s.test(node.textContent)) {
              // 捕获 imagelist 的出现（早期注入场景）
              try {
                const content = node.textContent;
                const imagelistMatch = content.match(/var imagelist = (\[.*?\]);/s);
                const pagecountMatch = content.match(/var pagecount = (\d+);/);
                const gidMatch = content.match(/var gid=(\d+);/);
                const mpvkeyMatch = content.match(/var mpvkey = "([^"]+)";/);
                if (imagelistMatch) {
                  window.__eh_pre_extracted__ = window.__eh_pre_extracted__ || {};
                  window.__eh_pre_extracted__.imagelist = JSON.parse(imagelistMatch[1]);
                  if (pagecountMatch) window.__eh_pre_extracted__.pagecount = parseInt(pagecountMatch[1]);
                  if (gidMatch) window.__eh_pre_extracted__.gid = gidMatch[1];
                  if (mpvkeyMatch) window.__eh_pre_extracted__.mpvkey = mpvkeyMatch[1];
                  console.log('[EH Modern Reader] 预捕获 imagelist 于 document_start');
                }
              } catch (e) {
                console.warn('[EH Modern Reader] 预捕获 imagelist 失败:', e);
              }
            }
          }
        }
      }
    });
    blockScriptObserver.observe(document.documentElement || document, { childList: true, subtree: true });

    // 在页面上下文内注入极简防护脚本，避免原函数执行（双保险）
    const guard = document.createElement('script');
    guard.textContent = `
      (function(){
        try {
          window.preload_generic = window.preload_generic || function(){};
          window.preload_scroll_images = window.preload_scroll_images || function(){};
          window.load_image = window.load_image || function(){};
        } catch(e) {}
      })();
    `;
    (document.documentElement || document.head || document.body).appendChild(guard);
    guard.remove();
  } catch (e) {
    console.warn('[EH Modern Reader] 早期脚本拦截初始化失败:', e);
  }

  /**
   * 从原页面提取必要数据
   */
  function extractPageData() {
    const scriptTags = document.querySelectorAll('script');
    let pageData = {};

    // 如果早期已预捕获（MutationObserver阶段）则直接使用
    if (window.__eh_pre_extracted__ && Array.isArray(window.__eh_pre_extracted__.imagelist)) {
      pageData.imagelist = window.__eh_pre_extracted__.imagelist;
      pageData.pagecount = window.__eh_pre_extracted__.pagecount || window.__eh_pre_extracted__.imagelist.length;
      pageData.gid = window.__eh_pre_extracted__.gid;
      pageData.mpvkey = window.__eh_pre_extracted__.mpvkey;
      console.log('[EH Modern Reader] 使用预捕获数据');
      return pageData;
    }

    try {
      for (let script of scriptTags) {
        const content = script.textContent;
        
        // 提取图片列表
        const imagelistMatch = content.match(/var imagelist = (\[.*?\]);/s);
        if (imagelistMatch) {
          try {
            const parsedList = JSON.parse(imagelistMatch[1]);
            // 数据校验：确保是数组且不为空
            if (Array.isArray(parsedList) && parsedList.length > 0) {
              pageData.imagelist = parsedList;
            } else {
              console.warn('[EH Modern Reader] imagelist 为空或格式错误');
            }
          } catch (e) {
            console.error('[EH Modern Reader] 解析 imagelist 失败:', e);
          }
        }

        // 提取其他配置变量
        const gidMatch = content.match(/var gid=(\d+);/);
        if (gidMatch) pageData.gid = gidMatch[1];

        const mpvkeyMatch = content.match(/var mpvkey = "([^"]+)";/);
        if (mpvkeyMatch) pageData.mpvkey = mpvkeyMatch[1];

        const pagecountMatch = content.match(/var pagecount = (\d+);/);
        if (pagecountMatch) pageData.pagecount = parseInt(pagecountMatch[1]);

        const galleryUrlMatch = content.match(/var gallery_url = "([^"]+)";/);
        if (galleryUrlMatch) pageData.gallery_url = galleryUrlMatch[1];

        const titleMatch = document.title.match(/^(.+?) - E-Hentai/);
        if (titleMatch) pageData.title = titleMatch[1];
      }
    } catch (e) {
      console.error('[EH Modern Reader] 提取页面数据失败:', e);
    }

    // 兜底处理：确保必要字段存在
    if (!pageData.imagelist || !Array.isArray(pageData.imagelist)) {
      pageData.imagelist = [];
    }
    if (!pageData.pagecount) {
      pageData.pagecount = pageData.imagelist.length || 0;
    }
    if (!pageData.title) {
      pageData.title = '未知画廊';
    }

    return pageData;
  }

  /**
   * 替换原页面内容
   */
  function injectModernReader(pageData) {
    // 阻止原始脚本继续运行 - 更彻底的方式
    try {
      // 移除所有原始脚本
      document.querySelectorAll('script[src*="ehg_mpv"]').forEach(s => s.remove());
      
      // 停止页面加载
      window.stop();
    } catch (e) {
      console.warn('[EH Modern Reader] 阻止原脚本失败:', e);
    }
    
    // 清空原页面
    document.body.innerHTML = '';
    document.body.className = 'eh-modern-reader';
    
    // 禁用原脚本的全局变量
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
            <button id="eh-settings-btn" class="eh-icon-btn" title="设置">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m6.364-15.364l-4.243 4.243m-4.242 4.242l-4.243 4.243m16.97-4.243l-4.242-4.242m-4.243-4.243L1.636 19.778"/>
              </svg>
            </button>
            <button id="eh-fullscreen-btn" class="eh-icon-btn" title="全屏 (F11)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            </button>
            <button id="eh-theme-btn" class="eh-icon-btn" title="切换主题">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
            <button id="eh-thumbnails-toggle-btn" class="eh-icon-btn" title="缩略图悬停显示开关">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>
        </header>

        <!-- 主内容区:图片显示 -->
        <main id="eh-main">
          <section id="eh-viewer">
            <div id="eh-image-container">
              <div id="eh-loading" class="eh-loading">
                <div class="eh-spinner"></div>
                <p>加载中...</p>
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
          </div>
        </footer>

        <!-- 设置面板 -->
        <div id="eh-settings-panel" class="eh-panel eh-hidden">
          <div class="eh-panel-content">
            <h3>阅读设置</h3>
            <div class="eh-setting-item">
              <label>图片适配模式</label>
              <select id="eh-fit-mode">
                <option value="contain">适应窗口</option>
                <option value="width">适应宽度</option>
                <option value="height">适应高度</option>
                <option value="none">原始大小</option>
              </select>
            </div>
            <div class="eh-setting-item">
              <label>图片对齐</label>
              <select id="eh-align-mode">
                <option value="center">居中</option>
                <option value="left">左对齐</option>
                <option value="right">右对齐</option>
              </select>
            </div>
            <div class="eh-setting-item">
              <label>阅读模式</label>
              <select id="eh-read-mode">
                <option value="single">单页（默认）</option>
                <option value="continuous-vertical">纵向连续</option>
                <option value="continuous-horizontal">横向连续</option>
              </select>
            </div>
            <div class="eh-setting-item">
              <label>
                <input type="checkbox" id="eh-preload-next" checked />
                预加载下一页
              </label>
            </div>
            <div class="eh-setting-item">
              <label>
                <input type="checkbox" id="eh-smooth-scroll" checked />
                平滑滚动
              </label>
            </div>
            <button id="eh-close-settings" class="eh-btn">关闭</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', readerHTML);

    // 注入 CSS 样式
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('style/reader.css');
    document.head.appendChild(link);

    // 等待 CSS 加载完成后初始化阅读器
    link.onload = () => {
      console.log('[EH Modern Reader] CSS 加载完成');
      initializeReader(pageData);
    };

    // 如果 CSS 加载失败，仍然初始化
    link.onerror = () => {
      console.warn('[EH Modern Reader] CSS 加载失败，使用默认样式');
      initializeReader(pageData);
    };
  }

  /**
   * 初始化阅读器功能
   */
  function initializeReader(pageData) {
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
    const state = {
      currentPage: 1,
      pageCount: pageData.pagecount,
      imagelist: pageData.imagelist,
      galleryId: galleryId,
      imageCache: new Map(), // pageIndex -> { img, status: 'loaded'|'loading'|'error', promise }
      settings: {
        fitMode: 'contain',
        menuVisible: false,  // 初始隐藏底部菜单
        darkMode: true,  // 默认启用深色模式
        imageScale: 1,     // 图片缩放比例
        imageOffsetX: 0,   // 图片X偏移
        imageOffsetY: 0,   // 图片Y偏移
        thumbnailsHover: false, // 顶部开关：鼠标靠近底部时显示缩略图
        readMode: 'single' // 阅读模式：single | continuous-vertical | continuous-horizontal
      }
    };

    // 读取上次阅读进度
    function loadProgress() {
      try {
        const saved = localStorage.getItem(`eh-progress-${state.galleryId}`);
        if (saved) {
          const progress = JSON.parse(saved);
          return progress.page || 1;
        }
      } catch (e) {
        console.warn('[EH Modern Reader] 读取进度失败:', e);
      }
      return 1;
    }

    // 保存阅读进度
    function saveProgress(page) {
      try {
        localStorage.setItem(`eh-progress-${state.galleryId}`, JSON.stringify({
          page: page,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('[EH Modern Reader] 保存进度失败:', e);
      }
    }

    // 获取 DOM 元素（带判空）
    const elements = {
      currentImage: document.getElementById('eh-current-image'),
      loading: document.getElementById('eh-loading'),
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
      thumbnailsToggleBtn: document.getElementById('eh-thumbnails-toggle-btn'),
      settingsPanel: document.getElementById('eh-settings-panel'),
      closeSettingsBtn: document.getElementById('eh-close-settings'),
      fitModeSelect: document.getElementById('eh-fit-mode'),
      readModeSelect: document.getElementById('eh-read-mode')
    };
    // 验证必要的 DOM 元素
    const requiredElements = ['currentImage', 'viewer', 'thumbnails'];
    const missingElements = requiredElements.filter(key => !elements[key]);
    if (missingElements.length > 0) {
      throw new Error(`缺少必要的 DOM 元素: ${missingElements.join(', ')}`);
    }

    // 显示加载状态
    function showLoading() {
      if (elements.loading) elements.loading.style.display = 'flex';
    }

    function hideLoading() {
      if (elements.loading) elements.loading.style.display = 'none';
    }

    // 获取图片 URL - E-Hentai MPV 使用 API 动态加载
    function getImageUrl(pageIndex) {
      const imageData = state.imagelist[pageIndex];
      if (!imageData) return null;
      
      // E-Hentai MPV 格式: {n: 'filename', k: 'key', t: 'thumbnail'}
      // 我们需要使用 E-Hentai API 来获取完整图片
      if (typeof imageData === 'object' && imageData.k) {
        // 返回图片页面 URL，让浏览器处理加载
        return `https://e-hentai.org/s/${imageData.k}/${pageData.gid}-${pageIndex + 1}`;
      }
      
      // 兼容其他格式
      if (Array.isArray(imageData)) {
        if (typeof imageData[0] === 'string' && imageData[0].startsWith('http')) {
          return imageData[0];
        }
        const key = imageData[0];
        return `https://e-hentai.org/s/${key}/${pageData.gid}-${pageIndex + 1}`;
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
    
    // 从 E-Hentai 图片页面提取真实图片 URL
    async function fetchRealImageUrl(pageUrl, abortSignal) {
      try {
        console.log('[EH Modern Reader] 开始获取图片页面:', pageUrl);
        
        const response = await fetch(pageUrl, { signal: abortSignal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        console.log('[EH Modern Reader] 页面 HTML 长度:', html.length);
        
        // 从页面中提取图片 URL (主要方法)
        const match = html.match(/<img[^>]+id="img"[^>]+src="([^"]+)"/);
        if (match && match[1]) {
          console.log('[EH Modern Reader] 找到图片 URL (方法1):', match[1]);
          return match[1];
        }
        
        // 尝试备用匹配模式
        const match2 = html.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp)[^"]*)"/i);
        if (match2 && match2[1]) {
          console.log('[EH Modern Reader] 找到图片 URL (方法2):', match2[1]);
          return match2[1];
        }
        
        // 尝试直接匹配 URL
        const match3 = html.match(/(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp))/i);
        if (match3 && match3[1]) {
          console.log('[EH Modern Reader] 找到图片 URL (方法3):', match3[1]);
          return match3[1];
        }
        
        console.error('[EH Modern Reader] 无法从页面提取图片 URL');
        console.log('[EH Modern Reader] HTML 片段:', html.substring(0, 1000));
        throw new Error('无法从页面提取图片 URL');
      } catch (error) {
        if (abortSignal && abortSignal.aborted) {
          console.warn('[EH Modern Reader] 图片页面请求已取消:', pageUrl);
          return null;
        }
        console.error('[EH Modern Reader] 获取图片 URL 失败:', pageUrl, error);
        throw error;
      }
    }

    // 加载图片
    async function loadImage(pageIndex) {
      try {
        // 缓存命中：直接返回
        if (state.imageCache.has(pageIndex)) {
          const cached = state.imageCache.get(pageIndex);
          if (cached.status === 'loaded' && cached.img) return cached.img;
          if (cached.status === 'loading' && cached.promise) return cached.promise;
        }

        const pageUrl = getImageUrl(pageIndex);
        if (!pageUrl) {
          throw new Error('图片 URL 不存在');
        }

        console.log('[EH Modern Reader] 获取图片页面:', pageUrl);

        // 如果是 E-Hentai 的图片页面 URL，需要先获取真实图片 URL
        if (pageUrl.includes('/s/')) {
          // 每次请求创建新的 AbortController，旧的在竞态中会被忽略
          const controller = new AbortController();
          const realImageUrl = await fetchRealImageUrl(pageUrl, controller.signal);
          if (!realImageUrl) {
            throw new Error('无法获取真实图片 URL');
          }

          console.log('[EH Modern Reader] 真实图片 URL:', realImageUrl);

          // 建立加载中的 Promise 并写入缓存，避免重复并发
          const pending = new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
              console.log('[EH Modern Reader] 图片加载成功:', realImageUrl);
              state.imageCache.set(pageIndex, { status: 'loaded', img });
              resolve(img);
            };

            img.onerror = (e) => {
              console.error('[EH Modern Reader] 图片加载失败:', realImageUrl, e);
              state.imageCache.set(pageIndex, { status: 'error' });
              reject(new Error(`图片加载失败: ${realImageUrl}`));
            };

            img.src = realImageUrl;

            // 超时处理 (30秒)
            setTimeout(() => {
              if (!img.complete) {
                state.imageCache.set(pageIndex, { status: 'error' });
                reject(new Error('图片加载超时'));
              }
            }, 30000);
          });

          state.imageCache.set(pageIndex, { status: 'loading', promise: pending });
          return pending;
        }
        
        // 如果已经是直接的图片 URL
        const pending = new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            state.imageCache.set(pageIndex, { status: 'loaded', img });
            resolve(img);
          };
          img.onerror = (e) => {
            console.error('[EH Modern Reader] 图片加载失败:', pageUrl, e);
            state.imageCache.set(pageIndex, { status: 'error' });
            reject(new Error(`图片加载失败: ${pageUrl}`));
          };
          img.src = pageUrl;
        });
        state.imageCache.set(pageIndex, { status: 'loading', promise: pending });
        return pending;
      } catch (error) {
        console.error('[EH Modern Reader] loadImage 错误:', error);
        throw error;
      }
    }

    // 延时合并跳转与竞态控制
    let navTimer = null;
    let navDelay = 140; // 合并跳转延时(ms)
    let lastRequestedPage = null;
    let loadToken = 0; // 用于竞态控制

    function scheduleShowPage(pageNum) {
      if (pageNum < 1 || pageNum > state.pageCount) return;
      lastRequestedPage = pageNum;
      if (navTimer) clearTimeout(navTimer);
      navTimer = setTimeout(() => {
        navTimer = null;
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
      if (!targetLoaded) {
        if (!elements.currentImage || !elements.currentImage.src || elements.currentImage.style.display === 'none') {
          showLoading();
        }
      }

      try {
        const img = await loadImage(targetIndex);

        // 竞态检查：如果在加载期间发起了新的跳转请求，则丢弃当前结果
        if (typeof tokenCheck === 'number' && tokenCheck !== loadToken) {
          return; // 丢弃过期加载
        }
        
        // 隐藏加载状态
        hideLoading();
        
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

        // 更新进度条位置
        if (elements.progressBar) {
          elements.progressBar.value = pageNum;
        }

        if (elements.pageInput) {
          elements.pageInput.value = pageNum;
        }

        console.log('[EH Modern Reader] 显示页面:', pageNum, '图片 URL:', img.src);

        // 预加载策略：预加载下一页和上一页（提升切换体验）
        preloadAdjacentPages(pageNum);

      } catch (error) {
        console.error('[EH Modern Reader] 加载图片失败:', error);
        hideLoading();
        
        // 显示错误信息
        if (elements.currentImage) {
          elements.currentImage.style.display = 'none';
        }
        
        alert(`图片加载失败 (第 ${pageNum} 页): ${error.message}\n\n请刷新页面重试。`);
      }
    }

    // 预加载相邻页面（提升切换体验）
    function preloadAdjacentPages(currentPage) {
      const pagesToPreload = [];
      
      // 预加载下一页
      if (currentPage < state.pageCount) {
        pagesToPreload.push(currentPage); // loadImage 使用 index，所以 currentPage 对应下一页
      }
      
      // 预加载上一页
      if (currentPage > 1) {
        pagesToPreload.push(currentPage - 2); // currentPage - 2 对应上一页的 index
      }
      
      // 异步预加载，不阻塞主流程
      pagesToPreload.forEach(pageIndex => {
        loadImage(pageIndex).catch(error => {
          console.log(`[EH Modern Reader] 预加载失败 (页面 ${pageIndex + 1}):`, error.message);
        });
      });
    }

    // 更新缩略图高亮（优化性能，只操作当前和上一个）
    function updateThumbnailHighlight(pageNum) {
      const thumbnails = document.querySelectorAll('.eh-thumbnail');
      if (!thumbnails || thumbnails.length === 0) return;

      const currentThumb = thumbnails[pageNum - 1];
      const prevActiveThumb = document.querySelector('.eh-thumbnail.active');
      
      // 移除旧的高亮
      if (prevActiveThumb && prevActiveThumb !== currentThumb) {
        prevActiveThumb.classList.remove('active');
      }
      
      // 添加新的高亮
      if (currentThumb) {
        currentThumb.classList.add('active');
        // 平滑滚动到当前缩略图
        currentThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    // 生成缩略图
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
      
      state.imagelist.forEach((imageData, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'eh-thumbnail';
        if (index === 0) thumb.classList.add('active');
        
        const pageNum = index + 1;
        thumb.innerHTML = `
          <div class="eh-thumbnail-placeholder" title="第 ${pageNum} 页" role="img" aria-label="缩略图 ${pageNum}">
            <span style="display: none;">${pageNum}</span>
          </div>
          <div class="eh-thumbnail-number">${pageNum}</div>
        `;

  thumb.onclick = () => scheduleShowPage(pageNum);
        elements.thumbnails.appendChild(thumb);

        // 缩略图加载逻辑
        loadThumbnail(thumb, imageData, pageNum);
      });
    }

    // 加载单个缩略图（支持容错和默认图）
    function loadThumbnail(thumb, imageData, pageNum) {
      const placeholder = thumb.querySelector('.eh-thumbnail-placeholder');
      if (!placeholder) return;

      // 添加 loading 状态
      placeholder.classList.add('loading');

      // 数据校验
      if (!imageData || !imageData.t || typeof imageData.t !== 'string') {
        console.warn(`[EH Modern Reader] 缩略图 ${pageNum} 数据无效，使用默认图`);
        setDefaultThumbnail(placeholder);
        return;
      }

      try {
        // 提取 URL 和位置 - 修正: Y坐标可能没有px单位
        const match = imageData.t.match(/\(([^)]+)\)\s+(-?\d+px)\s+(-?\d+(?:px)?)/) || 
                     imageData.t.match(/url\("?([^")]+)"?\)\s+(-?\d+px)\s+(-?\d+(?:px)?)/);
        
        if (!match) {
          console.warn(`[EH Modern Reader] 缩略图 ${pageNum} 格式错误:`, imageData.t);
          setDefaultThumbnail(placeholder);
          return;
        }

        let [, url, xPos, yPos] = match;
        
        // 参数校验
        if (!url || !xPos || !yPos) {
          console.warn(`[EH Modern Reader] 缩略图 ${pageNum} 参数不完整`);
          setDefaultThumbnail(placeholder);
          return;
        }

        // 确保Y坐标有px单位
        if (!yPos.endsWith('px')) {
          yPos = yPos + 'px';
        }
        
        // E-Hentai sprite sheet: 每张缩略图200x281px
        // 我们缩放到50x70px (缩放因子 0.25)
        const xOffset = parseInt(xPos);
        const yOffset = parseInt(yPos);
        
        // 参数验证
        if (isNaN(xOffset) || isNaN(yOffset)) {
          console.warn(`[EH Modern Reader] 缩略图 ${pageNum} 位置参数无效`);
          setDefaultThumbnail(placeholder);
          return;
        }

        const scale = 0.25; // 缩放因子
        const scaledX = Math.round(xOffset * scale);
        const scaledY = Math.round(yOffset * scale);
        
        // 计算sprite sheet的总宽度
        // E-Hentai通常一行20张图片: 20 * 200px = 4000px
        // 缩放后: 4000 * 0.25 = 1000px
        const spriteSheetWidth = 1000;
        
        // 添加加载错误处理
        const testImg = new Image();
        
        testImg.onerror = () => {
          console.warn(`[EH Modern Reader] 缩略图 ${pageNum} 加载失败:`, url);
          setDefaultThumbnail(placeholder);
        };
        
        testImg.onload = () => {
          // 移除 loading 状态
          placeholder.classList.remove('loading');
          
          // 设置背景图和位置
          placeholder.style.backgroundImage = `url("${url}")`;
          placeholder.style.backgroundPosition = `${scaledX}px ${scaledY}px`;
          placeholder.style.backgroundRepeat = 'no-repeat';
          placeholder.style.backgroundSize = `${spriteSheetWidth}px auto`;
          
          // 隐藏页码数字(因为有真实缩略图了)
          const pageNumSpan = placeholder.querySelector('span');
          if (pageNumSpan) pageNumSpan.style.display = 'none';
        };
        
        testImg.src = url;
        
      } catch (e) {
        console.error(`[EH Modern Reader] 缩略图 ${pageNum} 解析失败:`, e, imageData.t);
        setDefaultThumbnail(placeholder);
      }
    }

    // 设置默认缩略图
    function setDefaultThumbnail(placeholder) {
      if (!placeholder) return;
      
      // 移除 loading 状态
      placeholder.classList.remove('loading');
      
      // 添加错误状态
      placeholder.classList.add('error');
      
      // 使用渐变色作为默认背景
      placeholder.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      placeholder.style.backgroundSize = 'cover';
      
      // 显示 placeholder 内的页码（作为备用显示）
      const pageNumSpan = placeholder.querySelector('span');
      if (pageNumSpan) {
        pageNumSpan.style.display = 'block';
        pageNumSpan.style.color = 'rgba(255, 255, 255, 0.9)';
        pageNumSpan.style.fontSize = '14px';  // 改小一点，避免与外部数字冲突
        pageNumSpan.style.fontWeight = '600';
      }
    }

    // 事件监听
    if (elements.prevBtn) {
  elements.prevBtn.onclick = () => scheduleShowPage(state.currentPage - 1);
    }

    if (elements.nextBtn) {
  elements.nextBtn.onclick = () => scheduleShowPage(state.currentPage + 1);
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

    // 点击图片中央区域不再切换底部菜单（统一由顶部开关+悬停控制）
    if (elements.viewer) {
      elements.viewer.onclick = (e) => {
        // 排除按钮、缩略图、进度条、图片本身的点击
        if (e.target.tagName === 'BUTTON' || 
            e.target.closest('button') || 
            e.target.closest('#eh-bottom-menu') ||
            e.target.tagName === 'IMG') {
          return;
        }
        
        // 阻止事件冒泡
        e.stopPropagation();
        return;
      };
    }

    if (elements.themeBtn) {
      elements.themeBtn.onclick = () => {
        state.settings.darkMode = !state.settings.darkMode;
        document.body.classList.toggle('eh-dark-mode');
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

    if (elements.closeSettingsBtn) {
      elements.closeSettingsBtn.onclick = () => {
        console.log('[EH Modern Reader] 关闭设置面板');
        if (elements.settingsPanel) {
          elements.settingsPanel.classList.add('eh-hidden');
        }
      };
    }

    if (elements.progressBar) {
      elements.progressBar.onchange = () => {
        scheduleShowPage(parseInt(elements.progressBar.value));
      };
    }

    if (elements.pageInput) {
      elements.pageInput.onchange = () => {
        const pageNum = parseInt(elements.pageInput.value);
        if (pageNum >= 1 && pageNum <= state.pageCount) {
          scheduleShowPage(pageNum);
        }
      };
    }

    if (elements.fitModeSelect) {
      elements.fitModeSelect.onchange = () => {
        state.settings.fitMode = elements.fitModeSelect.value;
        if (elements.currentImage) {
          elements.currentImage.style.objectFit = state.settings.fitMode;
        }
      };
    }

    if (elements.readModeSelect) {
      elements.readModeSelect.onchange = () => {
        state.settings.readMode = elements.readModeSelect.value;
        console.log('[EH Modern Reader] 阅读模式切换为:', state.settings.readMode);
        // 预留：连续模式布局未来实现，这里仅记录设置。
      };
    }

    // 进度条拖动事件
    if (elements.progressBar) {
      elements.progressBar.oninput = () => {
        // 不执行即时跳转，等待最终停留
      };
      elements.progressBar.onchange = (e) => {
        const page = parseInt(e.target.value);
        scheduleShowPage(page);
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

    // 键盘导航和缩放
    document.addEventListener('keydown', (e) => {
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
        case 'ArrowLeft':
        case 'a':
        case 'A':
          scheduleShowPage(state.currentPage - 1);
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
        case ' ':
          scheduleShowPage(state.currentPage + 1);
          e.preventDefault();
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
    
    // 加载上次阅读进度
    const savedPage = loadProgress();
    internalShowPage(savedPage);
    // 默认隐藏底部菜单（仅在开启“缩略图悬停开关”且靠近底部时显示）
    if (elements.bottomMenu) {
      elements.bottomMenu.classList.add('eh-menu-hidden');
    }

    // 顶部缩略图悬停开关按钮
    if (elements.thumbnailsToggleBtn) {
      const updateToggleVisual = () => {
        if (state.settings.thumbnailsHover) {
          elements.thumbnailsToggleBtn.classList.add('eh-active');
        } else {
          elements.thumbnailsToggleBtn.classList.remove('eh-active');
        }
      };
      updateToggleVisual();
      elements.thumbnailsToggleBtn.onclick = () => {
        state.settings.thumbnailsHover = !state.settings.thumbnailsHover;
        updateToggleVisual();
        if (elements.bottomMenu) {
          if (state.settings.thumbnailsHover) {
            // 开启悬停模式时默认隐藏，鼠标靠近底部再显示
            elements.bottomMenu.classList.add('eh-menu-hidden');
          } else {
            // 关闭悬停模式时按菜单显隐状态显示
            if (state.settings.menuVisible) {
              elements.bottomMenu.classList.remove('eh-menu-hidden');
            } else {
              elements.bottomMenu.classList.add('eh-menu-hidden');
            }
          }
        }
      };
    }

    // 根据鼠标位置动态显示/隐藏底部菜单（仅在开启悬停模式时）
    document.addEventListener('mousemove', (e) => {
      if (!state.settings.thumbnailsHover || !elements.bottomMenu) return;
      const viewportHeight = window.innerHeight;
      const threshold = 140; // 距离底部阈值
      const distanceFromBottom = viewportHeight - e.clientY;
      if (distanceFromBottom < threshold) {
        // 显示
        elements.bottomMenu.classList.remove('eh-menu-hidden');
      } else {
        elements.bottomMenu.classList.add('eh-menu-hidden');
      }
    });
    
    // 应用默认深色模式
    if (state.settings.darkMode) {
      document.body.classList.add('eh-dark-mode');
    }

    console.log('[EH Modern Reader] 阅读器初始化完成，从第', savedPage, '页继续阅读');
  }

  /**
   * 初始化
   */
  function init() {
    try {
      // 等待 DOM 加载完成
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          try {
            const pageData = extractPageData();
            if (pageData.imagelist && pageData.imagelist.length > 0) {
              injectModernReader(pageData);
            } else {
              console.error('[EH Modern Reader] 无法提取页面数据或图片列表为空');
              alert('EH Modern Reader: 无法加载图片列表，请刷新页面重试。');
            }
          } catch (e) {
            console.error('[EH Modern Reader] 初始化失败:', e);
            alert(`EH Modern Reader 初始化失败: ${e.message}\n\n请刷新页面重试或联系开发者。`);
          }
        });
      } else {
        const pageData = extractPageData();
        if (pageData.imagelist && pageData.imagelist.length > 0) {
          injectModernReader(pageData);
        } else {
          console.error('[EH Modern Reader] 无法提取页面数据或图片列表为空');
          alert('EH Modern Reader: 无法加载图片列表，请刷新页面重试。');
        }
      }
    } catch (e) {
      console.error('[EH Modern Reader] 初始化失败:', e);
      alert(`EH Modern Reader 初始化失败: ${e.message}\n\n请刷新页面重试或联系开发者。`);
    }
  }

  init();
})();
