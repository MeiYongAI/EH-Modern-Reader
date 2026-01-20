# EH Modern Reader v2.3.6 完整发布说明

**发布日期**: 2026年1月21日  
**版本**: v2.3.6  
**主题**: 纵向阅读模式 + UX 优化 + 数据恢复

---

## 📋 版本总览

v2.3.6 是一个功能性升级和大量用户体验改进的版本。本版本新增了第三种阅读模式（纵向连续），同时恢复了之前被移除的某些功能，并进行了多个 bug 修复和优化。

---

## ✨ 主要新增功能

### 1. 纵向连续阅读模式（新增）

现在你可以选择第三种阅读模式——**纵向连续**（Continuous Vertical），通过垂直滚动浏览所有页面。

**特点**：
- 📜 上下滚动浏览页面，类似长图阅读体验
- ⚡ 智能懒加载，仅加载视口内及周边的图片
- 🎯 完整功能支持：
  - 三分区点击控制（上/中/下）
  - 反向阅读（垂直翻转）
  - 自动进度跟踪和保存
  - 缩略图同步高亮
  - 骨架屏加载动画
  - 快捷键支持（方向键、空格等）

**使用方法**：
1. 进入 MPV 页面或通过 Gallery 启动阅读器
2. 打开设置面板（⚙️ 按钮）
3. 选择"阅读模式" → "纵向连续"
4. 使用鼠标滚轮/触控板上下滚动

**技术细节**：
- 新增 `enterContinuousVerticalMode()` 函数（~280 行代码）
- 完全复用 `loadImage()`、缓存机制和预加载逻辑
- 使用 IntersectionObserver 实现高效懒加载
- 与其他阅读模式无缝切换，共享所有状态

### 2. 单页竖向模式（新增）

新增"**单页竖向**"（Single Page Vertical）阅读模式。

**特点**：
- 上下方向键/滚轮翻页
- 适合竖屏设备和竖向漫画
- 完整快捷键支持

### 3. 纵向侧边留白可调（新增）

纵向连续模式现在支持调整左右侧边的留白空间。

**详细**：
- 设置面板新增"侧边留白"滑块
- 范围：0-1000px
- 实时预览效果
- 自动保存用户偏好设置

---

## 🔄 恢复和改进的功能

### 1. Gallery 页面功能恢复

在 v2.3.5 中，出于某些原因，Gallery 页面的某些功能被移除了。v2.3.6 恢复了这些功能：

**✅ 恢复的功能**：
- 📍 EH Modern Reader 启动按钮（右侧操作面板）
- 🖼️ 缩略图点击拦截（直接启动阅读器并跳转到对应页）
- 💬 评论区正常显示（可查看和发表评论）
- 📑 缩略图分页显示（原生方式）

**说明**：
- 移除了过去试验性的自动展开所有缩略图功能
- 评论区现在保持 E-Hentai 的原生显示方式
- 保留了简洁、不侵入的扩展设计哲学

### 2. 数据持久化改进

- 阅读模式刷新后自动恢复
- 侧边留白设置自动保存
- 阅读进度跨会话保留
- 所有设置使用 localStorage + chrome.storage

---

## 🐛 修复和优化

### 修复的问题

1. **阅读模式刷新后跳转到第一张图**
   - 原因：`state.currentPage` 在初始化前被重置
   - 修复：在所有初始化代码路径中添加 `state.currentPage = savedPage`
   - 影响文件：`content.js` (lines 3823-3889)

2. **侧边留白滑块在 400px 以上不响应**
   - 原因：验证条件硬编码为 `<= 400`
   - 修复：更新为 `<= 1000`
   - 影响文件：`content.js` (lines 342, 2789, 3329)

3. **侧边留白调整时页面跳动**
   - 原因：容器 padding 变化导致 DOM 重排，触发 `onScroll` 事件
   - 修复：计算调整前的页面位置，并在调整后重新定位
   - 实现：添加双层 `requestAnimationFrame` 和累积高度计算
   - 影响文件：`content.js` (lines 2788-2819)

### 优化项

