# Release Notes

## 🎉 EH Modern Reader v1.2.0 - 完美居中 & 稳定增强

**发布日期：** 2025-01-09

这是 EH Modern Reader 的 1.2.0 正式版本，带来缩略图系统重构、三区点击导航、强化的初始化稳定性等重大更新。

---

## ✨ 重点新特性

### 🖼️ 缩略图系统全面重构
采用独立真实图片 Canvas 渲染，彻底解决顶部空白问题，实现完美居中。

**技术亮点**
- **固定占位容器** - 100×142 固定尺寸，防止布局跳动
- **雪碧图快速预览** - 利用站点原始图作为即时背景，零延迟
- **真实图片缩略图** - 独立请求每页图片，Canvas contain 缩放 + 双向居中
- **智能懒加载** - IntersectionObserver rootMargin 600px，提前触发

**用户价值**
- 缩略图完全垂直水平居中，视觉更舒适
- 跳转后位置稳定，无跳动
- 首屏即刻展示预览，无白屏等待

### 🖱️ 三区点击导航
全新的点击区域划分，操作更直观。

**交互设计**
- **左侧 1/3** - 向左翻页
- **中间 1/3** - 切换顶栏显示/隐藏
- **右侧 1/3** - 向右翻页

**适用场景**
- 所有模式（单页 / 横向连续）
- 覆盖整个视图区域
- 移除原有的小圆翻页按钮

### 🛡️ 初始化稳定性增强
三层兜底机制，彻底解决"无法加载图片列表"问题。

**解决方案**
1. **早期脚本拦截** - document_start 阶段捕获变量
2. **延迟重试** - 等待时间从 3 秒延长到 6 秒
3. **HTTP 回退** - 直接抓取页面 HTML 并解析 `imagelist`

**效果**
- 极端情况下也能成功初始化
- 减少用户刷新页面次数
- 提升首次加载成功率

### ⚡ 性能优化
- **预测性预加载** - 横向模式检测滚轮方向，提前加载前方 4 页
- **CORS 优化** - 避免 Canvas 污染，直接插入节点
- **缓存复用** - realUrlCache 和 imageCache 防止重复请求

### 🎨 UI 改进
- **收窄设置面板** - 最大宽度 360px，更适合小屏设备
- **响应式优化** - 宽度 92%，内边距减少到 18px/20px

---

## � 完整更新内容

### 新增
- 缩略图固定占位容器 + 雪碧图快速预览
- 真实图片独立缩略图渲染（Canvas contain+center）
- 三区点击导航（左右翻页，中间切换顶栏）
- 预测性预加载（横向模式滚轮方向检测）
- 三层兜底初始化（早期捕获 → 延迟重试 → HTTP 回退）

### 改进
- IntersectionObserver rootMargin: 300px → 600px（缩略图）
- 初始化等待时间: 3s → 6s
- 设置面板最大宽度: 420px → 360px
- 设置面板响应式宽度: 90% → 92%
- 设置面板内边距: 20px/24px → 18px/20px

### 修复
- 缩略图顶部空白（雪碧图单元格内置留白）
- 初始化偶发"无法加载图片列表"
- Canvas SecurityError: Tainted canvases may not be exported
- 缩略图跳转后位置错误
- 设置弹窗在小屏设备上过宽

---

## 🎯 升级指南

### 自动更新
如果已安装扩展，浏览器会自动更新到 1.2.0 版本。

### 手动更新
1. 删除旧版扩展
2. 下载最新版本
3. 重新加载扩展

### 兼容性
- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Firefox 89+
- ✅ 所有现有功能向下兼容

---

## 🐛 已知问题

1. **首次进入横向模式** - IntersectionObserver 可能需要短暂时间触发（已优化到 600px）
2. **网络环境敏感** - 某些镜像服务器或不稳定网络下可能加载缓慢
3. **HTTP/2 协议错误** - 极端情况下仍可能出现（已大幅改善）

---

## � 致谢

感谢所有用户的反馈和建议，特别是关于缩略图居中和初始化稳定性的问题报告。

---

## 📄 历史版本

### v1.1.0 (2025-01-08)
- 横向连续模式
- 智能预加载系统
- 反向阅读支持
- 自动播放功能

### v1.0.0 (2025-01-07)
- 首次发布
- 单页阅读模式
- 深色模式
- 进度记忆
- 缩略图导航

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
