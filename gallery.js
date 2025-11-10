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

  /**
   * 通过 showpage API 获取图片页面信息
   */
  async function fetchPageImageUrl(page) {
    try {
      const response = await fetch(pageData.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'showpage',
          gid: pageData.gid,
          page: page,
          imgkey: '', // 首次请求不需要 imgkey
          showkey: pageData.token
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[EH Reader] Page ${page} data:`, data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 返回图片 URL（i3 是 780px 宽度的版本，i7 是原图）
      return {
        pageNumber: page + 1,
        imageUrl: data.i3, // 初始加载使用压缩版
        fullUrl: data.i7,  // 原图 URL
        imgkey: data.k,
        width: data.xres,
        height: data.yres
      };
    } catch (error) {
      console.error(`[EH Reader] Failed to fetch page ${page}:`, error);
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
      for (let i = 0; i < pageCount; i++) {
        imagelist.push({
          n: (i + 1).toString(),
          k: '', // 将在加载时填充
          t: ''  // 缩略图 URL（稍后从 Gallery 页面获取）
        });
      }
      
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

    // 创建按钮容器
    const buttonContainer = document.createElement('p');
    buttonContainer.className = 'g2 gsp';
    buttonContainer.style.cssText = 'background: linear-gradient(90deg, #4568dc, #b06ab3); padding: 8px; border-radius: 4px;';

    // 创建图标
    const icon = document.createElement('img');
    icon.src = 'https://ehgt.org/g/mr.gif';
    
    // 创建按钮
    const button = document.createElement('a');
    button.href = '#';
    button.textContent = 'EH Modern Reader';
    button.style.cssText = 'color: #fff; font-weight: bold; text-decoration: none;';
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
