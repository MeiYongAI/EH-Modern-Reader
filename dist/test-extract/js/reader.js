/**
 * Reader.js - 主阅读器逻辑
 * 处理图片加载、翻页、键盘控制等核心功能
 */

(function() {
  'use strict';

  // 等待页面数据加载
  if (!window.ehReaderData) {
    console.error('[EH Reader] 页面数据未加载');
    return;
  }

  const pageData = window.ehReaderData;
  
  /**
   * 阅读器状态管理
   */
  const ReaderState = {
    currentPage: 1,
    pageCount: pageData.pagecount,
    imagelist: pageData.imagelist,
    settings: {
      fitMode: 'contain',
      alignMode: 'center',
      preloadNext: true,
      smoothScroll: true,
      darkMode: false,
      sidebarVisible: true
    },
    imageCache: new Map(),
    loadingQueue: new Set()
  };

  /**
   * DOM 元素引用
   */
  const Elements = {
    container: document.getElementById('eh-reader-container'),
    currentImage: document.getElementById('eh-current-image'),
    loading: document.getElementById('eh-loading'),
    pageInfo: document.getElementById('eh-page-info'),
    progressBar: document.getElementById('eh-progress-bar'),
    progressFill: document.querySelector('.eh-progress-fill'),
    pageInput: document.getElementById('eh-page-input'),
    thumbnails: document.getElementById('eh-thumbnails'),
    sidebar: document.getElementById('eh-sidebar'),
    settingsPanel: document.getElementById('eh-settings-panel'),
    
    // 按钮
    closeBtn: document.getElementById('eh-close-btn'),
    prevBtn: document.getElementById('eh-prev-btn'),
    nextBtn: document.getElementById('eh-next-btn'),
    firstPageBtn: document.getElementById('eh-first-page'),
    lastPageBtn: document.getElementById('eh-last-page'),
    fullscreenBtn: document.getElementById('eh-fullscreen-btn'),
    themeBtn: document.getElementById('eh-theme-btn'),
    settingsBtn: document.getElementById('eh-settings-btn'),
    closeSettingsBtn: document.getElementById('eh-close-settings'),
    toggleSidebarBtn: document.getElementById('eh-toggle-sidebar')
  };

  /**
   * 图片加载器
   */
  class ImageLoader {
    /**
     * 从缩略图数据构建完整图片 URL
     */
    static getImageUrl(pageIndex) {
      const imageData = ReaderState.imagelist[pageIndex];
      if (!imageData) return null;

      // E-Hentai 使用 API 获取完整图片
      // 这里简化处理，实际需要调用 API
      // 格式: https://e-hentai.org/s/{key}/{gid}-{page}
      const gid = pageData.gid;
      const key = imageData.k;
      const page = pageIndex + 1;
      
      return `https://e-hentai.org/s/${key}/${gid}-${page}`;
    }

    /**
     * 加载图片
     */
    static async loadImage(pageIndex) {
      if (ReaderState.imageCache.has(pageIndex)) {
        return ReaderState.imageCache.get(pageIndex);
      }

      if (ReaderState.loadingQueue.has(pageIndex)) {
        // 等待已有的加载请求
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (ReaderState.imageCache.has(pageIndex)) {
              clearInterval(checkInterval);
              resolve(ReaderState.imageCache.get(pageIndex));
            }
          }, 100);
        });
      }

      ReaderState.loadingQueue.add(pageIndex);

      try {
        const imageData = ReaderState.imagelist[pageIndex];
        
        // 使用原始的缩略图 URL（用于演示）
        // 生产环境需要通过 API 获取完整图片
        let imageUrl = this.getImageUrl(pageIndex);
        
        // 临时方案：使用缩略图 sprite
        if (imageData.t) {
          const match = imageData.t.match(/\(([^)]+)\)/);
          if (match) {
            imageUrl = match[1];
          }
        }

        const img = await this.preloadImage(imageUrl);
        ReaderState.imageCache.set(pageIndex, img);
        ReaderState.loadingQueue.delete(pageIndex);
        
        return img;
      } catch (error) {
        console.error(`[EH Reader] 加载图片 ${pageIndex} 失败:`, error);
        ReaderState.loadingQueue.delete(pageIndex);
        throw error;
      }
    }

    /**
     * 预加载图片
     */
    static preloadImage(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    }
  }

  /**
   * 页面控制器
   */
  class PageController {
    /**
     * 跳转到指定页
     */
    static async goToPage(pageNumber) {
      const page = Math.max(1, Math.min(pageNumber, ReaderState.pageCount));
      
      if (page === ReaderState.currentPage) {
        return;
      }

      ReaderState.currentPage = page;
      this.updateUI();
      
      // 显示加载动画
      Elements.loading.style.display = 'flex';
      Elements.currentImage.style.opacity = '0';

      try {
        const img = await ImageLoader.loadImage(page - 1);
        
        // 显示图片
        Elements.currentImage.src = img.src;
        Elements.currentImage.style.opacity = '1';
        Elements.loading.style.display = 'none';

        // 预加载下一页
        if (ReaderState.settings.preloadNext && page < ReaderState.pageCount) {
          ImageLoader.loadImage(page).catch(() => {});
        }

        // 保存进度
        this.saveProgress();
      } catch (error) {
        Elements.loading.style.display = 'none';
        alert('图片加载失败');
      }
    }

    /**
     * 上一页
     */
    static prevPage() {
      if (ReaderState.currentPage > 1) {
        this.goToPage(ReaderState.currentPage - 1);
      }
    }

    /**
     * 下一页
     */
    static nextPage() {
      if (ReaderState.currentPage < ReaderState.pageCount) {
        this.goToPage(ReaderState.currentPage + 1);
      }
    }

    /**
     * 更新 UI
     */
    static updateUI() {
      const page = ReaderState.currentPage;
      const total = ReaderState.pageCount;

      // 更新页码显示
      Elements.pageInfo.textContent = `${page} / ${total}`;
      Elements.pageInput.value = page;

      // 更新进度条
      Elements.progressBar.value = page;
      const progress = ((page - 1) / (total - 1)) * 100;
      Elements.progressFill.style.width = `${progress}%`;

      // 更新按钮状态
      Elements.prevBtn.disabled = page === 1;
      Elements.nextBtn.disabled = page === total;
      Elements.firstPageBtn.disabled = page === 1;
      Elements.lastPageBtn.disabled = page === total;

      // 高亮当前缩略图
      document.querySelectorAll('.eh-thumb').forEach((thumb, index) => {
        thumb.classList.toggle('active', index === page - 1);
      });

      // 滚动缩略图到可见位置
      const activeThumb = document.querySelector('.eh-thumb.active');
      if (activeThumb) {
        activeThumb.scrollIntoView({ 
          behavior: ReaderState.settings.smoothScroll ? 'smooth' : 'auto',
          block: 'nearest'
        });
      }
    }

    /**
     * 保存阅读进度
     */
    static saveProgress() {
      try {
        localStorage.setItem(`eh_reader_progress_${pageData.gid}`, ReaderState.currentPage);
      } catch (e) {
        console.warn('[EH Reader] 保存进度失败:', e);
      }
    }

    /**
     * 恢复阅读进度
     */
    static loadProgress() {
      try {
        const saved = localStorage.getItem(`eh_reader_progress_${pageData.gid}`);
        if (saved) {
          const page = parseInt(saved);
          if (page > 1 && page <= ReaderState.pageCount) {
            return page;
          }
        }
      } catch (e) {
        console.warn('[EH Reader] 读取进度失败:', e);
      }
      return 1;
    }
  }

  /**
   * 缩略图生成器
   */
  class ThumbnailGenerator {
    static generate() {
      ReaderState.imagelist.forEach((imageData, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'eh-thumb';
        thumb.dataset.page = index + 1;
        
        // 解析缩略图位置
        let thumbStyle = '';
        if (imageData.t) {
          const match = imageData.t.match(/\(([^)]+)\)\s*([\d-]+px)\s*([\d-]+)/);
          if (match) {
            const url = match[1];
            const xPos = match[2];
            const yPos = match[3];
            thumbStyle = `background: url('${url}') ${xPos} ${yPos}; background-size: 4000px auto;`;
          }
        }

        thumb.innerHTML = `
          <div class="eh-thumb-image" style="${thumbStyle}"></div>
          <div class="eh-thumb-number">${index + 1}</div>
        `;

        thumb.addEventListener('click', () => {
          PageController.goToPage(index + 1);
        });

        Elements.thumbnails.appendChild(thumb);
      });
    }
  }

  /**
   * 设置管理器
   */
  class SettingsManager {
    static init() {
      // 加载保存的设置
      this.loadSettings();

      // 应用设置到 UI
      document.getElementById('eh-fit-mode').value = ReaderState.settings.fitMode;
      document.getElementById('eh-align-mode').value = ReaderState.settings.alignMode;
      document.getElementById('eh-preload-next').checked = ReaderState.settings.preloadNext;
      document.getElementById('eh-smooth-scroll').checked = ReaderState.settings.smoothScroll;

      // 绑定设置变更事件
      document.getElementById('eh-fit-mode').addEventListener('change', (e) => {
        this.updateFitMode(e.target.value);
      });

      document.getElementById('eh-align-mode').addEventListener('change', (e) => {
        this.updateAlignMode(e.target.value);
      });

      document.getElementById('eh-preload-next').addEventListener('change', (e) => {
        ReaderState.settings.preloadNext = e.target.checked;
        this.saveSettings();
      });

      document.getElementById('eh-smooth-scroll').addEventListener('change', (e) => {
        ReaderState.settings.smoothScroll = e.target.checked;
        this.saveSettings();
      });
    }

    static loadSettings() {
      try {
        const saved = localStorage.getItem('eh_reader_settings');
        if (saved) {
          Object.assign(ReaderState.settings, JSON.parse(saved));
        }
      } catch (e) {
        console.warn('[EH Reader] 加载设置失败:', e);
      }

      // 应用暗色模式
      if (ReaderState.settings.darkMode) {
        document.body.classList.add('eh-dark-mode');
      }
    }

    static saveSettings() {
      try {
        localStorage.setItem('eh_reader_settings', JSON.stringify(ReaderState.settings));
      } catch (e) {
        console.warn('[EH Reader] 保存设置失败:', e);
      }
    }

    static updateFitMode(mode) {
      ReaderState.settings.fitMode = mode;
      Elements.currentImage.style.objectFit = mode;
      this.saveSettings();
    }

    static updateAlignMode(mode) {
      ReaderState.settings.alignMode = mode;
      
      const container = document.getElementById('eh-image-container');
      container.style.justifyContent = 
        mode === 'left' ? 'flex-start' :
        mode === 'right' ? 'flex-end' : 'center';
      
      this.saveSettings();
    }

    static toggleDarkMode() {
      ReaderState.settings.darkMode = !ReaderState.settings.darkMode;
      document.body.classList.toggle('eh-dark-mode');
      this.saveSettings();
    }

    static toggleSidebar() {
      ReaderState.settings.sidebarVisible = !ReaderState.settings.sidebarVisible;
      Elements.sidebar.classList.toggle('eh-sidebar-visible');
      
      // 更新按钮图标
      const icon = Elements.toggleSidebarBtn.querySelector('svg path');
      icon.setAttribute('d', ReaderState.settings.sidebarVisible ? 
        'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6');
      
      this.saveSettings();
    }
  }

  /**
   * 事件绑定
   */
  class EventHandler {
    static init() {
      // 翻页按钮
      Elements.prevBtn.addEventListener('click', () => PageController.prevPage());
      Elements.nextBtn.addEventListener('click', () => PageController.nextPage());
      Elements.firstPageBtn.addEventListener('click', () => PageController.goToPage(1));
      Elements.lastPageBtn.addEventListener('click', () => PageController.goToPage(ReaderState.pageCount));

      // 进度条
      Elements.progressBar.addEventListener('input', (e) => {
        PageController.goToPage(parseInt(e.target.value));
      });

      // 页码输入
      Elements.pageInput.addEventListener('change', (e) => {
        const page = parseInt(e.target.value);
        if (!isNaN(page)) {
          PageController.goToPage(page);
        }
      });

      Elements.pageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const page = parseInt(e.target.value);
          if (!isNaN(page)) {
            PageController.goToPage(page);
          }
        }
      });

      // 关闭按钮
      Elements.closeBtn.addEventListener('click', () => {
        if (pageData.gallery_url) {
          window.location.href = pageData.gallery_url;
        } else {
          window.history.back();
        }
      });

      // 全屏按钮
      Elements.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      });

      // 主题切换
      Elements.themeBtn.addEventListener('click', () => {
        SettingsManager.toggleDarkMode();
      });

      // 设置面板
      Elements.settingsBtn.addEventListener('click', () => {
        Elements.settingsPanel.classList.remove('eh-hidden');
      });

      Elements.closeSettingsBtn.addEventListener('click', () => {
        Elements.settingsPanel.classList.add('eh-hidden');
      });

      // 侧边栏切换
      Elements.toggleSidebarBtn.addEventListener('click', () => {
        SettingsManager.toggleSidebar();
      });

      // 键盘控制
      document.addEventListener('keydown', (e) => {
        // 如果焦点在输入框，不处理
        if (e.target.tagName === 'INPUT') {
          return;
        }

        switch(e.key) {
          case 'ArrowLeft':
          case 'a':
          case 'A':
            e.preventDefault();
            PageController.prevPage();
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
          case ' ':
            e.preventDefault();
            PageController.nextPage();
            break;
          case 'Home':
            e.preventDefault();
            PageController.goToPage(1);
            break;
          case 'End':
            e.preventDefault();
            PageController.goToPage(ReaderState.pageCount);
            break;
          case 'f':
          case 'F':
            e.preventDefault();
            SettingsManager.toggleSidebar();
            break;
          case 'F11':
            e.preventDefault();
            Elements.fullscreenBtn.click();
            break;
          case 'Escape':
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else if (!Elements.settingsPanel.classList.contains('eh-hidden')) {
              Elements.settingsPanel.classList.add('eh-hidden');
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
            PageController.nextPage();
          } else if (e.deltaY < 0) {
            PageController.prevPage();
          }
        }, 100);
      }, { passive: true });

      // 图片点击区域翻页
      Elements.currentImage.addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickPosition = x / rect.width;

        if (clickPosition < 0.3) {
          PageController.prevPage();
        } else if (clickPosition > 0.7) {
          PageController.nextPage();
        }
      });
    }
  }

  /**
   * 初始化阅读器
   */
  async function initReader() {
    console.log('[EH Reader] 初始化阅读器...');

    // 初始化设置
    SettingsManager.init();

    // 生成缩略图
    ThumbnailGenerator.generate();

    // 绑定事件
    EventHandler.init();

    // 加载阅读进度
    const startPage = PageController.loadProgress();

    // 加载第一页
    await PageController.goToPage(startPage);

    console.log('[EH Reader] 阅读器初始化完成');
  }

  // 启动
  initReader().catch(error => {
    console.error('[EH Reader] 初始化失败:', error);
  });

})();
