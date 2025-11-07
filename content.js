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

    for (let script of scriptTags) {
      const content = script.textContent;
      
      // 提取图片列表
      const imagelistMatch = content.match(/var imagelist = (\[.*?\]);/s);
      if (imagelistMatch) {
        try {
          pageData.imagelist = JSON.parse(imagelistMatch[1]);
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

    return pageData;
  }

  /**
   * 替换原页面内容
   */
  function injectModernReader(pageData) {
    // 清空原页面
    document.body.innerHTML = '';
    document.body.className = 'eh-modern-reader';

    // 创建新的阅读器结构
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
            <span id="eh-page-info">1 / ${pageData.pagecount}</span>
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
          </div>
        </header>

        <!-- 主内容区 -->
        <main id="eh-main">
          <!-- 缩略图侧边栏 -->
          <aside id="eh-sidebar" class="eh-sidebar-visible">
            <div class="eh-sidebar-header">
              <span>缩略图</span>
              <button id="eh-toggle-sidebar" class="eh-icon-btn-small">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
            </div>
            <div id="eh-thumbnails" class="eh-thumbnails"></div>
          </aside>

          <!-- 图片显示区 -->
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

        <!-- 底部进度条 -->
        <footer id="eh-footer">
          <div class="eh-progress-container">
            <input 
              type="range" 
              id="eh-progress-bar" 
              min="1" 
              max="${pageData.pagecount}" 
              value="1" 
              class="eh-progress-bar"
            />
            <div class="eh-progress-fill" style="width: 0%"></div>
          </div>
          <div class="eh-footer-controls">
            <button id="eh-first-page" class="eh-btn-small" title="第一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
              </svg>
            </button>
            <input type="number" id="eh-page-input" min="1" max="${pageData.pagecount}" value="1" />
            <button id="eh-last-page" class="eh-btn-small" title="最后一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
              </svg>
            </button>
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
    console.log('[EH Modern Reader] 初始化阅读器，页面数:', pageData.pagecount);
    console.log('[EH Modern Reader] 图片列表:', pageData.imagelist);

    // 阅读器状态
    const state = {
      currentPage: 1,
      pageCount: pageData.pagecount,
      imagelist: pageData.imagelist,
      settings: {
        fitMode: 'contain',
        sidebarVisible: true,
        darkMode: false
      }
    };

    // 获取 DOM 元素
    const elements = {
      currentImage: document.getElementById('eh-current-image'),
      loading: document.getElementById('eh-loading'),
      pageInfo: document.getElementById('eh-page-info'),
      progressBar: document.getElementById('eh-progress-bar'),
      pageInput: document.getElementById('eh-page-input'),
      thumbnails: document.getElementById('eh-thumbnails'),
      sidebar: document.getElementById('eh-sidebar'),
      prevBtn: document.getElementById('eh-prev-btn'),
      nextBtn: document.getElementById('eh-next-btn'),
      closeBtn: document.getElementById('eh-close-btn'),
      toggleSidebarBtn: document.getElementById('eh-toggle-sidebar'),
      themeBtn: document.getElementById('eh-theme-btn'),
      fullscreenBtn: document.getElementById('eh-fullscreen-btn'),
      settingsBtn: document.getElementById('eh-settings-btn'),
      fitModeSelect: document.getElementById('eh-fit-mode')
    };

    // 显示加载状态
    function showLoading() {
      if (elements.loading) elements.loading.style.display = 'flex';
    }

    function hideLoading() {
      if (elements.loading) elements.loading.style.display = 'none';
    }

    // 获取图片 URL
    function getImageUrl(pageIndex) {
      const imageData = state.imagelist[pageIndex];
      if (!imageData) return null;
      // E-Hentai imagelist 中的图片 URL 在不同字段中
      return imageData.url || imageData.src || imageData;
    }

    // 加载图片
    function loadImage(pageIndex) {
      return new Promise((resolve, reject) => {
        const imageUrl = getImageUrl(pageIndex);
        if (!imageUrl) {
          reject(new Error('图片 URL 不存在'));
          return;
        }

        console.log('[EH Modern Reader] 加载图片:', imageUrl);

        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = imageUrl;
      });
    }

    // 显示指定页面
    async function showPage(pageNum) {
      if (pageNum < 1 || pageNum > state.pageCount) return;

      state.currentPage = pageNum;
      showLoading();

      try {
        const img = await loadImage(pageNum - 1);
        
        // 更新图片
        if (elements.currentImage) {
          elements.currentImage.src = img.src;
          elements.currentImage.style.display = 'block';
        }

        // 更新页码显示
        if (elements.pageInfo) {
          elements.pageInfo.textContent = `${pageNum} / ${state.pageCount}`;
        }

        if (elements.progressBar) {
          elements.progressBar.value = pageNum;
        }

        if (elements.pageInput) {
          elements.pageInput.value = pageNum;
        }

        // 更新缩略图高亮
        updateThumbnailHighlight(pageNum);

        console.log('[EH Modern Reader] 显示页面:', pageNum);
        hideLoading();

        // 预加载下一页
        if (pageNum < state.pageCount) {
          loadImage(pageNum).catch(() => {});
        }

      } catch (error) {
        console.error('[EH Modern Reader] 加载图片失败:', error);
        hideLoading();
        alert('图片加载失败: ' + error.message);
      }
    }

    // 更新缩略图高亮
    function updateThumbnailHighlight(pageNum) {
      const thumbnails = document.querySelectorAll('.eh-thumbnail');
      thumbnails.forEach((thumb, index) => {
        if (index === pageNum - 1) {
          thumb.classList.add('active');
          thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          thumb.classList.remove('active');
        }
      });
    }

    // 生成缩略图
    function generateThumbnails() {
      if (!elements.thumbnails) return;

      elements.thumbnails.innerHTML = '';
      
      state.imagelist.forEach((imageData, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'eh-thumbnail';
        if (index === 0) thumb.classList.add('active');
        
        const pageNum = index + 1;
        thumb.innerHTML = `
          <div class="eh-thumbnail-placeholder">
            <span>${pageNum}</span>
          </div>
          <div class="eh-thumbnail-number">${pageNum}</div>
        `;

        thumb.onclick = () => showPage(pageNum);
        elements.thumbnails.appendChild(thumb);

        // 异步加载缩略图
        const imageUrl = getImageUrl(index);
        if (imageUrl) {
          const img = new Image();
          img.onload = () => {
            thumb.querySelector('.eh-thumbnail-placeholder').style.backgroundImage = `url(${img.src})`;
          };
          img.src = imageUrl;
        }
      });
    }

    // 事件监听
    if (elements.prevBtn) {
      elements.prevBtn.onclick = () => showPage(state.currentPage - 1);
    }

    if (elements.nextBtn) {
      elements.nextBtn.onclick = () => showPage(state.currentPage + 1);
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

    if (elements.toggleSidebarBtn) {
      elements.toggleSidebarBtn.onclick = () => {
        state.settings.sidebarVisible = !state.settings.sidebarVisible;
        if (elements.sidebar) {
          elements.sidebar.classList.toggle('eh-sidebar-hidden');
        }
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

    if (elements.progressBar) {
      elements.progressBar.onchange = () => {
        showPage(parseInt(elements.progressBar.value));
      };
    }

    if (elements.pageInput) {
      elements.pageInput.onchange = () => {
        const pageNum = parseInt(elements.pageInput.value);
        if (pageNum >= 1 && pageNum <= state.pageCount) {
          showPage(pageNum);
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

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          showPage(state.currentPage - 1);
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
        case ' ':
          showPage(state.currentPage + 1);
          e.preventDefault();
          break;
        case 'Home':
          showPage(1);
          e.preventDefault();
          break;
        case 'End':
          showPage(state.pageCount);
          e.preventDefault();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
      }
    });

    // 鼠标滚轮翻页
    let wheelTimeout;
    document.addEventListener('wheel', (e) => {
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (e.deltaY > 0) {
          showPage(state.currentPage + 1);
        } else if (e.deltaY < 0) {
          showPage(state.currentPage - 1);
        }
      }, 100);
    }, { passive: true });

    // 初始化
    generateThumbnails();
    showPage(1);

    console.log('[EH Modern Reader] 阅读器初始化完成');
  }

  /**
   * 初始化
   */
  function init() {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const pageData = extractPageData();
        if (pageData.imagelist && pageData.imagelist.length > 0) {
          injectModernReader(pageData);
        } else {
          console.error('[EH Modern Reader] 无法提取页面数据');
        }
      });
    } else {
      const pageData = extractPageData();
      if (pageData.imagelist && pageData.imagelist.length > 0) {
        injectModernReader(pageData);
      } else {
        console.error('[EH Modern Reader] 无法提取页面数据');
      }
    }
  }

  init();
})();
