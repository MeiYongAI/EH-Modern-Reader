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
   * 启动阅读器
   */
  async function launchReader(galleryInfo) {
    console.log('[EH Modern Reader] 启动阅读器...');

    // 获取完整图片列表
    const imageList = await fetchImageList(galleryInfo);
    if (!imageList || imageList.length === 0) {
      alert('无法获取图片列表，请稍后重试');
      return;
    }

    // 存储数据到 sessionStorage 供 content.js 使用
    const readerData = {
      gid: galleryInfo.gid,
      token: galleryInfo.token,
      title: galleryInfo.title,
      pagecount: galleryInfo.pagecount,
      imagelist: imageList,
      gallery_url: galleryInfo.gallery_url,
      mode: 'gallery' // 标记为画廊模式
    };

    sessionStorage.setItem('ehReaderData', JSON.stringify(readerData));

    // 构造 MPV URL（即使没有真实的 mpvkey，我们也可以用 token 代替）
    const mpvUrl = `${window.location.origin}/mpv/${galleryInfo.gid}/${galleryInfo.token}/`;
    
    // 在新标签页打开
    window.open(mpvUrl, '_blank');
  }

  /**
   * 获取完整图片列表
   */
  async function fetchImageList(galleryInfo) {
    try {
      console.log('[EH Modern Reader] 开始获取图片列表...');
      
      const imageList = [];
      const { gid, token, pagecount, thumbnails } = galleryInfo;

      // 方案1: 如果缩略图已经包含所有页面，直接使用
      if (thumbnails.length === pagecount) {
        console.log('[EH Modern Reader] 使用缩略图数据');
        return thumbnails.map(t => ({
          page: t.page,
          thumb: t.thumb,
          url: '' // URL需要通过API获取
        }));
      }

      // 方案2: 通过E-Hentai API获取图片信息
      // 注意: 这需要知道每页的 page token
      // 我们可以从缩略图页面的链接中提取
      console.log('[EH Modern Reader] 通过API获取图片列表');
      
      // 分批获取所有页面的token
      const pageTokens = await fetchAllPageTokens(galleryInfo);
      
      // 使用API获取图片URLs
      if (pageTokens && pageTokens.length > 0) {
        return await fetchImagesFromAPI(gid, token, pageTokens);
      }

      return thumbnails.map(t => ({
        page: t.page,
        thumb: t.thumb,
        url: ''
      }));

    } catch (error) {
      console.error('[EH Modern Reader] 获取图片列表失败:', error);
      return [];
    }
  }

  /**
   * 获取所有页面的token
   */
  async function fetchAllPageTokens(galleryInfo) {
    const tokens = [];
    
    // 从当前页面的缩略图链接提取token
    document.querySelectorAll('#gdt .gdtm a, .gm #gdt .gdtm a').forEach(link => {
      const match = link.href.match(/\/s\/([a-f0-9]+)\/\d+-(\d+)/);
      if (match) {
        const pageToken = match[1];
        const page = parseInt(match[2]);
        tokens.push({ page, token: pageToken });
      }
    });

    // 如果需要更多页面，需要翻页获取
    const thumbnailPages = Math.ceil(galleryInfo.pagecount / 40);
    if (thumbnailPages > 1) {
      console.log('[EH Modern Reader] 需要获取更多缩略图页面...');
      // TODO: 实现翻页获取逻辑
    }

    return tokens;
  }

  /**
   * 通过API获取图片URLs
   */
  async function fetchImagesFromAPI(gid, token, pageTokens) {
    try {
      const apiUrl = 'https://api.e-hentai.org/api.php';
      
      // E-Hentai API 请求格式
      const request = {
        method: 'gtoken',
        pagelist: pageTokens.map((pt, idx) => [gid, pt.token, idx + 1])
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      
      if (data.tokenlist) {
        return data.tokenlist.map((item, idx) => ({
          page: idx + 1,
          thumb: item.thumb || '',
          url: item.url || ''
        }));
      }

      return [];
    } catch (error) {
      console.error('[EH Modern Reader] API请求失败:', error);
      return [];
    }
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
