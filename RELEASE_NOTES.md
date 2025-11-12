# Release Notes

## v2.1.0 (2025-11-12)

改进
- 画廊：默认静默自动展开全部缩略图；新增缩略图占位背景，减少抖动
- 评论：新增“最新评论预览”置顶；弹窗内点击“分数+N”切换投票详情；锁定滚动并隔离外部事件
- MPV：真实图片 URL 持久缓存 + 预连接；恢复上次页码；更稳的预取与并发控制
- UI：深浅色自适应，评论预览/弹窗的边框与站点保持一致
# Release Notes

## v2.1.0 (2025-11-12)

改进
- 画廊：默认静默自动展开缩略图；新增占位样式减少抖动
- 评论：新增预览（克隆只读）+ 弹窗原始树，点击分数切换投票详情（再次点击关闭）；隔离外部 hover/wheel
- MPV：真实图片 URL 会话缓存 + 预连接；更稳的预取与并发控制
- UI：深浅色自适应；移除冗余旧进度样式，仅保留环形进度覆盖层

修复
- 修复投票详情无法收起（改为删除节点）
- 修复预览被外部交互污染（移除 ID、禁用 pointer-events）

## v2.0.0 (2025-11-10)

- 首个稳定版：双模式整合、请求节流、横向模式优化、目录与文档规范化

完整历史请见 CHANGELOG.md。
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
