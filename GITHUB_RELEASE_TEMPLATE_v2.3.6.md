# GitHub Release 发布模板 - v2.3.6

复制以下内容到 GitHub Release 页面：

---

# EH Modern Reader v2.3.6

## 🎯 版本亮点

本版本新增**纵向连续阅读模式**，实现垂直滚动浏览所有页面的长图体验。同时进行了大量 UX 优化和 bug 修复。

## ✨ 新增功能

### 纵向连续阅读模式（Continuous Vertical）
- 📜 上下滚动浏览所有页面，类似长图阅读
- ⚡ 智能懒加载，节省带宽
- 🎯 完整功能：三分区点击、反向阅读、自动进度保存、缩略图同步、骨架屏动画

### 单页竖向模式（Single Page Vertical）
- 上下方向键/滚轮翻页
- 适合竖屏设备和竖向漫画

### 纵向侧边留白可调
- 设置面板新增侧边留白滑块（0-1000px）
- 实时预览，自动保存

## 🔧 改进和修复

### 修复的问题
- ✅ **阅读模式刷新后跳转到第一张图** - 现在正确恢复到上次阅读页
- ✅ **侧边留白滑块在 400px 以上不响应** - 已更新验证条件至 1000px  
- ✅ **侧边留白调整时页面跳动** - 添加滚动位置重定位逻辑

### 用户体验改进
- 设置面板标签移除 emoji，更简洁专业
- 三种模式间的切换更加流畅
- 所有设置自动持久化保存
- 快捷键系统完整支持新增模式

## 🔄 功能恢复

v2.3.6 恢复了 Gallery 页面的核心功能，保持 E-Hentai 原生体验：
- EH Modern Reader 启动按钮
- 缩略图点击启动阅读器
- 评论区正常显示（原生方式）
- 缩略图分页导航

## 📊 技术细节

| 项目 | 说明 |
|------|------|
| **主要修改** | `content.js` (+350 行), `gallery.js` (~20 行) |
| **新增文件** | `RELEASE_NOTES_FULL_v2.3.6.md` 完整说明 |
| **版本号** | 2.3.5 → 2.3.6 |
| **发布日期** | 2026-01-21 |

## 📥 安装

1. 下载 **eh-modern-reader-v2.3.4.zip**
2. 解压后在 `chrome://extensions/` 加载已解压的扩展
3. 访问 E-Hentai/ExHentai 开始使用

## 📚 完整文档

查看 [RELEASE_NOTES_FULL_v2.3.6.md](RELEASE_NOTES_FULL_v2.3.6.md) 获取：
- 详细的新增功能说明
- 技术实现细节
- 修复的问题详解
- 兼容性信息
- 常见问题解答

## 🌍 浏览器兼容性

- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

## 🐛 反馈

遇到问题？[创建 Issue](https://github.com/MeiYongAI/EH-Modern-Reader/issues)

## 📄 许可证

MIT License

---

**快速链接**
- 📖 [文档](docs/)
- 🔧 [安装指南](docs/INSTALL.md)
- 📜 [更新日志](CHANGELOG.md)
- ⭐ [完整发布说明](RELEASE_NOTES_FULL_v2.3.6.md)
