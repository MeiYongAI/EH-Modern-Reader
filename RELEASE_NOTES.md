# Release Notes - v2.0.0# Release Notes - v2.0.0# Release Notes



## 🎉 EH Modern Reader v2.0.0 - 正式发行版



**发布日期：** 2025-11-10## 🎉 EH Modern Reader v2.0.0 - 正式发行版## 🎉 EH Modern Reader v1.2.0 - 完美居中 & 稳定增强



这是 EH Modern Reader 的首个正式发行版本，完整支持 Gallery 模式、请求节流防封禁、项目规范化，标志着项目进入成熟稳定阶段。



---**发布日期：** 2025-11-10**发布日期：** 2025-01-09



## 🚀 重点特性



### 🎨 Gallery 模式这是 EH Modern Reader 的首个正式发行版本，完整支持 Gallery 模式、请求节流防封禁、项目规范化，标志着项目进入成熟稳定阶段。这是 EH Modern Reader 的 1.2.0 正式版本，带来缩略图系统重构、三区点击导航、强化的初始化稳定性等重大更新。

**无需 300 Hath，人人可用**



- **一键启动** - 画廊页面（`/g/`）点击"EH Modern Reader"按钮即可

- **完整功能** - 支持单页/横向连续模式、预加载、进度记忆等全部功能------

- **智能节流** - 内置风控机制，安全使用



### 🛡️ 请求节流系统

**彻底解决 IP 封禁问题**## 🚀 重点特性## ✨ 重点新特性



- **并发控制** - 最多 3 个并发缩略图请求

- **间隔限制** - 每个请求间隔 250ms

- **滚动锁** - 跳页时锁定 2 秒，防止洪水请求### 🎨 Gallery 模式### 🖼️ 缩略图系统全面重构

- **批量加载** - 可视区域优先，最多 10 张/次

**无需 300 Hath，人人可用**采用独立真实图片 Canvas 渲染，彻底解决顶部空白问题，实现完美居中。

**实测效果**：

- ✅ 正常翻页：无风控触发

- ✅ 大幅跳页（1→100）：手动批量加载，无IP封禁

- ✅ 连续使用数小时：稳定无封禁- **一键启动** - 画廊页面（`/g/`）点击"EH Modern Reader"按钮即可**技术亮点**



### 🎨 UI/UX 优化- **完整功能** - 支持单页/横向连续模式、预加载、进度记忆等全部功能- **固定占位容器** - 100×142 固定尺寸，防止布局跳动



#### 横向模式优化- **智能节流** - 内置风控机制，安全使用- **雪碧图快速预览** - 利用站点原始图作为即时背景，零延迟

- **间距收紧** - 卡片间距 16px → 8px，视觉更紧凑

- **图片填充** - `width/height: 100%` + `object-fit: contain`，无留白- **真实图片缩略图** - 独立请求每页图片，Canvas contain 缩放 + 双向居中

- **菜单切换** - header 绝对定位，无图片跳动

### 🛡️ 请求节流系统- **智能懒加载** - IntersectionObserver rootMargin 600px，提前触发

#### 启动按钮

- 去除渐变背景，与站点原生风格统一**彻底解决 IP 封禁问题**

- 布局自然融入，不突兀

**用户价值**

### 🏗️ 项目规范化

- **并发控制** - 最多 3 个并发缩略图请求- 缩略图完全垂直水平居中，视觉更舒适

#### 目录结构重组

```- **间隔限制** - 每个请求间隔 250ms- 跳转后位置稳定，无跳动

eh-reader-extension/

├── docs/          # 11个文档（安装、开发、故障排除等）- **滚动锁** - 跳页时锁定 2 秒，防止洪水请求- 首屏即刻展示预览，无白屏等待

├── scripts/       # 5个构建脚本（build、generate-icons等）

├── dist/          # 发布包- **批量加载** - 可视区域优先，最多 10 张/次

├── content.js     # MPV 核心 (2740+ 行)

├── gallery.js     # Gallery 启动 (420 行)### 🖱️ 三区点击导航

├── style/         # 样式文件

├── icons/         # 扩展图标**实测效果**：全新的点击区域划分，操作更直观。

└── README.md      # 精简版说明

```- ✅ 正常翻页：无风控触发



#### 清理成果- ✅ 大幅跳页（1→100）：手动批量加载，无IP封禁**交互设计**

- ✅ 删除 10+ 个冗余/过期文件

- ✅ 删除 3 个空目录（`src/`, `js/`, `dist/test-extract/`）- ✅ 连续使用数小时：稳定无封禁- **左侧 1/3** - 向左翻页

- ✅ 整理 11 个文档到 `docs/`

- ✅ 整理 5 个脚本到 `scripts/`- **中间 1/3** - 切换顶栏显示/隐藏



