# Modern Gallery Reader

![Version](https://img.shields.io/badge/version-2.5.4-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20(Chromium)-brightgreen)

Modern Gallery Reader 是一个 Chrome / Edge 浏览器扩展，为 E-Hentai、ExHentai、nhentai 和 hitomi.la 提供现代化多站点阅读体验。

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

构建产物会生成到 `dist/modern-gallery-reader-v{version}.zip`。

### 最新更新

#### v2.5.4 - 2026-06-08

- 扩展更名为 Modern Gallery Reader，并加入 Chrome i18n 中英文界面。
- 修复 hitomi.la 图片 CDN 子域选择逻辑，补充候选地址回退和权限匹配。
- 图片加载动画改为真实网络下载进度；可读取响应流时显示实际百分比，不再播放假循环动画。
- 精简 popup、options 和 welcome 页面，设置面板文案接入中英双语。
- README 改为中英双语，并只保留最新更新日志。

## English

Modern Gallery Reader is a Chrome / Edge extension that provides a modern multi-site reading experience for E-Hentai, ExHentai, nhentai, and hitomi.la.

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

The release package is generated at `dist/modern-gallery-reader-v{version}.zip`.

### Latest Update

#### v2.5.4 - 2026-06-08

- Renamed the extension to Modern Gallery Reader and added Chrome i18n for Chinese/English UI.
- Fixed hitomi.la image CDN subdomain routing, with candidate URL fallback and expanded permissions.
- Changed image loading animation to real network download progress; readable response streams now show actual percentage instead of a fake loop.
- Simplified popup, options, and welcome pages; settings panel text now uses bilingual labels.
- Reworked README as bilingual documentation with only the latest changelog entry.

## License

MIT License
