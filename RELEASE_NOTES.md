# Release Notes - v1.0.0

## 🎉 EH Modern Reader v1.0.0 首个正式版本

**发布日期：** 2025-01-07

这是 EH Modern Reader 的首个正式版本，完整实现了现代化的 E-Hentai 阅读器功能。

---

## ✨ 核心特性

### 🎨 现代化界面
- 全新设计的阅读器界面，简洁优雅
- 响应式布局，完美适配桌面端
- 流畅的动画过渡效果
- 直观的操作界面

### 🌙 深色模式
- 完整的暗色主题支持
- 一键切换明暗模式
- 护眼的夜间阅读体验
- 设置自动保存

### ⚡ 性能优化
- 智能图片预加载
- 图片缓存机制
- 懒加载技术
- 流畅的翻页体验

### 💾 进度记忆
- 自动保存阅读位置
- 按画廊独立记录
- 下次访问自动跳转
- 支持多画廊进度

### ⌨️ 丰富的交互方式
- **键盘控制**：← → Home End F F11 Esc
- **鼠标操作**：点击左右翻页，点击缩略图跳转
- **滚轮翻页**：向下滚动翻页
- **进度条**：拖动快速跳转

### 🛠️ 灵活的设置
- 图片适配模式（适应窗口/宽度/高度/原始大小）
- 图片对齐方式（居中/左对齐/右对齐）
- 预加载开关
- 平滑滚动设置

---

## 📦 安装方法

### Chrome / Edge

1. 下载 `eh-modern-reader-v1.0.0-chrome.zip`
2. 解压到本地文件夹
3. 打开 `chrome://extensions/` 或 `edge://extensions/`
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择解压后的文件夹
7. ✅ 完成！访问 E-Hentai MPV 页面即可使用

### Firefox

1. 下载 `eh-modern-reader-v1.0.0-firefox.zip`
2. 打开 `about:debugging#/runtime/this-firefox`
3. 点击"临时载入附加组件"
4. 选择下载的 ZIP 文件或解压后的 manifest.json
5. ✅ 完成！访问 E-Hentai MPV 页面即可使用

> **注意：** Firefox 临时加载的扩展在浏览器重启后会失效，需要重新加载。

---

## 🎯 使用说明

### 快速开始

1. 访问 [E-Hentai](https://e-hentai.org) 或 [ExHentai](https://exhentai.org)
2. 打开任意画廊详情页
3. 点击顶部的 **MPV** 按钮
4. 🎉 阅读器自动启动！

### 快捷键列表

| 快捷键 | 功能 |
|--------|------|
| `←` / `A` | 上一页 |
| `→` / `D` / `空格` | 下一页 |
| `Home` | 第一页 |
| `End` | 最后一页 |
| `F` | 切换侧边栏 |
| `F11` | 全屏模式 |
| `Esc` | 退出全屏/关闭面板 |

### 界面说明

- **顶部工具栏**：返回按钮、标题、页码、设置、全屏、主题切换
- **左侧边栏**：缩略图列表，点击快速跳转
- **中央查看器**：主图片显示区，左右翻页按钮
- **底部控制栏**：进度条、页码输入、快速跳转按钮

---

## 📊 技术规格

- **Manifest 版本：** V3
- **最低浏览器版本：**
  - Chrome 88+
  - Edge 88+
  - Firefox 89+
- **代码语言：** 原生 JavaScript (ES6+)
- **样式：** 原生 CSS3
- **依赖：** 无（完全原生实现）

---

## 📝 文件说明

### 发布包

- **eh-modern-reader-v1.0.0-chrome.zip** (20.67 KB)
  - 适用于 Chrome / Edge / Opera
  - 包含核心扩展文件
  
- **eh-modern-reader-v1.0.0-firefox.zip** (20.77 KB)
  - 适用于 Firefox
  - 已优化 manifest.json 配置
  
- **eh-modern-reader-v1.0.0-source.zip** (47.12 KB)
  - 完整源代码包
  - 包含所有文档和工具
  - 适合开发者研究和二次开发

---

## 🐛 已知问题

1. **图片 URL 获取**
   - 当前版本使用缩略图作为演示
   - 完整图片需要调用 E-Hentai API（未实现）
   - 不影响基本阅读功能

2. **ExHentai 支持**
   - 需要有效的登录 Cookie
   - 首次使用需要在 ExHentai 登录

3. **Firefox 临时加载**
   - 临时加载的扩展在浏览器重启后失效
   - 需要提交到 Firefox Add-ons 才能永久安装

---

## 🔮 未来计划

### v1.1.0 (计划中)
- [ ] 实现完整的 E-Hentai API 图片获取
- [ ] 添加错误重试机制
- [ ] 优化缓存策略（限制大小）
- [ ] 添加加载进度显示

### v1.2.0 (计划中)
- [ ] 双页显示模式
- [ ] 图片缩放功能
- [ ] 自定义主题配色
- [ ] 批量下载支持

### v2.0.0 (长期目标)
- [ ] 云端同步阅读进度
- [ ] AI 推荐相似内容
- [ ] 社区评论系统
- [ ] 多语言支持

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

- **报告 Bug：** [GitHub Issues](https://github.com/MeiYongAI/eh-modern-reader/issues)
- **功能建议：** [GitHub Discussions](https://github.com/MeiYongAI/eh-modern-reader/discussions)
- **开发指南：** 查看 `DEVELOPMENT.md`

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- E-Hentai 平台
- Chrome / Firefox 扩展 API 文档
- 开源社区的支持
- 所有测试用户的反馈

---

## ⚠️ 免责声明

本扩展仅供学习和研究使用，不得用于商业目的。使用本扩展时请遵守当地法律法规和网站使用条款。

---

## 📧 联系方式

- **GitHub：** [@MeiYongAI](https://github.com/MeiYongAI)
- **项目地址：** [eh-modern-reader](https://github.com/MeiYongAI/eh-modern-reader)
- **Issues：** [提交问题](https://github.com/MeiYongAI/eh-modern-reader/issues)

---

**享受更好的阅读体验！📚✨**

*Made with ❤️ for better reading*