#### 文档更新### 🎨 UI/UX 优化- **右侧 1/3** - 向右翻页

- ✅ README.md - 精简为实用说明

- ✅ welcome.html - 全新欢迎页设计

- ✅ CHANGELOG.md - 完整版本记录

- ✅ scripts/README.md - 脚本使用说明#### 横向模式优化**适用场景**



---- **间距收紧** - 卡片间距 16px → 8px，视觉更紧凑- 所有模式（单页 / 横向连续）



## 📋 完整更新内容- **图片填充** - `width/height: 100%` + `object-fit: contain`，无留白- 覆盖整个视图区域



### ✨ 新增- **菜单切换** - header 绝对定位，无图片跳动- 移除原有的小圆翻页按钮

- Gallery 模式 - 无需 300 Hath 启动阅读器

- 请求节流系统 - 3并发 + 250ms间隔 + 2秒滚动锁

- 批量懒加载 - 跳页后手动触发可视区域加载（最多10张）

- 项目规范化 - 目录重组、文档整理、构建脚本#### 启动按钮### 🛡️ 初始化稳定性增强



### 🎨 改进- 去除渐变背景，与站点原生风格统一三层兜底机制，彻底解决"无法加载图片列表"问题。

- 横向模式间距优化（16px → 8px）

- 图片填充改进（width/height: 100%）- 布局自然融入，不突兀

- 启动按钮样式统一（去除渐变）

- 菜单切换无跳动（header 绝对定位）**解决方案**

- 缩略图加载提速（250ms 间隔）

### 🏗️ 项目规范化1. **早期脚本拦截** - document_start 阶段捕获变量

### 🐛 修复

- 解决 Gallery 模式频繁跳页可能触发封禁2. **延迟重试** - 等待时间从 3 秒延长到 6 秒

- 解决横向模式图片间距过大

- 解决菜单切换时图片位置跳动#### 目录结构重组3. **HTTP 回退** - 直接抓取页面 HTML 并解析 `imagelist`

- 解决缩略图加载过慢问题

```

---

eh-reader-extension/**效果**

## 📦 安装方法

├── docs/          # 11个文档（安装、开发、故障排除等）- 极端情况下也能成功初始化

### Chrome / Edge

1. 下载 [v2.0.0 发布包](https://github.com/MeiYongAI/eh-reader-extension/releases/tag/v2.0.0)├── scripts/       # 5个构建脚本（build、generate-icons等）- 减少用户刷新页面次数

2. 解压 ZIP 文件

3. 打开 `chrome://extensions/` 或 `edge://extensions/`├── dist/          # 发布包- 提升首次加载成功率

4. 开启"开发者模式"

5. 点击"加载已解压的扩展程序"├── content.js     # MPV 核心 (2740+ 行)



### Firefox├── gallery.js     # Gallery 启动 (420 行)### ⚡ 性能优化

