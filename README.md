# EH Modern Reader

现代化的 E-Hentai / ExHentai 阅读器扩展，支持 MPV 与 Gallery 双模式、智能节流、持久缓存与永久阅读进度。

![Version](https://img.shields.io/badge/version-2.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20(Chromium)-brightgreen)

## 核心特性

- 双模式：/mpv/ 自动接管；/g/ 右侧按钮启动（无需 300 Hath）
- 阅读体验：单页/横向连续，三区点击，预加载与延后请求取消
- 安全限速：3 并发 + 250ms 间隔 + 跳页滚动锁
- 持久缓存：
    - MPV 主图真实 URL 本地持久化缓存（默认 24 小时 TTL，含会话回退）
    - 返回画廊即时恢复已展开缩略图（会话级缓存，无需重新加载）
- 永久进度：每个画廊的阅读历史持久保存（扩展本地存储），重启浏览器仍保留

## 安装

Chrome/Edge（开发者模式）
1. 在 Releases 页面下载 ZIP 并解压
2. 打开 `chrome://extensions/` 或 `edge://extensions/`
3. 打开“开发者模式” → “加载已解压的扩展程序” → 选择本项目文件夹

详细见 `docs/INSTALL.md`。

## 使用

- MPV 模式：进入 `/mpv/` 页面自动启用
- Gallery 模式：在 `/g/` 页面点击右侧“EH Modern Reader”按钮；缩略图将一次性展开为单页，无需分页；点击任意缩略图进入阅读器并跳转到对应页

## 快捷键

- ←/→ 或 A/D/空格：翻页/横向滚动
- Home / End：跳首页/末页
- H / S：切换模式
- P：自动播放
- F11：全屏；Esc：关闭面板/退出

## 发布与下载

- 最新版本与变更说明见 GitHub Releases：`https://github.com/MeiYongAI/EH-Modern-Reader/releases`
- v2.3.0 要点：
    - MPV 主图真实 URL 持久化缓存（24h 过期）
    - 画廊展开结果会话缓存（返回即刻恢复）
    - 阅读进度永久保存（扩展本地）

## 风控与提示

- 避免频繁大幅跨页跳转，保持默认节流配置
- 若遇 “Excessive request rate”，暂停操作，稍后再试

## 项目结构（简）

```
EH-Modern-Reader/
├─ manifest.json
├─ content.js        # MPV 阅读器
├─ gallery.js        # 画廊增强与启动器
├─ style/            # 样式
├─ icons/            # 图标
├─ scripts/          # 构建/发布脚本
├─ README.md / CHANGELOG.md / LICENSE
└─ dist/             # 打包产物
```

## 开发与构建

- 打包：`scripts/build.ps1`
- 一键发布（需安装 GitHub CLI gh）：`scripts/create-release.ps1`

## 致谢

- 灵感来源与交互参考：JHenTai（`https://github.com/jiangtian616/JHenTai`）。感谢其对阅读体验与多端适配的优秀实践。

## 许可与免责声明

- 许可：MIT License
- 免责声明：仅用于学习与研究目的，遵守当地法律与站点规则

—

如果本项目对你有帮助，欢迎 Star ⭐

—

最后更新：2025-11-13
