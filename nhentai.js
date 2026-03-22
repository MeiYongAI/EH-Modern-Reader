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
      let detail = null;
      try {
        detail = await readPageContextData(1200);
      } catch {}

      const gallery = (detail && detail.gallery) || parseGalleryFromInlineScripts();
      let imageHosts = (detail && Array.isArray(detail.imageHosts) && detail.imageHosts) || [];
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

  async function buildReaderData(startAt) {
    const pathInfo = getPathInfo();
    const boot = await resolveBootstrapData();
    const gallery = boot && boot.gallery ? boot.gallery : null;
    if (!pathInfo || !gallery) return null;

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
      return {
        n: String(idx + 1),
        url: `https://${imageHost}/galleries/${mediaId}/${idx + 1}.${ext}`
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

    if (document.getElementById('eh-nh-reader-launch')) {
      return;
    }

    const btn = document.createElement('button');
    btn.id = 'eh-nh-reader-launch';
    btn.className = 'btn btn-primary';
    btn.type = 'button';
    btn.textContent = 'EH Modern Reader';
    btn.style.marginLeft = '8px';
    btn.addEventListener('click', () => {
      launchReader(pathInfo.startPage || 1).catch(() => {});
    });

    const buttonsRow = document.querySelector('.buttons');
    if (buttonsRow) {
      buttonsRow.appendChild(btn);
      return;
    }

    const readerRight = document.querySelector('.reader-buttons-right');
    if (readerRight) {
      readerRight.appendChild(btn);
    }
  }

  function interceptThumbnailClicks() {
    const thumbs = document.querySelector('#thumbnail-container .thumbs');
    if (!thumbs) return;

    const shouldBypass = (ev) => ev.ctrlKey || ev.shiftKey || ev.metaKey || ev.altKey || ev.button === 1;

    thumbs.addEventListener('click', (e) => {
      if (e.defaultPrevented || shouldBypass(e)) return;
      const a = e.target && e.target.closest ? e.target.closest('a.gallerythumb[href*="/g/"]') : null;
      if (!a) return;

      const href = a.getAttribute('href') || '';
      const m = href.match(/\/g\/(\d+)\/(\d+)\/?/i);
      if (!m) return;

      e.preventDefault();
      const pageNum = parseInt(m[2], 10);
      launchReader(pageNum).catch(() => {});
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      resolveBootstrapData().catch(() => {});
      addLaunchButton();
      interceptThumbnailClicks();
    });
  } else {
    resolveBootstrapData().catch(() => {});
    addLaunchButton();
    interceptThumbnailClicks();
  }
})();
