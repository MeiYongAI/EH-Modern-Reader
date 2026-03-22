/**
 * nhentai Bootstrap Script
 * Parse gallery data and launch EH Modern Reader via Gallery mode bridge.
 */

(function() {
  'use strict';

  if (window.ehNhentaiBootstrapInjected) {
    return;
  }
  window.ehNhentaiBootstrapInjected = true;

  function debugLog(...args) {
    try {
      console.log(...args);
    } catch {}
  }

  function getPathInfo() {
    const m = window.location.pathname.match(/^\/g\/(\d+)(?:\/(\d+)\/?)?/i);
    if (!m) return null;
    return {
      gid: parseInt(m[1], 10),
      startPage: m[2] ? parseInt(m[2], 10) : null
    };
  }

  function isNhentaiMirrorHost() {
    return /(^|\.)nhentai\.xxx$/i.test(window.location.hostname || '');
  }

  function parseGalleryFromInlineScripts() {
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const s of scripts) {
      const text = s.textContent || '';
      const m = text.match(/window\._gallery\s*=\s*JSON\.parse\(("(?:\\.|[^"\\])*")\)\s*;?/);
      if (!m) continue;
      try {
        const encodedJson = JSON.parse(m[1]);
        return JSON.parse(encodedJson);
      } catch {}
    }
    return null;
  }

  function parseImageHostsFromInlineScripts() {
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const s of scripts) {
      const text = s.textContent || '';
      const m = text.match(/image_cdn_urls\s*:\s*\[([^\]]+)\]/);
      if (!m) continue;
      const hosts = m[1]
        .split(',')
        .map((x) => x.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      if (hosts.length > 0) return hosts;
    }
    return [];
  }

  let bootstrapDataPromise = null;
  let bootstrapDataCache = null;

  function readPageContextData(timeoutMs) {
    return new Promise((resolve) => {
      const eventName = 'ehModernReaderNhentaiData';
      let done = false;

      const finish = (detail) => {
        if (done) return;
        done = true;
        try { window.removeEventListener(eventName, onData); } catch {}
        resolve(detail || null);
      };

      const onData = (ev) => {
        finish(ev && ev.detail ? ev.detail : null);
      };

      window.addEventListener(eventName, onData, { once: true });

      try {
        const injected = document.createElement('script');
        injected.textContent = `(() => {
          try {
            const detail = {
              gallery: (typeof window._gallery === 'object' && window._gallery) ? window._gallery : null,
              imageHosts: (window._n_app && Array.isArray(window._n_app.image_cdn_urls)) ? window._n_app.image_cdn_urls : null
            };
            window.dispatchEvent(new CustomEvent('${eventName}', { detail }));
          } catch (e) {
            window.dispatchEvent(new CustomEvent('${eventName}', { detail: null }));
          }
        })();`;
        (document.head || document.documentElement).appendChild(injected);
        injected.remove();
      } catch {
        finish(null);
        return;
      }

      setTimeout(() => finish(null), timeoutMs);
    });
  }

  async function resolveBootstrapData() {
    if (bootstrapDataCache) return bootstrapDataCache;
    if (bootstrapDataPromise) return bootstrapDataPromise;

    bootstrapDataPromise = (async () => {
      // nhentai.xxx 在严格 CSP 下禁止内联脚本注入，直接走 DOM 回退解析。
      if (isNhentaiMirrorHost()) {
        return { gallery: null, imageHosts: [] };
      }

      // 先走内联脚本解析，成功时不再注入页面脚本，可避免部分站点 CSP 警告。
      const inlineGallery = parseGalleryFromInlineScripts();
      let inlineHosts = parseImageHostsFromInlineScripts();
      if (inlineGallery) {
        const resolvedInline = { gallery: inlineGallery, imageHosts: inlineHosts || [] };
        bootstrapDataCache = resolvedInline;
        return resolvedInline;
      }

      let detail = null;
      try {
        detail = await readPageContextData(1200);
      } catch {}

      const gallery = (detail && detail.gallery) || inlineGallery || parseGalleryFromInlineScripts();
      let imageHosts = (detail && Array.isArray(detail.imageHosts) && detail.imageHosts) || [];
      if (!imageHosts || imageHosts.length === 0) {
        imageHosts = inlineHosts;
      }
      if (!imageHosts || imageHosts.length === 0) {
        imageHosts = parseImageHostsFromInlineScripts();
      }

      const resolved = { gallery, imageHosts };
      // 如果页面变量尚未就绪，不缓存失败结果，后续点击时允许重试。
      if (resolved.gallery) {
        bootstrapDataCache = resolved;
      }
      return resolved;
    })().finally(() => {
      bootstrapDataPromise = null;
    });

    return bootstrapDataPromise;
  }

  function normalizeTitle(gallery) {
    if (!gallery || !gallery.title) return document.title;
    return gallery.title.pretty || gallery.title.english || gallery.title.japanese || document.title;
  }

  function normalizeMirrorTitle() {
    const h1 = document.querySelector('.info h1');
    const h2 = document.querySelector('.info h2');
    const t1 = h1 ? String(h1.textContent || '').trim() : '';
    const t2 = h2 ? String(h2.textContent || '').trim() : '';
    if (t1 && t2) return `${t1} / ${t2}`;
    if (t1) return t1;
    if (t2) return t2;
    return document.title;
  }

  function parseMirrorGTh() {
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const s of scripts) {
      const text = s.textContent || '';
      const m = text.match(/var\s+g_th\s*=\s*\$\.parseJSON\('([\s\S]*?)'\);/);
      if (!m) continue;
      try {
        const raw = m[1].replace(/\\'/g, "'");
        return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  function parseNhentaiXxxData(pathInfo, explicitStartAt) {
    const loadServer = (document.getElementById('load_server') || document.getElementById('server_id'))?.value || '';
    const loadDir = (document.getElementById('load_dir') || document.getElementById('image_dir'))?.value || '';
    const loadId = (document.getElementById('load_id') || document.getElementById('gallery_id'))?.value || '';
    const loadPages = (document.getElementById('load_pages') || document.getElementById('pages'))?.value || '';

    let server = String(loadServer || '').trim();
    let dir = String(loadDir || '').trim();
    let media = String(loadId || '').trim();
    let pagesCount = Number.parseInt(loadPages, 10);

    // 单页阅读地址兜底：从当前大图 data-src 反解 server/dir/id。
    if ((!server || !dir || !media) && pathInfo && pathInfo.startPage) {
      const src = document.querySelector('#fimg')?.getAttribute('data-src') || '';
      const mm = src.match(/^https?:\/\/i(\d+)\.nhentaimg\.com\/(\d+)\/([^\/]+)\/\d+\.[a-z0-9]+(?:\?.*)?$/i);
      if (mm) {
        server = server || mm[1];
        dir = dir || mm[2];
        media = media || mm[3];
      }
    }

    if (!server || !dir || !media) {
      return null;
    }

    if (!Number.isFinite(pagesCount) || pagesCount <= 0) {
      const gthTmp = parseMirrorGTh();
      if (gthTmp && gthTmp.fl) {
        pagesCount = Object.keys(gthTmp.fl).length;
      }
    }
    if (!Number.isFinite(pagesCount) || pagesCount <= 0) {
      pagesCount = pathInfo && pathInfo.startPage ? pathInfo.startPage : 0;
    }
    if (!Number.isFinite(pagesCount) || pagesCount <= 0) {
      return null;
    }

    const gth = parseMirrorGTh();
    const fl = gth && gth.fl ? gth.fl : {};
    const extMap = { j: 'jpg', p: 'png', g: 'gif', w: 'webp' };

    const currentSrc = document.querySelector('#fimg')?.getAttribute('data-src') || '';
    const currentExtMatch = currentSrc.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
    const defaultExt = currentExtMatch ? currentExtMatch[1].toLowerCase() : 'webp';

    const orderedExts = (primary) => {
      const order = [primary, 'webp', 'jpg', 'jpeg', 'png', 'gif'];
      const out = [];
      const seen = new Set();
      for (const e of order) {
        const x = String(e || '').toLowerCase();
        if (!x || seen.has(x)) continue;
        seen.add(x);
        out.push(x);
      }
      return out;
    };

    const imageSizes = [];
    const imagelist = [];
    for (let i = 1; i <= pagesCount; i++) {
      const meta = typeof fl[String(i)] === 'string' ? fl[String(i)].split(',') : [];
      const ext = extMap[(meta[0] || '').toLowerCase()] || defaultExt;
      const width = Number.parseInt(meta[1], 10) || 0;
      const height = Number.parseInt(meta[2], 10) || 0;
      const exts = orderedExts(ext);
      const base = `https://i${server}.nhentaimg.com/${dir}/${media}/${i}`;
      const urls = exts.map((x) => `${base}.${x}`);
      imageSizes.push({
        width,
        height,
        ratio: width > 0 && height > 0 ? (width / height) : 1
      });
      imagelist.push({
        n: String(i),
        url: urls[0],
        altUrls: urls.slice(1)
      });
    }

    return {
      imagelist,
      imageSizes,
      pagecount: pagesCount,
      gid: pathInfo.gid,
      mpvkey: `nhentai_xxx_${media}`,
      gallery_url: `${window.location.origin}/g/${pathInfo.gid}/`,
      title: normalizeMirrorTitle(),
      source: 'nhentai',
      startAt: (typeof explicitStartAt === 'number' && explicitStartAt >= 1 && explicitStartAt <= pagesCount)
        ? explicitStartAt
        : ((typeof pathInfo.startPage === 'number' && pathInfo.startPage >= 1) ? pathInfo.startPage : undefined)
    };
  }

  async function buildReaderData(startAt) {
    const pathInfo = getPathInfo();
    const boot = await resolveBootstrapData();
    const gallery = boot && boot.gallery ? boot.gallery : null;
    if (!pathInfo) return null;

    if (!gallery) {
      // 镜像站专用回退，避免影响 nhentai.net 主站逻辑。
      if (isNhentaiMirrorHost()) {
        return parseNhentaiXxxData(pathInfo, startAt);
      }
      return null;
    }

    const imageHosts = (boot && Array.isArray(boot.imageHosts) && boot.imageHosts.length > 0)
      ? boot.imageHosts
      : ['i1.nhentai.net'];
    const imageHost = imageHosts[0];

    const mediaId = String(gallery.media_id || '').trim();
    const pages = (gallery.images && Array.isArray(gallery.images.pages)) ? gallery.images.pages : [];

    const extMap = {
      j: 'jpg',
      p: 'png',
      g: 'gif',
      w: 'webp'
    };

    const imagelist = pages.map((p, idx) => {
      const ext = extMap[(p && p.t) ? p.t : 'j'] || 'jpg';
      const base = `https://${imageHost}/galleries/${mediaId}/${idx + 1}`;
      const candidates = [
        `${base}.${ext}`,
        `${base}.webp`,
        `${base}.jpg`,
        `${base}.jpeg`,
        `${base}.png`,
        `${base}.gif`
      ];
      const uniq = [];
      const seen = new Set();
      for (const u of candidates) {
        if (seen.has(u)) continue;
        seen.add(u);
        uniq.push(u);
      }
      return {
        n: String(idx + 1),
        url: uniq[0],
        altUrls: uniq.slice(1)
      };
    });

    const imageSizes = pages.map((p) => {
      const w = p && Number.isFinite(p.w) ? p.w : 0;
      const h = p && Number.isFinite(p.h) ? p.h : 0;
      const ratio = (w > 0 && h > 0) ? (w / h) : 1;
      return { width: w, height: h, ratio };
    });

    const pageCount = imagelist.length || Number(gallery.num_pages) || 0;
    const normalizedStart = (typeof startAt === 'number' && startAt >= 1 && startAt <= pageCount) ? startAt : undefined;

    return {
      imagelist,
      imageSizes,
      pagecount: pageCount,
      gid: pathInfo.gid,
      mpvkey: `nhentai_${mediaId || pathInfo.gid}`,
      gallery_url: `${window.location.origin}/g/${pathInfo.gid}/`,
      title: normalizeTitle(gallery),
      source: 'nhentai',
      startAt: normalizedStart
    };
  }

  let launchInFlight = false;

  async function launchReader(startAt) {
    if (launchInFlight) return;
    launchInFlight = true;
    try {
      const data = await buildReaderData(startAt);
      if (!data || !Array.isArray(data.imagelist) || data.imagelist.length === 0) {
        console.warn('[EH Reader] nhentai bootstrap failed: no gallery data');
        return;
      }

      window.__ehReaderData = data;
      window.__ehGalleryBootstrap = {
        enabled: true,
        fetchPageImageUrl: async function(page) {
          const entry = data.imagelist[page];
          return {
            pageNumber: page + 1,
            pageUrl: entry ? entry.url : '',
            imgkey: entry ? `nh_${page + 1}` : ''
          };
        }
      };

      document.dispatchEvent(new CustomEvent('ehGalleryReaderReady', { detail: data }));
      debugLog('[EH Reader] nhentai reader event dispatched');
    } finally {
      launchInFlight = false;
    }
  }

  function addLaunchButton() {
    const pathInfo = getPathInfo();
    if (!pathInfo) return;

    const ensureButton = () => {
      let btn = document.getElementById('eh-nh-reader-launch');
      if (btn) return btn;

      btn = document.createElement('button');
      btn.id = 'eh-nh-reader-launch';
      btn.className = isNhentaiMirrorHost() ? 'mbtn' : 'btn btn-primary';
      btn.type = 'button';
      btn.textContent = 'EH Modern Reader';
      btn.style.marginLeft = '8px';
      btn.addEventListener('click', () => {
        const explicitStart = (typeof pathInfo.startPage === 'number' && pathInfo.startPage >= 1)
          ? pathInfo.startPage
          : undefined;
        launchReader(explicitStart).catch(() => {});
      });
      return btn;
    };

    const tryMount = () => {
      const btn = ensureButton();
      const containers = [
        '.g_buttons',
        '.buttons',
        '.reader-buttons-right',
        '.reader_nav .rd_pg'
      ];

      for (const sel of containers) {
        const host = document.querySelector(sel);
        if (!host) continue;
        if (btn.parentNode !== host) {
          host.appendChild(btn);
        }
        return true;
      }
      return false;
    };

    if (tryMount()) return;

    let attempts = 0;
    const maxAttempts = 40;
    const timer = setInterval(() => {
      attempts++;
      if (tryMount()) {
        clearInterval(timer);
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(timer);
        const btn = ensureButton();
        if (!btn.parentNode) {
          btn.style.position = 'fixed';
          btn.style.right = '14px';
          btn.style.bottom = '14px';
          btn.style.zIndex = '2147483647';
          document.body.appendChild(btn);
        }
      }
    }, 250);
  }

  function interceptThumbnailClicks() {
    const thumbs = document.querySelector('#thumbnail-container .thumbs') || document.querySelector('#thumbs_append');
    if (!thumbs) return;

    const shouldBypass = (ev) => ev.ctrlKey || ev.shiftKey || ev.metaKey || ev.altKey || ev.button === 1;

    thumbs.addEventListener('click', (e) => {
      if (e.defaultPrevented || shouldBypass(e)) return;
      const a = e.target && e.target.closest
        ? e.target.closest('a.gallerythumb[href*="/g/"], a[href*="/g/"]')
        : null;
      if (!a) return;

      const href = a.getAttribute('href') || '';
      const m = href.match(/\/g\/(\d+)\/(\d+)\/?/i);
      if (!m) return;

      e.preventDefault();
      const pageNum = parseInt(m[2], 10);
      launchReader(pageNum).catch(() => {});
    }, true);
  }

  function autoLaunchOnMirrorReaderPage() {
    if (!isNhentaiMirrorHost()) return;
    const pathInfo = getPathInfo();
    if (!pathInfo || !pathInfo.startPage) return;

    // /g/{id}/{page}/ 页面默认自动进入现代阅读器。
    launchReader(pathInfo.startPage).catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      resolveBootstrapData().catch(() => {});
      addLaunchButton();
      interceptThumbnailClicks();
      autoLaunchOnMirrorReaderPage();
    });
  } else {
    resolveBootstrapData().catch(() => {});
    addLaunchButton();
    interceptThumbnailClicks();
    autoLaunchOnMirrorReaderPage();
  }
})();
