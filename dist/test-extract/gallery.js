/**
 * Gallery Injection Script - 画廊页面注入脚本（无 MPV 权限回退）
 * 目标：
 * - 若账号拥有原生 MPV：不干预，沿用 1.2.0 的 MPV 注入
 * - 若账号没有 MPV：在画廊页右侧功能区添加一个“Multi-Page Viewer”入口，
 *   直接在当前页注入我们自带的 Modern Reader，实现与 v1.2.0 接近的体验
 */
(function () {
	'use strict';

	// 仅在画廊详情页工作 /g/{gid}/{token}/
	if (!/^\/g\/\d+\/[a-f0-9]+\//i.test(location.pathname)) return;

	// 防重复
	if (window.__ehGalleryInjected) return;
	window.__ehGalleryInjected = true;

	const log = (...args) => console.log('[EH Modern Reader][gallery]', ...args);

	function hasNativeMPV() {
		// 右侧功能区通常有“Multi-Page Viewer”链接（解锁 300 Hath 才显示）
		const candidates = Array.from(document.querySelectorAll('#gd5 a, .gm #gd5 a'));
		return candidates.some(a => /Multi-Page Viewer/i.test(a.textContent || ''));
	}

	function extractBasicInfo() {
		const m = location.pathname.match(/\/g\/(\d+)\/([a-f0-9]+)\//i);
		const gid = m ? m[1] : '';
		const token = m ? m[2] : '';
		const title = (document.querySelector('#gn, .gm #gn')?.textContent || document.title).trim();
		// gdd 第 6 行一般是 Page 数
		const pagesText = document.querySelector('#gdd tr:nth-child(6) .gdt2, .gm #gdd tr:nth-child(6) .gdt2')?.textContent || '';
		const pagecount = parseInt((pagesText.match(/(\d+)\s+pages?/i) || [0, 0])[1]) || 0;
		return { gid, token, title, pagecount, gallery_url: location.href };
	}

		function collectThumbAnchors(root = document) {
			// 1. 精确 /s/ 链接
			let nodes = Array.from(root.querySelectorAll('#gdt a[href*="/s/"], .gm #gdt a[href*="/s/"]'));
			if (nodes.length === 0) nodes = Array.from(root.querySelectorAll('#gdt a, .gm #gdt a'));
			// 2. 只保留符合 token/gid-page 的链接
			const filtered = nodes.filter(a => /\/s\//i.test(a.href) && /\/(\d+)-(\d+)(?:[?#].*)?$/i.test(a.href));
			console.log('[EH Modern Reader][gallery] collectThumbAnchors raw=', nodes.length, 'filtered=', filtered.length);
			return filtered;
		}

	function parsePageLink(a) {
		// 典型格式: /s/{token}/{gid}-{page}
		const href = a?.href || '';
		// 允许结尾带 query/hash
		const m = href.match(/\/s\/([a-f0-9]+)\/(\d+)-(\d+)(?:[?#].*)?$/i);
		if (!m) return null;
		const img = a.querySelector('img');
		return {
			page: parseInt(m[3], 10),
			pageUrl: href,
			pageToken: m[1],
			gid: m[2],
			thumb: img ? img.src : ''
		};
	}

	async function fetchAdditionalThumbs(info, fromPageIdx /* 0-based */) {
		const out = [];
		const homeAnchors = collectThumbAnchors();
		const perFirst = homeAnchors.length || 0; // 当前页缩略图数量
		if (perFirst === 0) console.warn('[EH Modern Reader][gallery] 首页未找到缩略图 anchors, url=', info.gallery_url);
		const perPage = perFirst > 0 ? perFirst : 40; // 估一个保守值
		const totalPages = Math.ceil((info.pagecount || 0) / Math.max(1, perPage));
		for (let p = fromPageIdx; p < totalPages; p++) {
			try {
			const url = `${info.gallery_url.replace(/\/$/, '')}?p=${p}`;
			// 带上 cookie，避免匿名页导致结构不同
			const res = await fetch(url, { credentials: 'include' });
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const html = await res.text();
				const doc = new DOMParser().parseFromString(html, 'text/html');
				collectThumbAnchors(doc).forEach(a => {
					const item = parsePageLink(a);
					if (item) out.push(item);
				});
				await new Promise(r => setTimeout(r, 300)); // 轻量节流
			} catch (e) {
				console.warn('[EH Modern Reader] 获取缩略图分页失败', p + 1, e);
			}
		}
		return out;
	}

	async function buildImageList(info) {
			let anchors = collectThumbAnchors();
			if (anchors.length === 0) console.warn('[EH Modern Reader][gallery] 初始 anchors=0, 尝试兜底查询');
			// 兜底：全局再搜一次 /s/ 链接
			if (anchors.length === 0) {
				anchors = Array.from(document.querySelectorAll(`a[href*="/s/"][href*="/${info.gid}-"]`));
			}
			// 过滤重复 DOM 节点（某些布局可能含脚本克隆）
			const seenHref = new Set();
			anchors = anchors.filter(a => {
				const h = a.href;
				if (!h || seenHref.has(h)) return false;
				seenHref.add(h);
				return true;
			});
		const first = anchors.map(a => {
			const parsed = parsePageLink(a);
			if (!parsed) console.warn('[EH Modern Reader][gallery] parsePageLink 失败 href=', a.href);
			return parsed;
		}).filter(Boolean);
		if (first.length === 0) console.warn('[EH Modern Reader][gallery] 解析后无有效缩略图 anchorsLen=', anchors.length);
		let links = first;
		if ((info.pagecount || 0) > first.length) {
			const extra = await fetchAdditionalThumbs(info, 1); // 从第 2 页开始
			if (extra.length === 0) console.warn('[EH Modern Reader][gallery] 分页抓取没有新增缩略图');
			links = [...first, ...extra];
		}
		// 去重 + 排序
		const map = new Map();
		links.forEach(it => { map.set(it.page, it); });
		const ordered = Array.from(map.values()).sort((a, b) => a.page - b.page);
		// 转换为与 MPV 兼容的 imagelist 结构
		const imagelist = ordered.map(it => ({ k: it.pageToken, n: `page_${it.page}`, t: it.thumb, page: it.page, pageUrl: it.pageUrl }));
		console.log('[EH Modern Reader][gallery] imagelist 构建完成 count=', imagelist.length);
		return imagelist;
	}

	function injectReader(readerData) {
		// 提供给 content.js 的早期捕获数据
		window.__ehCaptured = {
			imagelist: readerData.imagelist,
			gid: readerData.gid,
			mpvkey: null, // 无原生 mpvkey
			pagecount: readerData.pagecount,
			gallery_url: readerData.gallery_url,
			title: readerData.title,
			fromGallery: true
		};

		// 若已经存在我们的阅读器根节点，避免重复注入
		if (document.getElementById('eh-modern-reader-root')) {
			log('检测到已在阅读器中，忽略重复注入');
			return;
		}

		// 清理明显的缩略图容器，避免视觉干扰（非必须）
		try {
			const gdt = document.getElementById('gdt');
			if (gdt) gdt.innerHTML = '';
		} catch (e) {
			console.warn('[EH Modern Reader][gallery] 清理缩略图失败:', e);
		}

		// 动态加载 content.js，让其接管页面
		const s = document.createElement('script');
		s.src = chrome.runtime.getURL('content.js');
		s.onload = () => log('content.js loaded');
		s.onerror = () => alert('加载阅读器失败，请刷新后重试');
		(document.head || document.documentElement).appendChild(s);
	}

	async function launchFallback() {
		const info = extractBasicInfo();
		log('gallery info', info);

		const overlay = document.createElement('div');
		overlay.id = 'eh-loading-overlay';
		overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999999;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px';
		overlay.innerHTML = '<div>正在收集图片列表…<div style="margin-top:8px;color:#aaa;font-size:13px">EH Modern Reader v1.3.0</div></div>';
		document.body.appendChild(overlay);

		try {
			  const imagelist = await buildImageList(info);
			  console.log('[EH Modern Reader][gallery] buildImageList 返回', imagelist.length);
			  if (!imagelist.length) throw new Error('无法获取图片列表');
			  overlay.remove();
			  console.log('[EH Modern Reader][gallery] 准备注入 content.js');
			  injectReader({ ...info, imagelist });
		} catch (e) {
			overlay.remove();
			alert('启动失败：' + (e?.message || e));
		}
	}

	function insertButton() {
		// 找到右侧按钮区域 #gd5
		const panel = document.querySelector('#gd5, .gm #gd5');
		if (!panel) return;

		if (hasNativeMPV()) {
			log('原生 MPV 可用，保持默认行为');
			return; // 交给原生 MPV + 我们在 /mpv/ 的注入
		}

		if (document.getElementById('eh-mpv-button')) return; // 已插入

		const p = document.createElement('p');
		p.className = 'g2 gsp';
		const icon = document.createElement('img');
		icon.src = 'https://ehgt.org/g/mr.gif';
		icon.style.marginRight = '4px';
		const a = document.createElement('a');
		a.href = '#';
		a.id = 'eh-mpv-button';
		a.textContent = 'Multi-Page Viewer';
		a.title = '使用 EH Modern Reader 打开（无需 Hath 解锁）';
		a.addEventListener('click', e => { e.preventDefault(); launchFallback(); });
		p.append(icon, document.createTextNode(' '), a);

		// 插到 Report Gallery 段落后面
		const report = Array.from(panel.querySelectorAll('p a')).find(x => /Report Gallery/i.test(x.textContent || ''));
		if (report?.parentElement) report.parentElement.insertAdjacentElement('afterend', p);
		else panel.insertBefore(p, panel.firstChild);
		log('已插入 Fallback MPV 按钮');
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', insertButton);
	else insertButton();
})();