1. 下载 [v2.0.0 发布包](https://github.com/MeiYongAI/eh-reader-extension/releases/tag/v2.0.0)

2. 解压 ZIP 文件├── style/         # 样式文件- **预测性预加载** - 横向模式检测滚轮方向，提前加载前方 4 页

3. 打开 `about:debugging#/runtime/this-firefox`

4. 点击"临时载入附加组件"，选择 `manifest.json`├── icons/         # 扩展图标- **CORS 优化** - 避免 Canvas 污染，直接插入节点



---└── README.md      # 精简版说明- **缓存复用** - realUrlCache 和 imageCache 防止重复请求



## 🎯 使用指南```



### MPV 模式（自动）### 🎨 UI 改进

访问 MPV 页面（`https://e-hentai.org/mpv/...`），扩展自动替换原版阅读器。

#### 清理成果- **收窄设置面板** - 最大宽度 360px，更适合小屏设备

### Gallery 模式（手动）

1. 访问画廊页面（`https://e-hentai.org/g/...`）- ✅ 删除 10+ 个冗余/过期文件- **响应式优化** - 宽度 92%，内边距减少到 18px/20px

2. 点击右侧"EH Modern Reader"按钮

3. 阅读器自动启动- ✅ 删除 3 个空目录（`src/`, `js/`, `dist/test-extract/`）



### 快捷键- ✅ 整理 11 个文档到 `docs/`---

- `← →` 或 `A D` - 翻页

- `Home / End` - 跳转首页/末页- ✅ 整理 5 个脚本到 `scripts/`

- `H / S` - 切换横向/单页模式

- `P` - 自动播放## � 完整更新内容

- `F11` - 全屏

#### 文档更新

---

- ✅ README.md - 精简为实用说明### 新增

## ⚠️ 重要提示

- ✅ welcome.html - 全新欢迎页设计- 缩略图固定占位容器 + 雪碧图快速预览

### Gallery 模式风控

扩展已内置完善的节流机制：- ✅ CHANGELOG.md - 完整版本记录- 真实图片独立缩略图渲染（Canvas contain+center）

- ✅ **3并发 + 250ms间隔** - 自动控制请求频率

- ✅ **2秒滚动锁** - 跳页时防止洪水请求- ✅ scripts/README.md - 脚本使用说明- 三区点击导航（左右翻页，中间切换顶栏）

- ✅ **批量加载** - 最多10张/次，可视区域优先

- 预测性预加载（横向模式滚轮方向检测）

**如何避免封禁**：

- ✅ 正常翻页浏览 - 完全安全---- 三层兜底初始化（早期捕获 → 延迟重试 → HTTP 回退）

- ✅ 跳转特定页面 - 扩展自动处理

- ⚠️ 频繁大幅跳页（如1→100→200→50） - 建议减少操作频率

- ⚠️ 多个标签页同时使用 - 请求会累加，建议单标签使用

## 📦 安装方法### 改进

**如遇封禁**：

通常几分钟自动解封，无需担心。期间可使用 MPV 模式（不受影响）。- IntersectionObserver rootMargin: 300px → 600px（缩略图）



---### Chrome / Edge- 初始化等待时间: 3s → 6s



## 🐛 已知问题1. 下载 [v2.0.0 发布包](https://github.com/MeiYongAI/eh-reader-extension/releases/tag/v2.0.0)- 设置面板最大宽度: 420px → 360px



1. **极端网络环境** - 某些镜像服务器可能加载较慢2. 解压 ZIP 文件- 设置面板响应式宽度: 90% → 92%

2. **多标签并发** - 多个 Gallery 标签同时使用可能增加封禁风险

3. **首次加载** - Gallery 模式首次启动可能需要几秒初始化3. 打开 `chrome://extensions/` 或 `edge://extensions/`- 设置面板内边距: 20px/24px → 18px/20px



---4. 开启"开发者模式"



## 🔄 升级指南5. 点击"加载已解压的扩展程序"### 修复



### 从 v1.x 升级- 缩略图顶部空白（雪碧图单元格内置留白）

1. 卸载旧版本扩展

2. 下载并安装 v2.0.0### Firefox- 初始化偶发"无法加载图片列表"

3. 所有设置和进度数据会自动保留

1. 下载 [v2.0.0 发布包](https://github.com/MeiYongAI/eh-reader-extension/releases/tag/v2.0.0)- Canvas SecurityError: Tainted canvases may not be exported

### 兼容性

- ✅ Chrome 88+2. 解压 ZIP 文件- 缩略图跳转后位置错误

- ✅ Edge 88+

- ✅ Firefox 89+3. 打开 `about:debugging#/runtime/this-firefox`- 设置弹窗在小屏设备上过宽

- ✅ 所有现有功能向下兼容

4. 点击"临时载入附加组件"，选择 `manifest.json`

---

---

## 📚 相关文档

---

- [完整更新日志](CHANGELOG.md)

- [安装指南](docs/INSTALL.md)## 🎯 升级指南

- [开发文档](docs/DEVELOPMENT.md)

- [故障排除](docs/TROUBLESHOOTING.md)## 🎯 使用指南

- [发布指南](docs/PUBLISH_GUIDE.md)

### 自动更新

---

### MPV 模式（自动）如果已安装扩展，浏览器会自动更新到 1.2.0 版本。

## 🙏 致谢

访问 MPV 页面（`https://e-hentai.org/mpv/...`），扩展自动替换原版阅读器。

感谢所有用户的反馈和建议！特别感谢：

- Gallery 模式需求的提出者### 手动更新

- 风控问题的测试志愿者

- 项目规范化建议的贡献者### Gallery 模式（手动）1. 删除旧版扩展



---1. 访问画廊页面（`https://e-hentai.org/g/...`）2. 下载最新版本



## 📞 反馈与支持2. 点击右侧"EH Modern Reader"按钮3. 重新加载扩展



- **GitHub Issues**: [提交问题](https://github.com/MeiYongAI/eh-reader-extension/issues)3. 阅读器自动启动

- **GitHub Discussions**: [讨论交流](https://github.com/MeiYongAI/eh-reader-extension/discussions)

- **README**: [查看文档](README.md)### 兼容性



---### 快捷键- ✅ Chrome 88+



**享受更流畅的阅读体验！** 📚✨- `← →` 或 `A D` - 翻页- ✅ Edge 88+


- `Home / End` - 跳转首页/末页- ✅ Firefox 89+

- `H / S` - 切换横向/单页模式- ✅ 所有现有功能向下兼容

- `P` - 自动播放

- `F11` - 全屏---



---## 🐛 已知问题



## ⚠️ 重要提示1. **首次进入横向模式** - IntersectionObserver 可能需要短暂时间触发（已优化到 600px）

2. **网络环境敏感** - 某些镜像服务器或不稳定网络下可能加载缓慢

### Gallery 模式风控3. **HTTP/2 协议错误** - 极端情况下仍可能出现（已大幅改善）

扩展已内置完善的节流机制：

- ✅ **3并发 + 250ms间隔** - 自动控制请求频率---

- ✅ **2秒滚动锁** - 跳页时防止洪水请求

- ✅ **批量加载** - 最多10张/次，可视区域优先## � 致谢



**如何避免封禁**：感谢所有用户的反馈和建议，特别是关于缩略图居中和初始化稳定性的问题报告。

- ✅ 正常翻页浏览 - 完全安全

- ✅ 跳转特定页面 - 扩展自动处理---

- ⚠️ 频繁大幅跳页（如1→100→200→50） - 建议减少操作频率

- ⚠️ 多个标签页同时使用 - 请求会累加，建议单标签使用## 📄 历史版本



**如遇封禁**：### v1.1.0 (2025-01-08)

通常几分钟自动解封，无需担心。期间可使用 MPV 模式（不受影响）。- 横向连续模式

- 智能预加载系统

---- 反向阅读支持

- 自动播放功能

## 🐛 已知限制

### v1.0.0 (2025-01-07)

1. **Gallery 模式需手动启动** - 点击画廊页面按钮- 首次发布

2. **首次加载较慢** - 需解析 HTML 获取图片 URL- 单页阅读模式

3. **网络敏感** - 不稳定网络可能加载缓慢- 深色模式

- 进度记忆

---- 缩略图导航



## 🔮 未来计划---



### v2.1.0 计划## 📦 安装方法

- [ ] 可配置节流参数（保守/标准/快速模式）

- [ ] 失败重试机制与错误统计面板### Chrome / Edge

- [ ] Gallery 模式自动启动选项

1. 下载 `eh-modern-reader-v1.0.0-chrome.zip`

### v2.x 路线图2. 解压到本地文件夹

- [ ] 触摸设备手势支持3. 打开 `chrome://extensions/` 或 `edge://extensions/`

- [ ] 阅读历史记录 UI4. 开启"开发者模式"

- [ ] 自定义主题与配色5. 点击"加载已解压的扩展程序"

- [ ] 图片缩放与裁剪6. 选择解压后的文件夹

7. ✅ 完成！访问 E-Hentai MPV 页面即可使用

---

### Firefox

## 📚 相关链接

1. 下载 `eh-modern-reader-v1.0.0-firefox.zip`

- **GitHub**: https://github.com/MeiYongAI/eh-reader-extension2. 打开 `about:debugging#/runtime/this-firefox`

- **问题反馈**: https://github.com/MeiYongAI/eh-reader-extension/issues3. 点击"临时载入附加组件"

- **安装指南**: [docs/INSTALL.md](docs/INSTALL.md)4. 选择下载的 ZIP 文件或解压后的 manifest.json

- **故障排除**: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)5. ✅ 完成！访问 E-Hentai MPV 页面即可使用

- **开发文档**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

> **注意：** Firefox 临时加载的扩展在浏览器重启后会失效，需要重新加载。

---

---

## 🤝 贡献者

## 🎯 使用说明

感谢所有为本项目做出贡献的开发者！

### 快速开始

欢迎提交：

- 🐛 Bug 报告1. 访问 [E-Hentai](https://e-hentai.org) 或 [ExHentai](https://exhentai.org)

- 💡 功能建议2. 打开任意画廊详情页

- 🔧 代码贡献3. 点击顶部的 **MPV** 按钮

4. 🎉 阅读器自动启动！

---

### 快捷键列表

## 📄 开源协议

| 快捷键 | 功能 |

[MIT License](LICENSE) - 自由使用、修改和分发|--------|------|

| `←` / `A` | 上一页 |

---| `→` / `D` / `空格` | 下一页 |

| `Home` | 第一页 |

## ⚠️ 免责声明| `End` | 最后一页 |

| `F` | 切换侧边栏 |

本扩展仅供学习研究，请遵守当地法律法规及站点规则。作者不对使用本扩展产生的任何后果负责。| `F11` | 全屏模式 |

| `Esc` | 退出全屏/关闭面板 |

---

### 界面说明

**享受更流畅的阅读体验！** 📚✨

- **顶部工具栏**：返回按钮、标题、页码、设置、全屏、主题切换

*发布时间：2025-11-10*- **左侧边栏**：缩略图列表，点击快速跳转

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
