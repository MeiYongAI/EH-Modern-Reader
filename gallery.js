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
              links.forEach(a => {
                const wrapper = document.createElement('a');
                wrapper.href = a.getAttribute('href');
                // 子 div 作为缩略图容器
                const div = a.querySelector('div');
                wrapper.appendChild(div ? div.cloneNode(true) : document.createTextNode(''));
                frag.appendChild(wrapper);
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

  function buildCommentsPreview() {
    const commentRoot = document.getElementById('cdiv');
    if (!commentRoot) return;
    if (document.getElementById('eh-comment-preview')) return; // 已构建
    const grid = document.getElementById('gdt');
    if (!grid) return;

    // 提取评论块
    const comments = Array.from(commentRoot.querySelectorAll('.c1'));
    if (!comments.length) return;
    const PREVIEW_COUNT = 4;

    // 创建预览容器
    const preview = document.createElement('div');
    preview.id = 'eh-comment-preview';
    const theme = getThemeColors();
    preview.style.cssText = `border:1px solid ${theme.border}; padding:8px 10px; margin:12px 0 16px; font-size:12px; line-height:1.4; background:transparent; color:${theme.text};`;
    const title = document.createElement('div');
    title.textContent = '最新评论预览';
    title.style.cssText = 'font-weight:600; margin-bottom:6px; font-size:13px;';
    preview.appendChild(title);

    const list = document.createElement('div');
    list.style.maxHeight = 'none';
    comments.slice(0, PREVIEW_COUNT).forEach(c => {
      const item = c.cloneNode(true);
      // 精简：移除投票按钮、隐藏冗余
      item.querySelectorAll('.c4, .c5').forEach(el => el.remove());
      // 预览克隆移除所有 id，避免与弹窗内真实评论产生冲突（站点脚本可能按 id 定位）
      item.removeAttribute('id');
      item.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      item.style.background = 'transparent';
      item.style.borderColor = theme.border;
      item.style.color = theme.text;
      item.style.margin = '4px 0';
      // 预览区禁用交互，防止事件穿透或站点脚本联动
      item.style.pointerEvents = 'none';
      preview.appendChild(item);
    });

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'margin-top:6px; display:flex; gap:8px;';
    const openBtn = document.createElement('button');
    openBtn.textContent = '展开全部评论';
    openBtn.style.cssText = 'cursor:pointer;padding:4px 10px;font-size:12px;';
    const collapseOrig = () => { commentRoot.style.display = 'none'; };
    collapseOrig(); // 默认隐藏原始整块
    openBtn.onclick = (e) => { e.preventDefault(); showCommentsModal(commentRoot); };
    btnRow.appendChild(openBtn);
    if (comments.length > PREVIEW_COUNT) {
      const moreSpan = document.createElement('span');
      moreSpan.textContent = `其余 ${comments.length - PREVIEW_COUNT} 条…`;
      moreSpan.style.cssText = 'align-self:center;color:#999;';
      btnRow.appendChild(moreSpan);
    }
    preview.appendChild(btnRow);

    // 让预览容器与缩略图区域同宽并居中
    const adjustPreviewWidth = () => {
      const w = grid.clientWidth || grid.getBoundingClientRect().width;
      if (w && Number.isFinite(w)) {
        preview.style.maxWidth = w + 'px';
        preview.style.margin = '12px auto 16px';
        preview.style.borderRadius = '6px';
        preview.style.boxSizing = 'border-box';
      }
    };
    adjustPreviewWidth();
    window.addEventListener('resize', adjustPreviewWidth);

    // 插入位置：缩略图上方
    grid.parentNode.insertBefore(preview, grid);
  }

  function showCommentsModal(originalRoot) {
    if (document.getElementById('eh-comment-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'eh-comment-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;';
    const panel = document.createElement('div');
    panel.className = 'eh-comment-panel';
    const theme = getThemeColors();
    panel.style.cssText = `background:${theme.bodyBg};color:${theme.text};border:1px solid ${theme.border};padding:16px 20px;box-shadow:0 4px 18px rgba(0,0,0,0.4);`;
    
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 860px)').matches;
    
    // 顶部拖拽指示条
    const dragHandle = document.createElement('div');
    dragHandle.className = 'eh-drag-handle';
    
    if (isMobile) {
      // 移动端底部抽屉式：动态高度拖拽
      const setPanelHeightVH = (vh) => {
        vh = Math.max(50, Math.min(95, vh));
        panel.style.height = (CSS && 'supports' in CSS && CSS.supports('height', '1dvh')) ? `${vh}dvh` : `${vh}vh`;
      };
      let startY = 0, startH = 0, dragging = false;
      const getViewportH = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight);
      const pxToVh = (px) => 100 * px / getViewportH();
      
      const onPointerDown = (ev) => {
        const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
        startY = y;
        const rect = panel.getBoundingClientRect();
        startH = pxToVh(rect.height);
        dragging = true;
        ev.preventDefault();
      };
      const onPointerMove = (ev) => {
        if (!dragging) return;
        const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
        const delta = y - startY;
        const next = startH - pxToVh(delta);
        setPanelHeightVH(next);
        ev.preventDefault();
      };
      const onPointerUp = () => {
        if (!dragging) return;
        dragging = false;
        const rect = panel.getBoundingClientRect();
        const current = pxToVh(rect.height);
        const snaps = [55, 80, 95];
        let best = snaps[0], mind = 999;
        for (const s of snaps) { const d = Math.abs(s - current); if (d < mind) { mind = d; best = s; } }
        setPanelHeightVH(best);
      };
      
      dragHandle.addEventListener('touchstart', onPointerDown, { passive: false });
      dragHandle.addEventListener('touchmove', onPointerMove, { passive: false });
      dragHandle.addEventListener('touchend', onPointerUp, { passive: false });
      dragHandle.addEventListener('mousedown', onPointerDown);
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      
      const updateMaxH = () => {
        const vh = getViewportH();
        panel.style.maxHeight = (vh - 12) + 'px';
      };
      updateMaxH();
      if (window.visualViewport) window.visualViewport.addEventListener('resize', updateMaxH);
      
      const cleanup = () => {
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        if (window.visualViewport) window.visualViewport.removeEventListener('resize', updateMaxH);
      };
      panel._mobileCleanup = cleanup;
    }
    // ============ History Back 支持：按系统/浏览器返回仅关闭弹窗 ============
    let historyInjected = false;
    let closingByPopstate = false;
    try {
      history.pushState({ ehCommentModal: true }, '', location.href);
      historyInjected = true;
    } catch (e) {
      console.warn('[EH Modern Reader] pushState 评论弹窗失败', e);
    }
    const popHandler = (ev) => {
      if (document.getElementById('eh-comment-modal')) {
        closingByPopstate = true;
        if (panel._mobileCleanup) panel._mobileCleanup();
        restoreRoot();
        overlay.remove();
        window.removeEventListener('popstate', popHandler);
      }
    };
    window.addEventListener('popstate', popHandler);
  const header = document.createElement('div');
  header.className = 'eh-comment-header';
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
    const hTitle = document.createElement('div');
    hTitle.textContent = '全部评论';
    hTitle.style.fontWeight = '600';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.cssText = 'cursor:pointer;padding:4px 10px;font-size:12px;';

    // 占位符用于恢复评论区原位
    const placeholderId = 'eh-comment-placeholder';
    let placeholder = document.getElementById(placeholderId);
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.id = placeholderId;
      placeholder.style.display = 'none';
      originalRoot.parentNode.insertBefore(placeholder, originalRoot.nextSibling);
    }
    const restoreRoot = () => {
      if (placeholder && placeholder.parentNode) {
        originalRoot.style.display = 'none';
        placeholder.parentNode.insertBefore(originalRoot, placeholder);
        placeholder.remove();
      }
    };
    closeBtn.onclick = () => {
      if (panel._mobileCleanup) panel._mobileCleanup();
      restoreRoot();
      overlay.remove();
      if (historyInjected && !closingByPopstate) {
        window.removeEventListener('popstate', popHandler);
        try { history.back(); } catch (_) {}
      }
    };

  header.appendChild(hTitle);
    header.appendChild(closeBtn);
  panel.appendChild(dragHandle);
  panel.appendChild(header);

    // 将原始评论树移动进弹窗，避免背景响应
    originalRoot.style.display = 'block';
    originalRoot.querySelectorAll('.c1').forEach(el => {
      el.style.background = 'transparent';
      el.style.borderColor = theme.border;
      el.style.color = theme.text;
    });
    panel.appendChild(originalRoot);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // 锁定背景滚动，仅允许弹窗内部滚动
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const restore = () => { document.body.style.overflow = prevOverflow || ''; };
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (panel._mobileCleanup) panel._mobileCleanup();
        restoreRoot();
        overlay.remove();
        if (historyInjected && !closingByPopstate) {
          window.removeEventListener('popstate', popHandler);
          try { history.back(); } catch (_) {}
        }
        restore();
      }
    });
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        if (panel._mobileCleanup) panel._mobileCleanup();
        restoreRoot();
        overlay.remove();
        if (historyInjected && !closingByPopstate) {
          window.removeEventListener('popstate', popHandler);
          try { history.back(); } catch (_) {}
        }
        document.removeEventListener('keydown', escHandler);
        restore();
      }
    };
    document.addEventListener('keydown', escHandler);
    const cleanupOnRemove = new MutationObserver(() => {
      if (!document.body.contains(overlay)) { restore(); cleanupOnRemove.disconnect(); }
    });
    cleanupOnRemove.observe(document.body, { childList: true });
    // 防滚动穿透
    panel.addEventListener('wheel', (ev) => { ev.stopPropagation(); }, { passive: false });
    // 阻断 hover 事件向上传播，避免影响页面上方的评论预览
    const stopHover = (ev) => ev.stopPropagation();
    panel.addEventListener('mouseover', stopHover, true);
    panel.addEventListener('mouseout', stopHover, true);
    panel.addEventListener('mouseenter', stopHover, true);
    panel.addEventListener('mouseleave', stopHover, true);

    // 将“悬停显示分数详情”改为“点击分数开关详情（仅在弹窗内部生效）”
    panel.addEventListener('click', (ev) => {
      const target = ev.target;
      if (!target) return;
      const comment = target.closest && target.closest('.c1');
      if (!comment) return;
      // 识别“分数”元素：优先匹配 c6，其次包含“分数”的文本节点容器
      const scoreEl = target.closest('.c6, .score, span, a');
      if (!scoreEl) return;
      const text = (scoreEl.textContent || '').trim();
      if (!/(分数|score)/i.test(text)) return;

      ev.preventDefault();
      ev.stopPropagation();

      let box = comment.querySelector('.eh-vote-details');
      if (box) {
        // 二次点击直接移除元素，避免 display 被站点样式覆盖导致无法收起
        box.remove();
        return;
      }
      // 新建详情面板
      box = document.createElement('div');
      const theme2 = getThemeColors();
      box.className = 'eh-vote-details';
      box.style.cssText = `margin:6px 0 2px; padding:6px 8px; border:1px solid ${theme2.border}; border-radius:4px; background:transparent; color:${theme2.text}; font-size:12px; line-height:1.4;`;

      // 尝试来源1：title 提示
      const titleTip = scoreEl.getAttribute('title');
      if (titleTip) {
        box.textContent = titleTip;
      } else {
        // 尝试来源2：同条评论内可能存在的投票详情块（类名猜测）
        const candidate = comment.querySelector('.cvote, .cvotes, .c7');
        if (candidate) {
          box.appendChild(candidate.cloneNode(true));
        } else {
          box.textContent = '投票详情';
        }
      }
      comment.appendChild(box);
    }, true);

    // 在弹窗内拦截“展开全部评论”点击，防止跳转导致弹窗关闭，改为本地展开
    panel.addEventListener('click', (ev) => {
      const trigger = ev.target && ev.target.closest && ev.target.closest('a,button');
      if (!trigger) return;
      const txt = (trigger.textContent || '').trim();
      if (!/(展开全部|展开|expand all|show all)/i.test(txt)) return;
      ev.preventDefault();
      ev.stopPropagation();
      try {
        // 解除内联 max-height 折叠
        panel.querySelectorAll('[style*="max-height"]').forEach(n => { n.style.maxHeight = 'none'; });
        // 显示被隐藏的评论项
        panel.querySelectorAll('.c1, .c2, .c3').forEach(n => {
          if (n.style && /display\s*:\s*none/i.test(n.style.cssText)) {
            n.style.display = 'block';
          }
        });
        // 去除常见折叠类名
        panel.querySelectorAll('.collapsed, .folded, .hide, .noshow').forEach(n => {
          n.classList.remove('collapsed');
          n.classList.remove('folded');
          n.classList.remove('hide');
          n.classList.remove('noshow');
        });
        // 尝试调用原 onclick（若存在）以兼容站点逻辑，但不冒泡
        if (typeof trigger.onclick === 'function') {
          try { trigger.onclick.call(trigger, new Event('click', { bubbles: false, cancelable: true })); } catch {}
        }
        console.log('[EH Modern Reader] 已在弹窗内本地展开全部评论');
      } catch (e) {
        console.warn('[EH Modern Reader] 本地展开全部评论失败', e);
      }
    }, true);
  }

  // 为缩略图添加占位背景，减轻加载抖动
  function applyThumbnailPlaceholders() {
    const theme = getThemeColors();
    const placeholder = theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const thumbs = document.querySelectorAll('#gdt a[href*="/s/"] > div');
    thumbs.forEach(div => {
      // 保留原始背景图，仅增加底色与边框，且若无高度则给一个最小高度
      div.style.backgroundColor = placeholder;
      if (!div.style.border) div.style.border = `1px solid ${theme.border}`;
      if (!div.style.borderRadius) div.style.borderRadius = '4px';
      if (!div.style.height) div.style.minHeight = '220px';
    });
  }

  function initCommentsFeature() {
    buildCommentsPreview();
    applyThumbnailPlaceholders();
    // 隐藏原站点的页码区（例如 “1 - 20，共 195 张图像”），避免与扩展的页码信息重复
    try {
      document.querySelectorAll('.gpc').forEach(el => {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      });
    } catch {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initCommentsFeature, 200));
  } else {
    setTimeout(initCommentsFeature, 50);
  }

})();
