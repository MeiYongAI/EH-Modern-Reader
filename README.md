# EH Modern Reader

EH Modern Reader 是一个 Chrome / Edge 浏览器扩展，用于在 E-Hentai、ExHentai、nhentai 和 hitomi.la 上提供现代化阅读体验。

![Version](https://img.shields.io/badge/version-2.5.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20(Chromium)-brightgreen)

## 功能

- 支持 E-Hentai / ExHentai MPV 页面自动接管。
- 支持 E-Hentai / ExHentai Gallery 页面按钮启动和缩略图直达。
- 支持 nhentai.net、nhentai.xxx 和 hitomi.la。
- 支持横向单页、纵向单页、横向连续、纵向连续阅读模式。
- 支持阅读进度记忆、真实图片 URL 缓存、缩略图懒加载、预加载和自动翻页。
- Gallery / nhentai / Hitomi 页面默认只加载轻量入口脚本，启动阅读器时再注入核心脚本。

## 安装

1. 在 GitHub Releases 下载最新 ZIP。
2. 打开 `chrome://extensions/` 或 `edge://extensions/`。
3. 开启开发者模式。
4. 将 ZIP 拖入扩展页面，或解压后选择“加载已解压的扩展程序”。

## 使用

- MPV 页面：进入 `/mpv/` 后自动启用阅读器。
- Gallery 页面：点击页面右侧的 `EH Modern Reader`，或点击缩略图直达对应页。
- nhentai 页面：在 `/g/{id}/` 或 `/g/{id}/{page}/` 页面启动阅读器。
- hitomi 页面：在详情页或 `/reader/{id}.html` 页面启动阅读器。

## 快捷键

- `←` / `→` / `A` / `D` / `Space`：翻页或连续模式滚动。
- `Home` / `End`：跳到首页或末页。
- `H` / `S`：切换阅读模式。
- `P`：自动翻页或自动滚动。
- `F11`：全屏。
- `Esc`：退出全屏或关闭面板。

## 项目结构

```text
EH-Modern-Reader/
├─ manifest.json
├─ content.js
├─ gallery.js
├─ nhentai.js
├─ hitomi.js
├─ background.js
├─ popup.html / popup.js
├─ options.html / options.js
├─ welcome.html
├─ style/
├─ icons/
├─ scripts/
├─ dist/
└─ README.md
```

## 构建

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

构建产物会生成到 `dist/eh-modern-reader-v{version}.zip`。

## 最新更新

### v2.5.3 - 2026-06-08

- 精简仓库文件，只保留根目录 `README.md` 作为 Markdown 文档。
- `dist` 目录只保留最新发布包，移除历史包和测试解包目录。
- 优化阅读器设置面板布局，让分组、滚动区域和移动端显示更清晰。
- 更新构建和发布脚本，适配精简后的文档结构。

## License

MIT License
