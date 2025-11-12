# EH Modern Reader

现代化的 E-Hentai / ExHentai 阅读器扩展，支持 MPV 与 Gallery 双模式、智能节流、进度记忆、现代 UI。

![Version](https://img.shields.io/badge/version-2.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20(Chromium)-brightgreen)

## 核心特性

- 双模式：/mpv/ 自动接管；/g/ 页面右侧按钮启动（无需 300 Hath）
- 阅读体验：单页/横向连续，缩略图占位与批量懒加载，进度自动保存与恢复
- 安全限速：3 并发 + 250ms 间隔 + 跳页滚动锁，避免洪水请求
- 性能优化：预加载、取消滞后请求、提前 600px 触发、URL 实体缓存与 preconnect
- 画廊增强：自动展开所有缩略图；评论预览；评论弹窗（仅在弹窗内点击分数显示/收起投票详情）

## 安装

Chrome/Edge（开发者模式）
1. 在 Releases 页面下载 ZIP 并解压
2. 打开 chrome://extensions/ 或 edge://extensions/
3. 打开“开发者模式” → “加载已解压的扩展程序” → 选择本项目文件夹

Firefox（临时加载）
1. 解压 ZIP → 打开 about:debugging#/runtime/this-firefox
2. 选择“临时载入附加组件”，指向 manifest.json

详细见 docs/INSTALL.md。

## 使用

- MPV 模式：进入 /mpv/ 页面自动启用
- Gallery 模式：在 /g/ 页面点击右侧“EH Modern Reader”按钮；缩略图会自动展开为单页，无分页；点击任意缩略图进入我们的阅读器，并跳转到对应页。
- 评论：缩略图上方显示最新评论预览；点击“展开全部评论”打开弹窗。弹窗内点击“分数+N”切换显示/隐藏投票详情；所有交互只在弹窗内生效。

## 快捷键

- ←/→ 或 A/D/空格：翻页/横向滚动
- Home / End：跳首页/末页
- H 或 S：切换模式
- P：自动播放
- F11：全屏；Esc：关闭面板/退出

## 风控建议

- 避免频繁大幅跨页跳转；尽量保持默认节流配置
- 如遇“Excessive request rate”，暂停操作稍后再试

## 目录结构（简）

```
EH-Modern-Reader/
├─ manifest.json
├─ content.js        # MPV 阅读器
├─ gallery.js        # 画廊增强与启动器
├─ style/            # 样式
├─ icons/            # 图标
├─ scripts/          # 构建脚本
├─ docs/             # 文档
├─ README.md / CHANGELOG.md / LICENSE
└─ dist/             # 打包产物
```

## 变更摘要

- v2.1.0
    - 画廊：自动展开缩略图（静默，无进度条）；缩略图占位样式
    - 评论：预览置顶；弹窗内点击分数开关投票详情；锁定滚动与事件隔离
    - MPV：真实图片 URL 缓存 + preconnect；恢复上次页码
    - 若干 UI/稳定性修复

完整记录见 CHANGELOG.md。

## 开发与构建

使用 PowerShell 运行脚本：

- 构建打包：scripts/build.ps1

## 许可

MIT License

---
如果本项目对你有帮助，欢迎 Star ⭐

---

## 🎯 适用场景

✅ **自动启用**
- MPV 模式: `https://e-hentai.org/mpv/*` 或 `https://exhentai.org/mpv/*`
- Gallery 模式: `https://e-hentai.org/g/*` 或 `https://exhentai.org/g/*` (点击启动按钮)

❌ **不影响其他页面**
- 画廊列表页
- 其他站点

---

## ⚠️ 重要提示

**Gallery 模式风控说明**：
- 使用 Gallery 模式时，扩展会自动限制请求频率（3并发 + 250ms间隔）
- 大幅跳页时会锁定观察器2秒，手动加载可视区域缩略图（最多10张）
- 如仍遇到"Excessive request rate"错误，请等待解封后使用，或降低使用频率

---

## 🐛 已知限制

1. **Gallery 模式需手动启动** - 在画廊页面点击"EH Modern Reader"按钮
2. **首次加载较慢** - 需要解析 HTML 获取图片 URL
3. **网络环境敏感** - 不稳定网络可能导致加载缓慢

---

## 🔮 路线图

### v1.3.0 ✅
- [x] Gallery 模式支持
- [x] 请求节流与风控防护
- [x] 横向模式间距优化
- [x] 跳页缩略图批量加载

### 计划中 🚧
- [ ] 配置化节流参数（保守/标准/快速模式）
- [ ] 失败重试机制与错误统计面板
- [ ] 触摸设备手势支持
- [ ] 历史记录 UI

---

## 📄 开源协议

MIT License - 自由使用、修改和分发

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

**参与方式**
- 🐛 报告 Bug - 请附上浏览器版本、操作步骤、控制台日志
- 💡 功能建议 - 描述使用场景与期望行为
- 🔧 提交代码 - 遵循既有代码风格，附上测试说明

## ⚠️ 免责声明

本扩展仅用于学习和研究目的，不得用于商业用途。使用本扩展时请遵守当地法律法规及 E-Hentai 站点规则。

---

**享受更流畅的阅读体验！📚✨**

*最后更新：2025-11-10*
