# Gallery Reader

![Version](https://img.shields.io/badge/version-2.5.7-blue)
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

#### v2.5.7 - 2026-06-08

- 修复 hitomi.la 阅读器内缩略图不加载的问题，改为使用原站官方小缩略图地址，不再请求完整大图生成缩略图。
- hitomi.la 原生 `/reader/{id}.html#page` 页面现在会在页面最早阶段被遮罩接管，避免进入 Gallery Reader 前闪现原站阅读器。
- 保留 hitomi.la 大图 AVIF/WebP/原图候选加载逻辑，同时让缩略图加载与大图加载分离，降低并发请求压力。
- README 重新整理为中英双语，只保留最新更新日志。

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

#### v2.5.7 - 2026-06-08

- Fixed hitomi.la thumbnails inside Gallery Reader by using the site's official small thumbnail URLs instead of full-size image requests.
- The native hitomi.la `/reader/{id}.html#page` page is now masked at the earliest page stage to avoid flashing the original reader before Gallery Reader takes over.
- Kept hitomi.la AVIF/WebP/original fallback logic for full images while separating thumbnail loading from full-image loading to reduce concurrent request pressure.
- Rebuilt the README as bilingual Chinese / English documentation with only the latest changelog entry.

## License

MIT License
