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
  async function launchReader(startPage /* 1-based, optional */) {
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
        source: 'gallery', // 标记数据来源
        startAt: (typeof startPage === 'number' && startPage >= 1 && startPage <= pageCount) ? startPage : undefined
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

    // 单独的“查看评论”栏目
    const commentContainer = document.createElement('p');
    commentContainer.className = 'g2 gsp';
    // 与其它项保持一致：添加同样的图标与空格，保证对齐与箭头样式
    const commentIcon = document.createElement('img');
    commentIcon.src = 'https://ehgt.org/g/mr.gif';
    const commentLink = document.createElement('a');
    commentLink.href = '#view-comments';
    commentLink.textContent = '查看评论';
    commentLink.onclick = (e) => { e.preventDefault(); openCommentsOverlay(); };
    commentContainer.appendChild(commentIcon);
    commentContainer.appendChild(document.createTextNode(' '));
    commentContainer.appendChild(commentLink);

    // 插入到 MPV 按钮下方（如果存在）或顶部
    let insertAfterRef = null;
    if (mpvLink) {
      insertAfterRef = mpvLink.closest('p');
    }
    if (insertAfterRef) {
      insertAfterRef.parentNode.insertBefore(buttonContainer, insertAfterRef.nextSibling);
      buttonContainer.parentNode.insertBefore(commentContainer, buttonContainer.nextSibling);
    } else {
      // 插入到面板顶部：先 Reader，再评论
      actionPanel.insertBefore(commentContainer, actionPanel.firstChild);
      actionPanel.insertBefore(buttonContainer, commentContainer);
    }

    console.log('[EH Reader] Launch button and separate comment entry added');
  }

  // 页面加载完成后添加按钮
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addLaunchButton);
  } else {
    addLaunchButton();
  }

  // 拦截缩略图点击，直接用我们的阅读器打开并跳转到对应页
  function interceptThumbnailClicks() {
    const grid = document.getElementById('gdt');
    if (!grid) return;
    // 放行组合键/中键等原生行为
    const shouldBypass = (ev) => ev.ctrlKey || ev.shiftKey || ev.metaKey || ev.altKey || ev.button === 1;

    grid.addEventListener('auxclick', (e) => {
      // 中键点击等，直接放行
    }, true);

    grid.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      if (shouldBypass(e)) return; // 保留原站行为（新标签、打开等）
      const a = e.target && (e.target.closest ? e.target.closest('a[href*="/s/"]') : null);
      if (!a) return;
      const href = a.getAttribute('href') || '';
      const m = href.match(/\/s\/([a-f0-9]+)\/(\d+)-(\d+)/i);
      if (!m) return; // 非预期链接，放行
      e.preventDefault();
      const pageNum = parseInt(m[3], 10); // 1-based
      const now = Date.now();
      const cooldownUntil = window.__ehReaderCooldown || 0;
      if (cooldownUntil > now || window.__ehReaderLaunching) return;
      window.__ehReaderLaunching = true;
      window.__ehReaderCooldown = now + 1200; // 1.2s 冷却避免重复触发
      launchReader(pageNum).catch(() => { window.__ehReaderLaunching = false; });
    }, true); // 捕获阶段优先，减少站内脚本干预
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptThumbnailClicks);
  } else {
    interceptThumbnailClicks();
  }

  // —— 展开所有缩略图：抓取所有分页并合并到当前页 ——
  async function fetchGalleryPageDom(pageIndex) {
    const url = `${window.location.origin}/g/${pageData.gid}/${pageData.token}/?p=${pageIndex}`;
    const resp = await fetch(url, { credentials: 'same-origin' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  // 旧版“展开所有缩略图”按钮已废弃（改为静默自动展开）

  async function expandAllThumbnails() {
    const grid = document.getElementById('gdt');
    if (!grid) return;
    // 估算每页缩略图数
    const firstPageThumbs = grid.querySelectorAll('a[href*="/s/"]').length || 20;
    // 获取总页数
    let totalImages = null;
    try {
      const meta = await fetchGalleryMetadata();
      totalImages = parseInt(meta.filecount);
    } catch {}
    if (!totalImages || !Number.isFinite(totalImages)) {
      // 兜底：从 .gpc 文本解析 “Showing 1 - 20 of N images”
      const gpc = document.querySelector('.gpc');
      if (gpc && /of\s+(\d+)/i.test(gpc.textContent)) {
        totalImages = parseInt(gpc.textContent.match(/of\s+(\d+)/i)[1], 10);
      }
    }
    if (!totalImages) return;
    const totalPages = Math.ceil(totalImages / firstPageThumbs);
    if (totalPages <= 1) return;

    // 静默展开：不显示任何进度或提示，避免视觉干扰

    // 并发抓取 pageIndex: 1..totalPages-1（第0页当前已在）
    const indexes = [];
    for (let i = 1; i < totalPages; i++) indexes.push(i);
    const concurrency = 2;
    let inFlight = 0, cursor = 0, done = 0;
    const results = [];

    await new Promise((resolve) => {
      const next = () => {
        if (cursor >= indexes.length && inFlight === 0) { resolve(); return; }
        while (inFlight < concurrency && cursor < indexes.length) {
          const idx = indexes[cursor++];
          inFlight++;
          fetchGalleryPageDom(idx)
            .then((doc) => {
              const links = doc.querySelectorAll('#gdt a[href*="/s/"]');
              const frag = document.createDocumentFragment();
              // 克隆包含缩略图的容器（.gdtm 或 .gdtl），保持原布局结构
              links.forEach(a => {
                const container = a.closest('.gdtm, .gdtl') || a;
                const cloned = container.cloneNode(true);
                if (cloned.nodeType === 1) cloned.setAttribute('data-eh-expanded', '1');
                // 处理懒加载属性，确保图片可见
                cloned.querySelectorAll('img').forEach(img => {
                  const ds = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-original');
                  if (ds && (!img.getAttribute('src') || img.getAttribute('src') === '')) {
                    img.setAttribute('src', ds);
                  }
                  img.loading = 'eager';
                  img.decoding = 'sync';
                  img.style.opacity = '1';
                });
                frag.appendChild(cloned);
              });
              results[idx] = frag;
            })
            .catch(() => { results[idx] = document.createDocumentFragment(); })
            .finally(() => { inFlight--; done++; setTimeout(next, 150); });
        }
      };
      next();
    });

    // 追加到当前网格
    for (let i = 1; i < results.length; i++) {
      const frag = results[i];
      if (frag) grid.appendChild(frag);
    }
    // 展开后补充缩略图占位样式
    applyThumbnailPlaceholders();
    // 启动持久化观察，防止站点脚本后续删除已展开的缩略图
    startThumbnailPersistenceObserver();
    // 缓存展开结果，返回画廊时可直接恢复
    saveExpandedToCache(totalImages);

    // 移除分页条
    document.querySelectorAll('.ptt, .ptb').forEach(el => el.remove());
    // 更新显示范围文字
    const gpcTop = document.querySelector('.gpc');
    if (gpcTop) gpcTop.textContent = `Showing 1 - ${totalImages} of ${totalImages} images`;
  }

  // 移除“展开所有缩略图”按钮的自动插入（默认自动展开，无需额外按钮）

  // 自动展开所有缩略图（仿 JHenTai 默认行为）
  async function autoExpandIfNeeded() {
    try {
      if (window.__ehAutoExpanded) return;
      const grid = document.getElementById('gdt');
      if (!grid) return;
      // 先尝试从缓存恢复，避免返回画廊后重新加载
      if (restoreExpandedFromCache()) {
        window.__ehAutoExpanded = true;
        return;
      }
      // 判断是否存在分页元素（.ptt 或 .ptb 中是否有 >1 页）
      const pageTable = document.querySelector('.ptt, .ptb');
      if (!pageTable) return; // 无分页无需展开
      const pageLinks = pageTable.querySelectorAll('a');
      if (pageLinks.length <= 2) return; // 只有 1 页
      window.__ehAutoExpanded = true;
      await expandAllThumbnails();
    } catch (e) {
      console.warn('[EH Reader] 自动展开缩略图失败', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(autoExpandIfNeeded, 300));
  } else {
    setTimeout(autoExpandIfNeeded, 50);
  }

  // 隐藏原站评论区，改用“查看评论”按钮打开 Overlay
  const hideCommentsEarly = () => { const root = document.getElementById('cdiv'); if (root) root.style.display = 'none'; };
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', hideCommentsEarly); } else { hideCommentsEarly(); }

  // ================= 评论预览与弹窗 =================
  function isDarkTheme() {
    try {
      const bg = getComputedStyle(document.body).backgroundColor;
      const m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luma < 140;
      }
    } catch {}
    return document.body.classList.contains('dark') || document.body.classList.contains('eh-dark-mode');
  }

  function getThemeColors() {
    const dark = isDarkTheme();
    const sample = document.querySelector('#cdiv .c1') || document.querySelector('#gd5') || document.body;
    const cs = getComputedStyle(sample);
    const border = cs.borderTopColor || (dark ? '#444' : '#ccc');
    const bodyCs = getComputedStyle(document.body);
    const bodyBg = bodyCs.backgroundColor || (dark ? '#1b1b1b' : '#ffffff');
    const text = bodyCs.color || (dark ? '#ddd' : '#222');
    return { dark, border, bodyBg, text };
  }

  function openCommentsOverlay() {
    if (document.getElementById('eh-comment-overlay')) return;
    const commentRoot = document.getElementById('cdiv');
    if (!commentRoot) return;
    const theme = getThemeColors();
    const overlay = document.createElement('div');
    overlay.id = 'eh-comment-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:40px;box-sizing:border-box;';
    const panel = document.createElement('div');
    panel.style.cssText = `max-width:900px;width:100%;max-height:100%;overflow:auto;background:${theme.bodyBg};color:${theme.text};border:1px solid ${theme.border};border-radius:6px;box-shadow:0 4px 18px rgba(0,0,0,0.4);padding:16px 20px;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch;`;
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';
    const title = document.createElement('div');
    title.textContent = '全部评论';
    title.style.cssText = 'font-weight:600;font-size:15px;';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.cssText = 'cursor:pointer;font-size:12px;padding:4px 10px;border:1px solid '+theme.border+';background:transparent;border-radius:4px;';
    header.appendChild(title); header.appendChild(closeBtn); panel.appendChild(header);
    // 占位符用于关闭时恢复原位置
    const placeholderId = 'eh-comment-overlay-placeholder';
    let placeholder = document.getElementById(placeholderId);
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.id = placeholderId;
      placeholder.style.display = 'none';
      commentRoot.parentNode.insertBefore(placeholder, commentRoot.nextSibling);
    }
    commentRoot.style.display = 'block';
    panel.appendChild(commentRoot);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    const restore = () => {
      if (placeholder && placeholder.parentNode) {
        commentRoot.style.display = 'none';
        placeholder.parentNode.insertBefore(commentRoot, placeholder);
      }
      overlay.remove();
      document.body.style.overflow='';
    };
    closeBtn.onclick = restore;
    overlay.addEventListener('click',(e)=>{ if(e.target===overlay) restore(); });
    const escHandler=(e)=>{ if(e.key==='Escape'){ restore(); document.removeEventListener('keydown',escHandler);} }; document.addEventListener('keydown',escHandler);
    document.body.style.overflow='hidden';
  }

  // 移除旧全屏评论页方案（已用居中容器替代）
  // ================= 占位样式补充（展开全部缩略图后） =================
  function applyThumbnailPlaceholders() {
    const grid = document.getElementById('gdt');
    if (!grid) return;
    const candidates = grid.querySelectorAll('#gdt a[href*="/s/"] div, #gdt .glthumb, #gdt .glthumb div');
    candidates.forEach(div => {
      const cs = getComputedStyle(div);
      const hasBg = cs.backgroundImage && cs.backgroundImage !== 'none';
      const hasImg = !!div.querySelector('img[src]');
      if (hasBg || hasImg) {
        // 已有真实缩略图，移除占位样式
        if (div.dataset.ehSkeletonApplied) {
          div.style.background = '';
          div.style.border = '';
          div.style.borderRadius = '';
          div.style.minHeight = '';
          delete div.dataset.ehSkeletonApplied;
        }
      } else {
        // 仅在确实没有图像时，给一个最小高度维持布局；不要覆盖背景以免挡图
        if (!div.dataset.ehSkeletonApplied) {
          div.dataset.ehSkeletonApplied = '1';
          div.style.minHeight = '140px';
        }
      }
    });
  }

  // 监控克隆缩略图被站点脚本意外移除时自动恢复
  function startThumbnailPersistenceObserver() {
    const grid = document.getElementById('gdt');
    if (!grid) return;
    if (window.__ehThumbObserver) return; // 已启动
    const expanded = () => Array.from(grid.querySelectorAll('[data-eh-expanded="1"]'));
    const baseline = new Set(expanded());
    const observer = new MutationObserver((mutations) => {
      // 若发现我们标记的节点消失则重新追加
      baseline.forEach(node => {
        if (!node.isConnected) {
          grid.appendChild(node);
        }
      });
    });
    observer.observe(grid, { childList: true });
    window.__ehThumbObserver = observer;
  }

  // ============== 展开结果缓存（sessionStorage） ==============
  const CACHE_VERSION = 'v1';
  function cacheKey() { return `eh:galleryExpanded:${pageData.gid}:${pageData.token}`; }
  function saveExpandedToCache(totalImages) {
    try {
      const grid = document.getElementById('gdt'); if (!grid) return;
      const payload = {
        v: CACHE_VERSION,
        ts: Date.now(),
        total: totalImages || null,
        html: grid.innerHTML
      };
      sessionStorage.setItem(cacheKey(), JSON.stringify(payload));
      console.log('[EH Reader] Expanded thumbnails cached');
    } catch (e) {
      console.warn('[EH Reader] Failed to cache expanded thumbnails', e);
    }
  }
  function restoreExpandedFromCache() {
    try {
      const raw = sessionStorage.getItem(cacheKey());
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.v !== CACHE_VERSION || !data.html) return false;
      // 可选：过期策略（3小时）
      if (Date.now() - (data.ts||0) > 3*60*60*1000) return false;
      const grid = document.getElementById('gdt'); if (!grid) return false;
      grid.innerHTML = data.html;
      // 移除分页条，更新统计文本
      document.querySelectorAll('.ptt, .ptb').forEach(el => el.remove());
      const gpcTop = document.querySelector('.gpc');
      if (gpcTop && data.total) gpcTop.textContent = `Showing 1 - ${data.total} of ${data.total} images`;
      applyThumbnailPlaceholders();
      startThumbnailPersistenceObserver();
      console.log('[EH Reader] Restored expanded thumbnails from cache');
      return true;
    } catch (e) {
      console.warn('[EH Reader] Failed to restore expanded thumbnails', e);
      return false;
    }
  }
})();
