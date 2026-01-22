# EH Modern Reader

现代化的 E-Hentai / ExHentai 阅读器扩展，支持 MPV 与 Gallery 双模式、智能节流、持久缓存与永久阅读进度。

![Version](https://img.shields.io/badge/version-2.3.7-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20(Chromium)-brightgreen)

## 核心特性

- 双模式：/mpv/ 自动接管；/g/ 右侧按钮启动（无需 300 Hath）
- 阅读体验：**三种阅读模式**（单页/横向连续/纵向连续），三区点击，预加载与延后请求取消
- 安全限速：3 并发 + 250ms 间隔 + 跳页滚动锁
- 持久缓存：
    - MPV 主图真实 URL 本地持久化缓存（默认 24 小时 TTL，含会话回退）
    - 返回画廊即时恢复已展开缩略图（会话级缓存，无需重新加载）
- 永久进度：每个画廊的阅读历史持久保存（扩展本地存储），重启浏览器仍保留

## 阅读模式

- **单页模式**：传统的一次一页，支持键盘翻页和缩放
- **单页竖向模式**（v2.3.6 新增）：使用上下方向键/滚轮翻页，适合竖屏设备
- **横向连续模式**：左右滚动浏览所有页面，支持自动滚动
- **纵向连续模式**（v2.3.6 新增）：上下滚动浏览所有页面，支持自动滚动，类似长图浏览体验
- 纵向连续模式支持在设置面板调整侧边边距（0-400px），适配不同屏宽

详细说明见 [docs/VERTICAL_MODE.md](docs/VERTICAL_MODE.md)。

## 安装

### 浏览器扩展版（推荐）

Chrome/Edge（开发者模式）
1. 在 Releases 页面下载 ZIP 并解压
2. 打开 `chrome://extensions/` 或 `edge://extensions/`
3. 打开"开发者模式" → "加载已解压的扩展程序" → 选择本项目文件夹

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
近期版本要点：
 - v2.3.7：自动滚动优化（帧率无关平滑滚动、节流防抖、模式切换保持页面位置）
 - v2.3.6：新增纵向连续阅读模式（上下滚动浏览）
 - v2.3.5：MPV 初始化性能优化 4-6 倍，轮询机制改进，CPU 占用降低 80%
 - v2.3.4：评论弹窗浮动"发评论"按钮（快速跳转与聚焦输入）
 - v2.3.3：评论"展开全部"不再跳出弹窗，拦截 ?hc=1 链接防止导航

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

最后更新：2026-1-21
