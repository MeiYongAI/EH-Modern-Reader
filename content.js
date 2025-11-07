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

  /**
   * 从原页面提取必要数据
   */
  function extractPageData() {
    const scriptTags = document.querySelectorAll('script');
    let pageData = {};

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
            <button id="eh-mode-toggle-btn" class="eh-icon-btn" title="连续模式">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 7h18M3 12h18M3 17h18"/>
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
              <div id="eh-continuous" class="eh-continuous" style="display:none;"></div>
            </div>

            <!-- 翻页按钮 -->
            <button id="eh-prev-btn" class="eh-nav-btn eh-nav-prev" title="上一页 (←)">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
            </div>
          </div>
        </footer>
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
      loadToken: 0, // 跳转请求令牌，保证只应用最后一次
      settings: {
        fitMode: 'contain', // 未来可移除（阅读设置将精简）
        menuVisible: true,  // 底部菜单是否显示
        darkMode: true,  // 默认启用深色模式
        imageScale: 1,     // 图片缩放比例
        imageOffsetX: 0,   // 图片X偏移
        imageOffsetY: 0,   // 图片Y偏移
        thumbnailsHover: false // 顶部开关：鼠标靠近底部时显示缩略图
      }
    };

    // 惰性跳转相关变量（滑动进度条或快速点击触发时，只跳最终目标）
    let pendingTargetPage = null;
    let deferredTimer = null;

    function scheduleDeferredJump(immediate = false) {
      if (deferredTimer) {
        clearTimeout(deferredTimer);
        deferredTimer = null;
      }
      if (immediate) {
        if (pendingTargetPage && pendingTargetPage !== state.currentPage) {
          showPage(pendingTargetPage);
        }
        pendingTargetPage = null;
        return;
      }
      deferredTimer = setTimeout(() => {
        if (pendingTargetPage && pendingTargetPage !== state.currentPage) {
          showPage(pendingTargetPage);
        }
        pendingTargetPage = null;
      }, 250); // 250ms 无继续操作则跳转
    }

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
      thumbnails: document.getElementById('eh-thumbnails'),
      thumbnailsContainer: document.getElementById('eh-thumbnails-container'),
      bottomMenu: document.getElementById('eh-bottom-menu'),
      viewer: document.getElementById('eh-viewer'),
      prevBtn: document.getElementById('eh-prev-btn'),
      nextBtn: document.getElementById('eh-next-btn'),
      closeBtn: document.getElementById('eh-close-btn'),
      themeBtn: document.getElementById('eh-theme-btn'),
      fullscreenBtn: document.getElementById('eh-fullscreen-btn'),
      modeToggleBtn: document.getElementById('eh-mode-toggle-btn'),
      thumbnailsToggleBtn: document.getElementById('eh-thumbnails-toggle-btn')
    };

      if (elements.modeToggleBtn) {
        elements.modeToggleBtn.onclick = () => {
          state.settings.continuous = !state.settings.continuous;
          elements.modeToggleBtn.classList.toggle('eh-active', state.settings.continuous);
          if (state.settings.continuous) {
            // 进入连续模式：预加载所有已读附近图片并展示滚动容器
            enterContinuousMode();
          } else {
            exitContinuousMode();
          }
        };
      }

      function enterContinuousMode() {
        const container = document.getElementById('eh-continuous');
        if (!container) return;
        container.style.display = 'block';
        // 清空并填充当前/后续若干页的图片（惰性加载）
        container.innerHTML = '';
        const range = Math.min(state.pageCount, state.currentPage + 5);
        for (let i = state.currentPage - 1; i < range; i++) {
          const wrapper = document.createElement('div');
          wrapper.className = 'eh-continuous-item';
          const imgEl = document.createElement('img');
          imgEl.alt = `第 ${i + 1} 页`;
          wrapper.appendChild(imgEl);
          container.appendChild(wrapper);
          loadImage(i).then(img => {
            imgEl.src = img.src;
          }).catch(() => {
            imgEl.style.display = 'none';
          });
        }
        if (elements.currentImage) {
          elements.currentImage.style.display = 'none';
        }
      }

      function exitContinuousMode() {
        const container = document.getElementById('eh-continuous');
        if (!container) return;
        container.style.display = 'none';
        if (elements.currentImage) {
          elements.currentImage.style.display = 'block';
        }
      }
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
    async function fetchRealImageUrl(pageUrl) {
      try {
        console.log('[EH Modern Reader] 开始获取图片页面:', pageUrl);
        
        const response = await fetch(pageUrl);
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
          const realImageUrl = await fetchRealImageUrl(pageUrl);
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

    // 显示指定页面
    async function showPage(pageNum) {
      if (pageNum < 1 || pageNum > state.pageCount) return;
      const token = ++state.loadToken;
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
        
  // 仅当请求仍然最新时应用
  if (token !== state.loadToken) return;

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

        // 去除底部重复页码显示（顶部已有）

        if (elements.progressBar) {
          elements.progressBar.value = pageNum;
        }

        if (elements.pageInput) {
          elements.pageInput.value = pageNum;
        }

        // 取消进度条填充，仅保留拖动球

  // 更新缩略图高亮
  updateThumbnailHighlight(pageNum);

        // 保存阅读进度
        saveProgress(pageNum);

        console.log('[EH Modern Reader] 显示页面:', pageNum, '图片 URL:', img.src);

        // 预加载策略：预加载下一页和上一页（提升切换体验）
        preloadAdjacentPages(pageNum);

      } catch (error) {
        console.error('[EH Modern Reader] 加载图片失败:', error);
        if (token === state.loadToken) hideLoading();
        
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

  thumb.onclick = () => { pendingTargetPage = pageNum; scheduleDeferredJump(); };
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
      elements.prevBtn.onclick = () => { pendingTargetPage = Math.max(1, state.currentPage - 1); scheduleDeferredJump(); };
    }

    if (elements.nextBtn) {
      elements.nextBtn.onclick = () => { pendingTargetPage = Math.min(state.pageCount, state.currentPage + 1); scheduleDeferredJump(); };
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

    // 点击图片中央区域切换底部菜单显示/隐藏
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

        // 悬停模式下，不响应点击切换，交给鼠标位置控制
        if (state.settings.thumbnailsHover) return;

        state.settings.menuVisible = !state.settings.menuVisible;
        if (elements.bottomMenu) {
          if (state.settings.menuVisible) {
            elements.bottomMenu.classList.remove('eh-menu-hidden');
          } else {
            elements.bottomMenu.classList.add('eh-menu-hidden');
          }
        }
      };
    }

    if (elements.themeBtn) {
      elements.themeBtn.onclick = () => {
        state.settings.darkMode = !state.settings.darkMode;
        document.body.classList.toggle('eh-dark-mode');
        // 动态替换图标：暗色模式显示太阳，浅色显示月亮
        const svg = elements.themeBtn.querySelector('svg');
        if (svg) {
          svg.innerHTML = state.settings.darkMode
            ? '<path d="M12 4.5a1 1 0 0 1 1 1V8a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1zm0 11a1 1 0 0 1 1 1V19a1 1 0 1 1-2 0v-2.5a1 1 0 0 1 1-1zm7.5-3.5a1 1 0 0 1-1 1H16a1 1 0 1 1 0-2h2.5a1 1 0 0 1 1 1zM9 12a1 1 0 0 1-1 1H5.5a1 1 0 0 1 0-2H8a1 1 0 0 1 1 1zm8.303 5.303a1 1 0 0 1-1.414 0l-1.327-1.327a1 1 0 0 1 1.414-1.414l1.327 1.327a1 1 0 0 1 0 1.414zM9.024 9.024a1 1 0 0 1-1.414 0L6.283 7.697A1 1 0 0 1 7.697 6.283l1.327 1.327a1 1 0 0 1 0 1.414zm7.606-4.02-1.327 1.327a1 1 0 0 1-1.414-1.414l1.327-1.327a1 1 0 0 1 1.414 1.414zM9.024 14.976l-1.327 1.327a1 1 0 0 1-1.414-1.414l1.327-1.327a1 1 0 1 1 1.414 1.414zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' // 太阳
            : '<path d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.79 9.79z" />'; // 月亮
        }
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
    // 移除旧的设置面板相关事件

    // 进度条拖动事件
    if (elements.progressBar) {
      elements.progressBar.oninput = (e) => {
        // 惰性跳转：不立即加载，等待用户停止拖动或 250ms 未继续操作
        const page = parseInt(e.target.value);
        pendingTargetPage = page;
        scheduleDeferredJump();
      };

      elements.progressBar.onchange = (e) => {
        const page = parseInt(e.target.value);
        pendingTargetPage = page;
        scheduleDeferredJump(true); // 立即跳转最终位置
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

    // 键盘导航和缩放（快速连击时仅跳到最终页）
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
          pendingTargetPage = Math.max(1, state.currentPage - 1);
          scheduleDeferredJump();
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
        case ' ':
          pendingTargetPage = Math.min(state.pageCount, state.currentPage + 1);
          scheduleDeferredJump();
          e.preventDefault();
          break;
        case 'Home':
          pendingTargetPage = 1;
          scheduleDeferredJump(true);
          e.preventDefault();
          break;
        case 'End':
          pendingTargetPage = state.pageCount;
          scheduleDeferredJump(true);
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
    showPage(savedPage);

    // 顶部缩略图悬停开关按钮
    if (elements.thumbnailsToggleBtn) {
      const updateToggleVisual = () => {
        if (state.settings.thumbnailsHover) {
          elements.thumbnailsToggleBtn.classList.add('eh-active');
          if (elements.bottomMenu) elements.bottomMenu.classList.add('show-thumbnails');
        } else {
          elements.thumbnailsToggleBtn.classList.remove('eh-active');
          if (elements.bottomMenu) elements.bottomMenu.classList.remove('show-thumbnails');
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
            elements.bottomMenu.classList.add('show-thumbnails');
          } else {
            // 关闭悬停模式时按菜单显隐状态显示
            if (state.settings.menuVisible) {
              elements.bottomMenu.classList.remove('eh-menu-hidden');
            } else {
              elements.bottomMenu.classList.add('eh-menu-hidden');
            }
            elements.bottomMenu.classList.remove('show-thumbnails');
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
        elements.bottomMenu.classList.add('show-thumbnails');
      } else {
        elements.bottomMenu.classList.add('eh-menu-hidden');
        // 不移除 show-thumbnails，保持悬停模式视觉一致，仅整体隐藏
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
