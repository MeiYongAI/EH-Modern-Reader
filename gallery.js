/**
 * Gallery Script - Gallery 页面入口脚本
 * 为没有 MPV 权限的用户提供阅读器入口
 */

(function() {
  'use strict';

  // 防止重复注入
  if (window.ehGalleryBootstrapInjected) {
    return;
  }
  window.ehGalleryBootstrapInjected = true;

  console.log('[EH Reader] Gallery bootstrap script loaded');

  // 从页面脚本中捕获变量
  function extractPageVariables() {
    const data = {
      gid: null,
      token: null,
      apiUrl: 'https://api.e-hentai.org/api.php',
      apiuid: null,
      apikey: null,
      title: document.querySelector('#gn')?.textContent || document.title,
      baseUrl: 'https://e-hentai.org/'
    };

    // 遍历所有 script 标签
    const scripts = document.querySelectorAll('script');
    for (let script of scripts) {
      const content = script.textContent;
      if (!content) continue;

      // 提取 gid
      if (!data.gid) {
        const gidMatch = content.match(/var\s+gid\s*=\s*(\d+);/);
        if (gidMatch) data.gid = parseInt(gidMatch[1]);
      }

      // 提取 token
      if (!data.token) {
        const tokenMatch = content.match(/var\s+token\s*=\s*"([^"]+)";/);
        if (tokenMatch) data.token = tokenMatch[1];
      }

      // 提取 api_url
      if (!data.apiUrl) {
        const apiMatch = content.match(/var\s+api_url\s*=\s*"([^"]+)";/);
        if (apiMatch) data.apiUrl = apiMatch[1];
      }

      // 提取 apiuid
      if (!data.apiuid) {
        const uidMatch = content.match(/var\s+apiuid\s*=\s*(\d+);/);
        if (uidMatch) data.apiuid = parseInt(uidMatch[1]);
      }

      // 提取 apikey
      if (!data.apikey) {
        const keyMatch = content.match(/var\s+apikey\s*=\s*"([^"]+)";/);
        if (keyMatch) data.apikey = keyMatch[1];
      }

      // 提取 base_url
      const baseMatch = content.match(/var\s+base_url\s*=\s*"([^"]+)";/);
      if (baseMatch) data.baseUrl = baseMatch[1];
    }

    return data;
  }

  const pageData = extractPageVariables();
  console.log('[EH Reader] Page data captured:', pageData);

  // 检查是否已经有 MPV 链接（有权限的用户）
  const mpvLink = document.querySelector('a[href*="/mpv/"]');
  
  // 如果没有 gid/token 则无法启动
  if (!pageData.gid || !pageData.token) {
    console.warn('[EH Reader] Missing gid or token, cannot initialize');
    return;
  }

  /**
   * 通过 API 获取画廊数据
   */
  async function fetchGalleryMetadata() {
    try {
      const response = await fetch(pageData.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'gdata',
          gidlist: [[pageData.gid, pageData.token]],
          namespace: 1
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.gmetadata && data.gmetadata[0]) {
        const metadata = data.gmetadata[0];
        console.log('[EH Reader] Gallery metadata:', metadata);
        
        // 如果返回了错误
        if (metadata.error) {
          throw new Error(metadata.error);
        }
        
        return {
          gid: metadata.gid,
          token: metadata.token,
          title: metadata.title,
          title_jpn: metadata.title_jpn,
          category: metadata.category,
          filecount: metadata.filecount,
          tags: metadata.tags
        };
      }
      
      throw new Error('No metadata returned');
    } catch (error) {
      console.error('[EH Reader] Failed to fetch gallery metadata:', error);
      throw error;
    }
  }

  // 缓存正在进行的 Gallery 分页抓取请求，避免重复抓取
  const galleryPageFetchCache = new Map(); // galleryPageIndex -> Promise

  /**
   * 从 Gallery 分页抓取指定范围的 imgkey
   * Gallery 每页显示的缩略图数量取决于用户设置（通常是 20、40 等）
   */
  async function fetchImgkeysFromGallery(startPage, endPage) {
    try {
      // 检测当前页面每页显示多少张缩略图（从初始加载的缩略图数量推断）
      const initialThumbnails = document.querySelectorAll('#gdt a[href*="/s/"]').length;
      const thumbsPerPage = initialThumbnails > 0 ? initialThumbnails : 20; // 默认 20
      
      // 计算需要抓取哪个 Gallery 分页
      const galleryPageIndex = Math.floor(startPage / thumbsPerPage);
      
      // 检查是否已有进行中的请求
      if (galleryPageFetchCache.has(galleryPageIndex)) {
        console.log(`[EH Reader] Gallery page ${galleryPageIndex} fetch already in progress, reusing...`);
        return galleryPageFetchCache.get(galleryPageIndex);
      }
      
      const galleryUrl = `${window.location.origin}/g/${pageData.gid}/${pageData.token}/?p=${galleryPageIndex}`;
      
      console.log(`[EH Reader] Fetching imgkeys from gallery page ${galleryPageIndex} (${thumbsPerPage} thumbs/page):`, galleryUrl);
      
      const fetchPromise = (async () => {
        const response = await fetch(galleryUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch gallery page: ${response.status}`);
        }
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 从缩略图链接提取 imgkey
        const thumbnailLinks = doc.querySelectorAll('#gdt a[href*="/s/"]');
        console.log(`[EH Reader] Found ${thumbnailLinks.length} thumbnails in gallery page ${galleryPageIndex}`);
        
        let updatedCount = 0;
        thumbnailLinks.forEach((link, index) => {
          const href = link.getAttribute('href');
          const match = href.match(/\/s\/([a-f0-9]+)\/\d+-(\d+)/);
          if (match) {
            const imgkey = match[1];
            const pageNum = parseInt(match[2]) - 1; // 转换为 0-based index
            
            if (window.__ehReaderData?.imagelist[pageNum]) {
              window.__ehReaderData.imagelist[pageNum].k = imgkey;
              updatedCount++;
            }
          }
        });
        
        console.log(`[EH Reader] Updated ${updatedCount} imgkeys for gallery page ${galleryPageIndex}`);
        
        // 完成后从缓存中移除
        galleryPageFetchCache.delete(galleryPageIndex);
      })();
      
      // 将 Promise 加入缓存
      galleryPageFetchCache.set(galleryPageIndex, fetchPromise);
      
      return fetchPromise;
    } catch (error) {
      console.error(`[EH Reader] Failed to fetch imgkeys:`, error);
      throw error;
    }
  }

  /**
   * 构造单页 URL（不使用 API，让 content.js 去抓取 HTML）
   * Gallery 模式下，直接返回单页 URL，让 MPV 模式的 fetchRealImageUrl 处理
   */
  async function fetchPageImageUrl(page) {
    try {
      // 从 imagelist 获取该页的 imgkey
      let imgkey = window.__ehReaderData?.imagelist[page]?.k || '';
      
      // 如果 imgkey 不存在，动态从 Gallery 页面抓取
      if (!imgkey) {
        console.log(`[EH Reader] Page ${page} imgkey not cached, fetching from gallery...`);
        
        // 检测每页缩略图数量
        const initialThumbnails = document.querySelectorAll('#gdt a[href*="/s/"]').length;
        const thumbsPerPage = initialThumbnails > 0 ? initialThumbnails : 20;
        
        // 只获取当前页所在的 Gallery 页面（不预加载，避免风控）
        const currentGalleryPage = Math.floor(page / thumbsPerPage);
        await fetchImgkeysFromGallery(currentGalleryPage * thumbsPerPage, (currentGalleryPage + 1) * thumbsPerPage);
        
        // 获取后检查 imgkey
        imgkey = window.__ehReaderData?.imagelist[page]?.k || '';
        
        if (!imgkey) {
          throw new Error(`Page ${page} imgkey not found after fetching`);
        }
      }

      // 构造单页 URL: https://e-hentai.org/s/{imgkey}/{gid}-{page}
      const pageUrl = `${window.location.origin}/s/${imgkey}/${pageData.gid}-${page + 1}`;
      
      console.log(`[EH Reader] Page ${page} URL:`, pageUrl);
      
      // 返回单页 URL，content.js 会自动抓取 HTML 提取图片
      return {
        pageNumber: page + 1,
        pageUrl: pageUrl,  // 返回单页 URL 而不是图片 URL
        imgkey: imgkey
      };
    } catch (error) {
      console.error(`[EH Reader] Failed to construct page URL for ${page}:`, error);
      throw error;
    }
  }

  /**
   * 启动阅读器
   */
  async function launchReader() {
    console.log('[EH Reader] Launching reader from Gallery page...');
    
    try {
      // 1. 获取画廊元数据
      const metadata = await fetchGalleryMetadata();
      const pageCount = parseInt(metadata.filecount);
      
      console.log(`[EH Reader] Gallery has ${pageCount} pages`);
      
      // 2. 构建图片列表（类似 MPV 的 imagelist 格式）
      const imagelist = [];
      
      // 初始化所有页面，imgkey 暂时为空
      for (let i = 0; i < pageCount; i++) {
        imagelist.push({
          n: (i + 1).toString(),
          k: '',  // 图片的 key，稍后按需加载
          t: ''   // 缩略图 URL
        });
      }
      
      // 从 Gallery 第 0 页提取前几张图片的 imgkey（确保第一页能正常加载）
      console.log('[EH Reader] Fetching initial imgkeys from Gallery page 0...');
      
      try {
        const firstPageUrl = `${window.location.origin}/g/${pageData.gid}/${pageData.token}/?p=0`;
        const response = await fetch(firstPageUrl);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const thumbnailLinks = doc.querySelectorAll('#gdt a[href*="/s/"]');
        console.log(`[EH Reader] Found ${thumbnailLinks.length} thumbnail links in first page`);
        
        thumbnailLinks.forEach((link) => {
          const href = link.getAttribute('href');
          // URL 格式: https://e-hentai.org/s/{imgkey}/{gid}-{page}
          const match = href.match(/\/s\/([a-f0-9]+)\/\d+-(\d+)/);
          if (match) {
            const imgkey = match[1];
            const pageNum = parseInt(match[2]) - 1; // 转换为 0-based index
            if (imagelist[pageNum]) {
              imagelist[pageNum].k = imgkey;
            }
          }
        });
      } catch (error) {
        console.error('[EH Reader] Failed to fetch initial imgkeys:', error);
      }
      
      console.log('[EH Reader] Imagelist sample:', imagelist.slice(0, 3));
      
      // 3. 构建 pageData（与 content.js 格式兼容）
      const readerPageData = {
        imagelist: imagelist,
        pagecount: pageCount,
        gid: pageData.gid,
        mpvkey: pageData.token,
        gallery_url: `${pageData.baseUrl}g/${pageData.gid}/${pageData.token}/`,
        title: metadata.title,
        source: 'gallery' // 标记数据来源
      };
      
      // 4. 挂载到 window（供 content.js 使用）
      window.__ehReaderData = readerPageData;
      
      // 5. 创建标记，让 content.js 知道是从 Gallery 启动的
      console.log('[EH Reader] Injecting reader UI...');
      
      window.__ehGalleryBootstrap = {
        enabled: true,
        fetchPageImageUrl: fetchPageImageUrl
      };
      
      // 6. 通知 content.js 启动（content.js 已经通过 manifest 加载）
      // 触发自定义事件
      const event = new CustomEvent('ehGalleryReaderReady', { 
        detail: readerPageData 
      });
      document.dispatchEvent(event);
      console.log('[EH Reader] Gallery reader ready event dispatched');
      
    } catch (error) {
      console.error('[EH Reader] Failed to launch reader:', error);
      alert(`启动阅读器失败：${error.message}`);
    }
  }

  /**
   * 在 Gallery 页面添加启动按钮
   */
  function addLaunchButton() {
    // 找到右侧操作区域（#gd5）
    const actionPanel = document.querySelector('#gd5');
    if (!actionPanel) {
      console.warn('[EH Reader] Cannot find action panel (#gd5)');
      return;
    }

    // 检查是否已经有 MPV 链接
    if (mpvLink) {
      console.log('[EH Reader] MPV link already exists, user has permission');
      // 如果有 MPV 权限，可以选择不添加按钮，或者添加一个备用入口
      // 这里我们仍然添加，作为备选方案
    }

  // 创建按钮容器（保持与页面原生风格一致，不加自定义背景）
  const buttonContainer = document.createElement('p');
  buttonContainer.className = 'g2 gsp';
  // 不设置额外样式，避免破坏布局对齐

    // 创建图标
    const icon = document.createElement('img');
    icon.src = 'https://ehgt.org/g/mr.gif';
    
    // 创建按钮
  const button = document.createElement('a');
    button.href = '#';
    button.textContent = 'EH Modern Reader';
  // 使用站点默认链接样式，避免突兀
  button.style.cssText = '';
    button.onclick = (e) => {
      e.preventDefault();
      launchReader();
    };

    buttonContainer.appendChild(icon);
    buttonContainer.appendChild(document.createTextNode(' '));
    buttonContainer.appendChild(button);

    // 插入到 MPV 按钮下方（如果存在）或顶部
    if (mpvLink) {
      const mpvParent = mpvLink.closest('p');
      mpvParent.parentNode.insertBefore(buttonContainer, mpvParent.nextSibling);
    } else {
      actionPanel.insertBefore(buttonContainer, actionPanel.firstChild);
    }

    console.log('[EH Reader] Launch button added to Gallery page');
  }

  // 页面加载完成后添加按钮
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addLaunchButton);
  } else {
    addLaunchButton();
  }

})();
