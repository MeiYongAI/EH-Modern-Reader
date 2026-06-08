/**
 * hitomi.la Bootstrap Script
 * Build page data from hitomi gallery/reader globals and launch Gallery Reader.
 */

(function() {
  'use strict';

  if (window.ehHitomiBootstrapInjected) {
    return;
  }
  window.ehHitomiBootstrapInjected = true;

  function debugLog(...args) {
    try { console.log(...args); } catch {}
  }

  function ensureReaderContentScript() {
    if (window.ehModernReaderInjected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        if (!chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
          reject(new Error('Extension runtime is unavailable'));
          return;
        }

        chrome.runtime.sendMessage({ action: 'ensureReaderContentScript' }, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }

          if (!response || response.success !== true) {
            reject(new Error((response && response.error) || 'Failed to inject reader script'));
            return;
          }

          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function fetchHitomiText(url) {
    return new Promise((resolve, reject) => {
      try {
        if (!chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
          reject(new Error('Extension runtime is unavailable'));
          return;
        }

        chrome.runtime.sendMessage({ action: 'fetchHitomiText', url }, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }

          if (!response || response.success !== true || typeof response.text !== 'string') {
            reject(new Error((response && response.error) || 'Failed to fetch Hitomi text'));
            return;
          }

          resolve(response.text);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function getPathInfo() {
    const p = window.location.pathname || '';
    const hashPage = parseInt((window.location.hash || '').replace('#', ''), 10);
    const normalizedHashPage = Number.isFinite(hashPage) && hashPage > 0 ? hashPage : null;

    const readerMatch = p.match(/^\/reader\/(\d+)\.html$/i);
    if (readerMatch) {
      return {
        gid: parseInt(readerMatch[1], 10),
        startPage: normalizedHashPage || 1,
        isReaderPage: true
      };
    }

    const galleryMatch = p.match(/-(\d+)\.html$/i);
    if (galleryMatch) {
      return {
        gid: parseInt(galleryMatch[1], 10),
        startPage: normalizedHashPage,
        isReaderPage: false
      };
    }

    return null;
  }

  let dataCache = null;
  let dataPromise = null;

  function detectAssetHost() {
    const scriptNodes = Array.from(document.querySelectorAll('script[src]'));
    for (const s of scriptNodes) {
      const src = s.getAttribute('src') || '';
      if (/gold-usergeneratedcontent\.net/i.test(src)) {
        try {
          const u = new URL(src, window.location.origin);
          return u.host;
        } catch {}
      }
    }
    return 'ltn.gold-usergeneratedcontent.net';
  }

  function normalizeUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('//')) return `${window.location.protocol}${url}`;
    if (url.startsWith('/')) return `${window.location.origin}${url}`;
    return url;
  }

  function extFromName(file) {
    const name = (file && file.name) ? String(file.name) : '';
    const m = name.match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : 'jpg';
  }

  const HITOMI_MEDIA_DOMAIN = 'gold-usergeneratedcontent.net';
  const DEFAULT_GG_B = '1780902081/';
  let ggMetaCache = null;
  let ggMetaPromise = null;

  function hashRouteValue(hash) {
    const h = String(hash || '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(h)) return null;
    return parseInt(h.slice(-1) + h.slice(-3, -1), 16);
  }

  async function resolveGgMeta() {
    if (ggMetaCache) return ggMetaCache;
    if (ggMetaPromise) return ggMetaPromise;

    ggMetaPromise = (async () => {
      try {
        const host = detectAssetHost();
        const url = `https://${host}/gg.js`;
        const text = await fetchHitomiText(url);
        const bMatch = text.match(/\bb:\s*'([^']+)'/);
        const routePrefix = bMatch ? bMatch[1] : DEFAULT_GG_B;

        const mSet = new Set();
        let m;
        const caseRe = /case\s+(\d+)\s*:/g;
        while ((m = caseRe.exec(text)) !== null) {
          mSet.add(parseInt(m[1], 10));
        }

        ggMetaCache = { routePrefix, mSet };
        return ggMetaCache;
      } catch (e) {
        debugLog('[Gallery Reader] gg.js parse fallback:', e && e.message ? e.message : e);
        ggMetaCache = { routePrefix: DEFAULT_GG_B, mSet: new Set() };
        return ggMetaCache;
      }
    })().finally(() => {
      ggMetaPromise = null;
    });

    return ggMetaPromise;
  }

  function imageSubdomainFromHash(hash, dir, ggMeta) {
    const rv = hashRouteValue(hash);
    if (!Number.isFinite(rv)) return (dir === 'webp' || dir === 'avif') ? 'aa' : '1';

    // hitomi's gg.m() defaults to 1 and returns 0 for values listed in case blocks.
    // Original images use 1/2. AVIF/WebP reader sources use aa/ba, matching common.js
    // url_from_url_from_hash(..., dir, undefined, 'a').
    const ggM = ggMeta && ggMeta.mSet && ggMeta.mSet.has(rv) ? 0 : 1;
    if (dir === 'webp' || dir === 'avif') {
      return `${String.fromCharCode(97 + ggM)}a`;
    }
    return `${1 + ggM}`;
  }

  function fullPathFromHash(hash, ggMeta) {
    const h = String(hash || '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(h)) return '';
    const rv = hashRouteValue(h);
    if (!Number.isFinite(rv)) return '';
    const routePrefix = (ggMeta && ggMeta.routePrefix) ? ggMeta.routePrefix : DEFAULT_GG_B;
    return `${routePrefix}${rv}/${h}`;
  }

  function buildImageUrlByDir(file, ggMeta, dir, ext) {
    if (!file || !file.hash) return '';
    const path = fullPathFromHash(file.hash, ggMeta);
    if (!path) return '';
    const sub = imageSubdomainFromHash(file.hash, dir, ggMeta);

    if (dir === 'webp' || dir === 'avif') {
      return `https://${sub}.${HITOMI_MEDIA_DOMAIN}/${path}.${ext}`;
    }
    return `https://${sub}.${HITOMI_MEDIA_DOMAIN}/${dir}/${path}.${ext}`;
  }

  function fallbackLegacyUrl(file) {
    if (!file || !file.hash) return '';
    const h = String(file.hash);
    if (!h || h.length < 3) return '';
    const d1 = h.slice(-1);
    const d2 = h.slice(-3, -1);
    const ext = extFromName(file);
    return `https://a.hitomi.la/images/${d1}/${d2}/${h}.${ext}`;
  }

  function makeImageCandidates(file, ggMeta) {
    const ext = extFromName(file);
    const out = [];

    if (file && file.hasavif) {
      out.push(buildImageUrlByDir(file, ggMeta, 'avif', 'avif'));
    }
    if (file && file.haswebp) {
      out.push(buildImageUrlByDir(file, ggMeta, 'webp', 'webp'));
    }
    out.push(buildImageUrlByDir(file, ggMeta, 'images', ext));
    out.push(fallbackLegacyUrl(file));

    const uniq = [];
    const seen = new Set();
    for (const u of out) {
      const n = normalizeUrl(u);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      uniq.push(n);
    }
    return uniq;
  }

  function extractBalancedObject(text, anchorRegex) {
    const m = anchorRegex.exec(text);
    if (!m) return null;
    const start = text.indexOf('{', m.index);
    if (start < 0) return null;

    let i = start;
    let depth = 0;
    let inStr = false;
    let quote = '';
    let escape = false;

    for (; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          continue;
        }
        if (ch === quote) {
          inStr = false;
          quote = '';
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        inStr = true;
        quote = ch;
        continue;
      }

      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }

    return null;
  }

  function parseGalleryInfoFromScript(scriptText) {
    if (!scriptText) return null;

    const objectLiteral = extractBalancedObject(scriptText, /(?:var\s+)?galleryinfo\s*=\s*/i);
    if (!objectLiteral) return null;

    try {
      // hitomi galleries/*.js 通常是标准 JSON 风格对象字面量
      return JSON.parse(objectLiteral);
    } catch {
      return null;
    }
  }

  async function fetchGalleryInfoById(gid) {
    const host = detectAssetHost();
    const url = `https://${host}/galleries/${gid}.js`;

    const scriptText = await fetchHitomiText(url);
    const galleryinfo = parseGalleryInfoFromScript(scriptText);
    if (!galleryinfo || !Array.isArray(galleryinfo.files) || galleryinfo.files.length === 0) {
      throw new Error('parse galleryinfo failed');
    }
    return galleryinfo;
  }

  async function makeImagePlanFromFiles(files) {
    const ggMeta = await resolveGgMeta();
    return files.map((f) => {
      const candidates = makeImageCandidates(f, ggMeta);
      return {
        primary: candidates[0] || '',
        candidates
      };
    });
  }

  async function resolveData() {
    if (dataCache) return dataCache;
    if (dataPromise) return dataPromise;

    dataPromise = (async () => {
      const pathInfo = getPathInfo();
      if (!pathInfo || !pathInfo.gid) return null;

      // 直接拉取 galleries/{id}.js，规避页面 CSP 对内联脚本的拦截。
      for (let i = 0; i < 4; i++) {
        try {
          const galleryinfo = await fetchGalleryInfoById(pathInfo.gid);
          const files = galleryinfo.files || [];
          const imagePlan = await makeImagePlanFromFiles(files);

          const detail = {
            galleryinfo,
            files,
            imagePlan,
            galleryurl: (galleryinfo && typeof galleryinfo.galleryurl === 'string') ? galleryinfo.galleryurl : '',
            title: (galleryinfo && (galleryinfo.japanese_title || galleryinfo.title)) || document.title || 'Hitomi Gallery'
          };

          dataCache = detail;
          return detail;
        } catch (e) {
          debugLog('[Gallery Reader] hitomi fetch retry:', i + 1, e && e.message ? e.message : e);
          await new Promise((r) => setTimeout(r, 350));
        }
      }
      return null;
    })().finally(() => {
      dataPromise = null;
    });

    return dataPromise;
  }

  async function buildReaderData(startAt) {
    const path = getPathInfo();
    const detail = await resolveData();
    if (!path || !detail || !Array.isArray(detail.files) || detail.files.length === 0) {
      return null;
    }

    const imagelist = detail.files.map((f, idx) => {
      const plan = detail.imagePlan && detail.imagePlan[idx] ? detail.imagePlan[idx] : null;
      const url = normalizeUrl(plan && plan.primary ? plan.primary : '');
      const altUrls = (plan && Array.isArray(plan.candidates)) ? plan.candidates.filter((u) => u && u !== url) : [];
      return {
        n: String(idx + 1),
        url,
        altUrls
      };
    });

    const imageSizes = detail.files.map((f) => {
      const w = f && Number.isFinite(f.width) ? f.width : 0;
      const h = f && Number.isFinite(f.height) ? f.height : 0;
      const ratio = (w > 0 && h > 0) ? (w / h) : 1;
      return { width: w, height: h, ratio };
    });

    const pageCount = imagelist.length;
    const normalizedStart = (typeof startAt === 'number' && startAt >= 1 && startAt <= pageCount) ? startAt : undefined;

    let galleryDetailUrl = '';
    try {
      const rel = detail && typeof detail.galleryurl === 'string'
        ? detail.galleryurl
        : '';
      if (rel) {
        galleryDetailUrl = new URL(rel, window.location.origin).href;
      }
    } catch {}

    if (!galleryDetailUrl) {
      const p = window.location.pathname || '';
      if (/-(\d+)\.html$/i.test(p)) {
        galleryDetailUrl = `${window.location.origin}${p}`;
      }
    }

    if (galleryDetailUrl) {
      galleryDetailUrl = `${galleryDetailUrl}#1`;
    }

    return {
      imagelist,
      imageSizes,
      pagecount: pageCount,
      gid: path.gid,
      mpvkey: `hitomi_${path.gid}`,
      gallery_url: galleryDetailUrl || `${window.location.origin}/reader/${path.gid}.html`,
      title: detail.title || document.title || 'Hitomi Gallery',
      source: 'hitomi',
      startAt: normalizedStart
    };
  }

  let launchInFlight = false;
  async function launchReader(startAt) {
    if (launchInFlight) return;
    launchInFlight = true;
    try {
      const data = await buildReaderData(startAt);
      if (!data || !data.imagelist || data.imagelist.length === 0) {
        console.warn('[Gallery Reader] hitomi bootstrap failed: no gallery data');
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
            imgkey: ''
          };
        }
      };

      await ensureReaderContentScript();
      document.dispatchEvent(new CustomEvent('ehGalleryReaderReady', { detail: data }));
      debugLog('[Gallery Reader] hitomi reader event dispatched');
    } finally {
      launchInFlight = false;
    }
  }

  function bindNativeEntryPoints() {
    const info = getPathInfo();
    if (!info) return;

    const isReaderPage = !!info.isReaderPage;
    const startPage = (typeof info.startPage === 'number' && info.startPage >= 1) ? info.startPage : undefined;

    if (!isReaderPage) {
      const readBtn = document.getElementById('read-online-button');
      if (readBtn && readBtn.dataset.galleryReaderBound !== 'true') {
        readBtn.dataset.galleryReaderBound = 'true';
        readBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          launchReader(startPage).catch(() => {});
        }, true);
      }
    }
  }

  function interceptClicks() {
    const shouldBypass = (ev) => ev.ctrlKey || ev.shiftKey || ev.metaKey || ev.altKey || ev.button === 1;

    // 缩略图点击：通常是 /reader/{gid}.html#N
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || shouldBypass(e)) return;
      const a = e.target && e.target.closest ? e.target.closest('a[href*="/reader/"], #read-online-button') : null;
      if (!a) return;

      const href = a.getAttribute('href') || '';
      const m = href.match(/\/reader\/(\d+)\.html(?:#(\d+))?/i);

      const path = getPathInfo();
      const gid = path ? path.gid : null;
      if (!gid) return;
      if (m && parseInt(m[1], 10) !== gid) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      const pageNum = m && m[2] ? parseInt(m[2], 10) : ((path && path.startPage) || 1);
      launchReader(pageNum).catch(() => {});
    }, true);
  }

  function autoLaunchOnReaderPage() {
    const info = getPathInfo();
    if (!info || !info.isReaderPage) return;

    // reader 页默认自动进入现代阅读器；允许用户手动关闭后自行切换
    launchReader(info.startPage || 1).catch(() => {});
  }

  function boot() {
    if (!getPathInfo()) return;
    resolveData().catch(() => {});
    bindNativeEntryPoints();
    interceptClicks();
    autoLaunchOnReaderPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