- **设置面板优化**：移除 emoji 标签，采用纯文本风格，更简洁专业
- **模式切换优化**：三种模式间的切换更加流畅，无需刷新
- **快捷键改进**：所有新增模式支持完整的快捷键系统
- **代码质量**：增加注释，改进错误处理，更好的代码结构

---

## 📊 文件变更统计

### 修改的文件

| 文件 | 变更行数 | 说明 |
|------|---------|------|
| `content.js` | +350 | 纵向模式、持久化、修复 |
| `gallery.js` | ~20 | URL 提取改进 |
| `manifest.json` | 1 | 版本号 2.3.5 → 2.3.6 |
| `README.md` | +15 | 版本说明更新 |
| `CHANGELOG.md` | +20 | 版本历史更新 |

### 新增的文件

- `docs/VERTICAL_MODE.md` - 纵向模式完整文档
- `docs/VERTICAL_MODE_QUICKSTART.md` - 快速开始指南

### 删除的文件

- `scripts/build-userscript.ps1` - 油猴脚本构建（已放弃）
- 相关的油猴文档

---

## 🔧 技术亮点

### 1. 纵向模式架构
```
├── UI: 新增模式选项 + 布局调整
├── 数据: 复用现有的 imagelist, cache, state
├── 加载: 复用 loadImage(), preload()
└── 事件: 使用 IntersectionObserver + onScroll
```

### 2. 持久化机制
```
浏览器关闭 → localStorage 保存设置
页面刷新 → 恢复 currentPage + 应用模式
模式切换 → 实时保存用户选择
```

### 3. 滚动位置修复
```
计算 padding 前的页面中心
应用新 padding
重新计算所有 wrapper 的累积高度
定位到相同页面的新位置
```

---

## 📋 兼容性

### 浏览器支持
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+（需要额外配置）
- ✅ Safari 14+（Web Extensions 支持）

### 网站支持
- ✅ https://e-hentai.org
- ✅ https://exhentai.org

### 已知限制
- 纵向模式在 < 500px 宽度上可能显示不佳
- 某些非标准页面结构可能导致懒加载失效
- Firefox 需要 WebExtensions API 支持

---

## 🚀 安装和升级

### 全新安装
1. 下载最新的 [eh-modern-reader-v2.3.4.zip](https://github.com/MeiYongAI/EH-Modern-Reader/releases/download/v2.3.6/eh-modern-reader-v2.3.4.zip)
2. 解压到任意目录
3. 打开 `chrome://extensions/`（或 `edge://extensions/`）
4. 启用"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择解压后的文件夹

### 从旧版升级
1. 删除旧的 EH Modern Reader 扩展
2. 按照上述步骤安装新版本
3. 你的设置会自动恢复（因为使用 localStorage）

---

## 📚 文档和支持

### 相关文档
- [完整安装指南](docs/INSTALL.md)
- [纵向模式详解](docs/VERTICAL_MODE.md)
- [纵向模式快速开始](docs/VERTICAL_MODE_QUICKSTART.md)
- [开发指南](docs/DEVELOPMENT.md)
- [故障排除](docs/TROUBLESHOOTING.md)

### 反馈和报告
- GitHub Issues: [报告问题](https://github.com/MeiYongAI/EH-Modern-Reader/issues)
- 功能请求: [提出建议](https://github.com/MeiYongAI/EH-Modern-Reader/issues/new?template=feature_request.md)

---

## 🙏 致谢

感谢所有用户的反馈和支持！

---

## 📄 许可证

MIT License - 自由使用和修改

---

**快速链接**
- 📦 [下载](https://github.com/MeiYongAI/EH-Modern-Reader/releases/tag/v2.3.6)
- 📖 [文档](docs/)
- 🐛 [问题反馈](https://github.com/MeiYongAI/EH-Modern-Reader/issues)
- ⭐ [GitHub 仓库](https://github.com/MeiYongAI/EH-Modern-Reader)

**版本信息**
- 版本号: v2.3.6
- 发布日期: 2026-01-21
- 上个版本: v2.3.5 (2026-01-20)
