# 🎉 EH Modern Reader v2.0.0 - 正式发行版

**发布日期：** 2025-11-10

首个正式版本，完整支持 Gallery 模式、智能防封禁、项目规范化。

---

## ✨ 核心特性

### 🚀 双模式支持
- **MPV 模式** - 访问 `/mpv/` 自动启动
- **Gallery 模式** - 画廊页 `/g/` 手动启动，无需 300 Hath

### 🛡️ 智能防封禁
- 3 并发 + 250ms 间隔自动节流
- 2 秒滚动锁防洪水请求
- 批量加载（最多 10 张/次）
- ✅ 实测稳定无封禁

### 🎨 阅读体验
- 单页翻页 / 横向连续模式
- 智能预加载 + 进度记忆
- 完美缩略图居中对齐
- 深色/浅色主题自适应

### ⌨️ 快捷键
`← →` 翻页 | `Home/End` 首末页 | `H/S` 切换模式 | `P` 自动播放 | `F11` 全屏

---

## 📦 安装

### Chrome / Edge
1. 下载 `eh-modern-reader-v2.0.0.zip`
2. 解压到本地
3. 打开 `chrome://extensions/`
4. 启用"开发者模式"
5. "加载已解压的扩展程序"

### Firefox
1. 下载 ZIP 并解压
2. 打开 `about:debugging#/runtime/this-firefox`
3. "临时载入附加组件" → 选择 `manifest.json`

---

## 🎯 使用

- **MPV 模式**: 访问 `/mpv/` 自动启动
- **Gallery 模式**: 访问 `/g/` → 点击"EH Modern Reader"按钮

---

## ⚠️ 注意事项

**Gallery 模式已内置防封禁机制，正常使用安全。**

避免：
- ❌ 频繁大幅跳页（1→100→200→50）
- ❌ 多标签页同时使用

如遇临时限速，等待几分钟即可自动解封。

---

## 📚 文档

- [完整更新日志](https://github.com/MeiYongAI/EH-Modern-Reader/blob/main/CHANGELOG.md)
- [安装指南](https://github.com/MeiYongAI/EH-Modern-Reader/blob/main/docs/INSTALL.md)
- [故障排除](https://github.com/MeiYongAI/EH-Modern-Reader/blob/main/docs/TROUBLESHOOTING.md)

---

**享受更流畅的阅读体验！** 📚✨
