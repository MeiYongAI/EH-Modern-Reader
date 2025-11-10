/**
 * Gallery Injection Script - 画廊页面注入脚本
 * 在普通画廊页面添加 Multi-Page Viewer 入口
 */

(function() {
  'use strict';

  // 检测是否在画廊页面
  if (!window.location.pathname.match(/^\/g\/\d+\/[a-f0-9]+\//)) {
    return;
  }

  console.log('[EH Modern Reader] 画廊页面检测到');

  /**
   * 提取画廊信息
   */
  function extractGalleryInfo() {
    try {
      // 从URL提取 gid 和 token
      const urlMatch = window.location.pathname.match(/\/g\/(\d+)\/([a-f0-9]+)\//);
      if (!urlMatch) return null;

      const gid = urlMatch[1];
      const token = urlMatch[2];

      // 提取标题
      const titleElem = document.querySelector('#gn, .gm #gn');
      const title = titleElem ? titleElem.textContent.trim() : document.title;

      // 提取页数
      const pagesElem = document.querySelector('#gdd tr:nth-child(6) .gdt2, .gm #gdd tr:nth-child(6) .gdt2');
      const pagesText = pagesElem ? pagesElem.textContent : '';
      const pagesMatch = pagesText.match(/(\d+)\s+pages?/i);
      const pagecount = pagesMatch ? parseInt(pagesMatch[1]) : 0;

      // 提取缩略图列表
      const thumbnails = [];
      document.querySelectorAll('#gdt .gdtm a, .gm #gdt .gdtm a').forEach((link, index) => {
        const img = link.querySelector('img');
        if (img) {
          thumbnails.push({
            page: index + 1,
            thumb: img.src,
            pageUrl: link.href
          });
        }
      });

      return {
        gid,
        token,
        title,
        pagecount,
        thumbnails,
        gallery_url: window.location.href
      };
    } catch (error) {
      console.error('[EH Modern Reader] 提取画廊信息失败:', error);
      return null;
    }
  }

  /**
   * 创建 MPV 按钮
   */
  function createMPVButton() {
    const galleryInfo = extractGalleryInfo();
    if (!galleryInfo) {
      console.warn('[EH Modern Reader] 无法提取画廊信息');
      return;
    }

    console.log('[EH Modern Reader] 画廊信息:', galleryInfo);

    // 查找插入位置 - 在 gd5 容器中创建新的段落
    const gd5 = document.querySelector('#gd5');
    if (!gd5) {
      console.warn('[EH Modern Reader] 找不到 #gd5 容器');
      return;
    }

    // 创建新段落，样式与 Archive Download 一致
    const mpvParagraph = document.createElement('p');
    mpvParagraph.className = 'g2 gsp';
    
    // 创建图标
    const icon = document.createElement('img');
    icon.src = 'https://ehgt.org/g/mr.gif';
    icon.style.marginRight = '4px';
    
    // 创建按钮链接
    const mpvButton = document.createElement('a');
    mpvButton.href = '#';
    mpvButton.id = 'eh-mpv-button';
    mpvButton.textContent = 'Multi-Page Viewer';
    mpvButton.title = '使用 EH Modern Reader 打开多页查看器（无需 Hath 解锁）';
    
    mpvButton.addEventListener('click', (e) => {
      e.preventDefault();
      launchReader(galleryInfo);
    });

    // 组装段落
    mpvParagraph.appendChild(icon);
    mpvParagraph.appendChild(document.createTextNode(' '));
    mpvParagraph.appendChild(mpvButton);
    
    // 插入到 Report Gallery 之后
    const reportParagraph = gd5.querySelector('p a[href*="report"]');
    if (reportParagraph && reportParagraph.parentElement) {
      // 插入到 Report Gallery 段落之后
      reportParagraph.parentElement.insertAdjacentElement('afterend', mpvParagraph);
    } else {
      // 如果找不到 Report，就插入到最前面
      gd5.insertBefore(mpvParagraph, gd5.firstChild);
    }

    console.log('[EH Modern Reader] MPV 按钮已添加');
  }

  /**
   * 启动阅读器 - 直接在当前页面注入
   */
  async function launchReader(galleryInfo) {
    console.log('[EH Modern Reader] 启动阅读器...');

    // 显示加载提示
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'eh-loading-overlay';
    loadingMsg.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                  background: rgba(0,0,0,0.8); z-index: 999999; 
                  display: flex; align-items: center; justify-content: center;
                  color: white; font-size: 18px;">
        <div>
          <div style="margin-bottom: 20px;">正在加载图片列表...</div>
          <div style="text-align: center; font-size: 14px; color: #aaa;">
            EH Modern Reader v1.3.0
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(loadingMsg);

    try {
      // 获取完整图片列表
      const imageList = await fetchImageList(galleryInfo);
      if (!imageList || imageList.length === 0) {
        throw new Error('无法获取图片列表');
      }

      console.log('[EH Modern Reader] 图片列表获取成功，共', imageList.length, '页');

      // 准备阅读器数据
      const readerData = {
        gid: galleryInfo.gid,
        token: galleryInfo.token,
        title: galleryInfo.title,
        pagecount: galleryInfo.pagecount,
        imagelist: imageList,
        gallery_url: galleryInfo.gallery_url,
        mode: 'gallery'
      };

      // 移除加载提示
      loadingMsg.remove();

      // 直接在当前页面注入阅读器
      injectReaderInCurrentPage(readerData);

    } catch (error) {
      console.error('[EH Modern Reader] 启动失败:', error);
      loadingMsg.remove();
      alert('启动阅读器失败：' + error.message + '\n\n可能原因：\n1. 网络连接问题\n2. 画廊数据获取失败\n\n请刷新页面后重试');
    }
  }

  /**
   * 在当前页面注入阅读器界面
   */
  function injectReaderInCurrentPage(readerData) {
    console.log('[EH Modern Reader] 在当前页面注入阅读器');

    // 将数据设置为全局变量，供 content.js 使用
    window.__ehCaptured = {
      imagelist: readerData.imagelist,
      gid: readerData.gid,
      mpvkey: readerData.token,
      pagecount: readerData.pagecount,
      gallery_url: readerData.gallery_url,
      title: readerData.title,
      fromGallery: true
    };

    // 动态创建并注入 content.js 脚本
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content.js');
    script.onload = () => {
      console.log('[EH Modern Reader] content.js 已加载并执行');
    };
    script.onerror = (error) => {
      console.error('[EH Modern Reader] 加载 content.js 失败:', error);
      alert('加载阅读器失败，请刷新页面重试');
    };
    
    // 注入到页面
    (document.head || document.documentElement).appendChild(script);
  }

  /**
   * 获取完整图片列表
   */
  async function fetchImageList(galleryInfo) {
    try {
      console.log('[EH Modern Reader] 开始获取图片列表...');
      
      const imageList = [];
      const { gid, token, pagecount, thumbnails } = galleryInfo;

      // 从缩略图链接中提取页面信息
      // E-Hentai 缩略图链接格式: /s/{pageToken}/{gid}-{pageNum}
      const pageLinks = [];
      document.querySelectorAll('#gdt .gdtm a, .gm #gdt .gdtm a').forEach((link, index) => {
        const match = link.href.match(/\/s\/([a-f0-9]+)\/(\d+)-(\d+)/);
        if (match) {
          const pageToken = match[1];
          const pageGid = match[2];
          const pageNum = parseInt(match[3]);
          const imgThumb = link.querySelector('img');
          
          pageLinks.push({
            page: pageNum,
            pageUrl: link.href,
            pageToken: pageToken,
            thumb: imgThumb ? imgThumb.src : '',
            gid: pageGid
          });
        }
      });

      console.log('[EH Modern Reader] 提取到', pageLinks.length, '个页面链接');

      // 如果页数不够，需要翻页获取更多
      if (pageLinks.length < pagecount) {
        console.log('[EH Modern Reader] 检测到多页缩略图，开始获取剩余页面...');
        const additionalLinks = await fetchAdditionalThumbnails(galleryInfo, pageLinks.length);
        pageLinks.push(...additionalLinks);
      }

      // 构建 imagelist 格式（与 MPV 兼容）
      // 格式: {k: pageToken, n: imageFilename, t: timestamp}
      for (const link of pageLinks) {
        imageList.push({
          k: link.pageToken,  // 页面 token
          n: `page_${link.page}`,  // 图片文件名（占位）
          t: '', // 缩略图 URL
          page: link.page,
          pageUrl: link.pageUrl,
          thumb: link.thumb
        });
      }

      // 按页码排序
      imageList.sort((a, b) => a.page - b.page);

      console.log('[EH Modern Reader] 图片列表构建完成:', imageList.length, '页');
      return imageList;

    } catch (error) {
      console.error('[EH Modern Reader] 获取图片列表失败:', error);
      return [];
    }
  }

  /**
   * 获取额外的缩略图页面
   */
  async function fetchAdditionalThumbnails(galleryInfo, currentCount) {
    const additionalLinks = [];
    const thumbnailPages = Math.ceil(galleryInfo.pagecount / 40);
    
    console.log('[EH Modern Reader] 总缩略图页数:', thumbnailPages);

    // 从第2页开始获取（第1页已经在当前页面）
    for (let page = 1; page < thumbnailPages; page++) {
      try {
        const pageUrl = `${galleryInfo.gallery_url}?p=${page}`;
        console.log('[EH Modern Reader] 获取缩略图页', page + 1, ':', pageUrl);
        
        const response = await fetch(pageUrl);
        const html = await response.text();
        
        // 解析 HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 提取缩略图链接
        doc.querySelectorAll('#gdt .gdtm a, .gm #gdt .gdtm a').forEach(link => {
          const match = link.href.match(/\/s\/([a-f0-9]+)\/(\d+)-(\d+)/);
          if (match) {
            const pageToken = match[1];
            const pageGid = match[2];
            const pageNum = parseInt(match[3]);
            const imgThumb = link.querySelector('img');
            
            additionalLinks.push({
              page: pageNum,
              pageUrl: link.href,
              pageToken: pageToken,
              thumb: imgThumb ? imgThumb.src : '',
              gid: pageGid
            });
          }
        });

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error('[EH Modern Reader] 获取缩略图页', page + 1, '失败:', error);
      }
    }

    return additionalLinks;
  }

  /**
   * 初始化
   */
  function init() {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createMPVButton);
    } else {
      createMPVButton();
    }
  }

  init();

})();
