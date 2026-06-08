# Gallery Reader

![Version](https://img.shields.io/badge/version-2.5.8-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20(Chromium)-brightgreen)

Gallery Reader is a Chrome / Edge extension that provides a multi-site reading experience for E-Hentai, ExHentai, nhentai, and hitomi.la.

## 中文

### 功能

- 支持 E-Hentai / ExHentai MPV 页面自动接管。
- 支持 E-Hentai / ExHentai Gallery 页面按钮启动和缩略图直达。
- 支持 nhentai.net、nhentai.xxx 和 hitomi.la。
- 支持横向单页、纵向单页、横向连续、纵向连续阅读模式。
- 支持真实图片加载进度、阅读进度记忆、智能预加载、缩略图懒加载和自动翻页。
- 根据浏览器或系统语言自动切换中文 / 英文界面。

### 安装与调试

1. 打开 `chrome://extensions/` 或 `edge://extensions/`。
2. 开启“开发者模式”。
3. 选择“加载已解压的扩展程序”，加载本仓库目录。
4. 修改代码后，在扩展管理页点击此扩展卡片上的刷新按钮。
5. 如需调试日志，打开扩展设置页并启用 Debug mode。

### 构建

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

构建产物会生成到 `dist/gallery-reader-v{version}.zip`。

### 最新更新

#### v2.5.8 - 2026-06-08

- 修复 hitomi.la 最新 `gg.js` 路由变化导致的主图 CDN 分流错误。
- hitomi.la 主图只使用当前官方 AVIF/WebP 候选，移除旧 JPG 大图 fallback，减少连续失败日志。
- 降低 hitomi.la 连续阅读模式的原图预加载距离，并串行节流主图加载，避免一次性触发大量请求。
- 缩略图优先使用 hitomi.la 官方小图地址，并在 `atn` / `btn` 小图域名之间自动 fallback。

## English

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

#### v2.5.8 - 2026-06-08

- Fixed hitomi.la full-image CDN routing after the latest `gg.js` route change.
- Limited hitomi.la full-image candidates to the current official AVIF/WebP URLs and removed noisy legacy JPG fallbacks.
- Reduced eager full-image loading in hitomi.la continuous reading modes and throttled full-image loads in sequence.
- Kept thumbnails on official hitomi.la small-thumbnail URLs with automatic `atn` / `btn` fallback.

## License

MIT License
