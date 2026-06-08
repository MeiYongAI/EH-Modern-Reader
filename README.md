# Gallery Reader

![Version](https://img.shields.io/badge/version-2.5.5-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20(Chromium)-brightgreen)

Gallery Reader 是一个 Chrome / Edge 浏览器扩展，为 E-Hentai、ExHentai、nhentai 和 hitomi.la 提供多站点阅读体验。

## 中文

### 功能

- 支持 E-Hentai / ExHentai MPV 页面自动接管。
- 支持 E-Hentai / ExHentai Gallery 页面按钮启动和缩略图直达。
- 支持 nhentai.net、nhentai.xxx 和 hitomi.la。
- 支持横向单页、纵向单页、横向连续、纵向连续阅读模式。
- 支持真实图片加载进度、阅读进度记忆、智能预加载、缩略图懒加载和自动翻页。
- 根据浏览器/系统语言自动切换中文或英文界面。

### 安装与调试

1. 打开 `chrome://extensions/` 或 `edge://extensions/`。
2. 开启“开发者模式”。
3. 选择“加载已解压的扩展程序”，加载本仓库目录。
4. 修改代码后，在扩展管理页点击此扩展卡片上的刷新按钮。
5. 如果需要调试日志，打开扩展设置页并启用 Debug mode。

### 构建

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

构建产物会生成到 `dist/gallery-reader-v{version}.zip`。

### 最新更新

#### v2.5.5 - 2026-06-08

- 扩展短名改为 Gallery Reader。
- hitomi.la 改为接管原生 Read Online 和 `/reader/{id}.html` 页面，不再额外添加第二个阅读入口。
- hitomi.la 的 `gg.js` 与 `galleries/{id}.js` 改由后台脚本代取，使用扩展 host permissions 避免页面 CORS 限制。
- 修复当前 hitomi.la 图片 CDN 路由，包含 imageset 画廊的 AVIF/WebP/原图候选地址。
- 图片加载动画继续跟随真实网络进度；无法读取响应流时降级为原生图片加载，不播放假循环动画。

## English

Gallery Reader is a Chrome / Edge extension that provides a multi-site reading experience for E-Hentai, ExHentai, nhentai, and hitomi.la.

### Features

- Automatically takes over E-Hentai / ExHentai MPV pages.
- Adds launch buttons and thumbnail deep-link handling on E-Hentai / ExHentai gallery pages.
- Supports nhentai.net, nhentai.xxx, and hitomi.la.
- Supports single horizontal, single vertical, continuous horizontal, and continuous vertical reading modes.
- Includes real image loading progress, reading progress memory, smart preloading, lazy thumbnails, and auto paging.
- Switches UI language automatically between Chinese and English based on browser/system language.

### Install and Debug

1. Open `chrome://extensions/` or `edge://extensions/`.
2. Enable Developer mode.
3. Click "Load unpacked" and select this repository folder.
4. After changing code, click the reload button on this extension card.
5. For logs, open the extension options page and enable Debug mode.

### Build

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

The release package is generated at `dist/gallery-reader-v{version}.zip`.

### Latest Update

#### v2.5.5 - 2026-06-08

- Shortened the extension name to Gallery Reader.
- hitomi.la now takes over the native Read Online entry and `/reader/{id}.html` pages instead of adding a second reader entry.
- hitomi.la `gg.js` and `galleries/{id}.js` are fetched through the background service worker with extension host permissions to avoid page CORS limits.
- Fixed current hitomi.la image CDN routing, including AVIF/WebP/original candidates for imageset galleries.
- Image loading animation still follows real network progress; when a readable stream is unavailable, it falls back to native image loading without a fake loop.

## License

MIT License
