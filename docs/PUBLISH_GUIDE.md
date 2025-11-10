# 🚀 GitHub 发布步骤

## 第一步：在 GitHub 创建仓库

1. 访问 https://github.com/new
2. 填写以下信息：
   - **Repository name:** `eh-modern-reader`
   - **Description:** `现代化的 E-Hentai 阅读器浏览器扩展 - 深色模式、智能预加载、进度记忆`
   - **Public** ✓ (公开仓库)
   - **❌ 不要勾选** "Add a README file"
   - **❌ 不要勾选** ".gitignore"
   - **❌ 不要勾选** "license"

3. 点击 **"Create repository"**

---

## 第二步：推送代码到 GitHub

在命令行执行：

```powershell
cd "C:\Users\Dick\Documents\VSCode-Job\eh-reader-extension"

# 推送代码
git push -u origin main
```

如果需要认证，可能需要使用 Personal Access Token (PAT)：
- 访问 https://github.com/settings/tokens
- 生成新的 token
- 在推送时使用 token 作为密码

---

## 第三步：创建 Release

### 方法 A：通过 GitHub 网页界面

1. 访问你的仓库：https://github.com/MeiYongAI/eh-modern-reader

2. 点击右侧的 **"Releases"** → **"Create a new release"**

3. 填写 Release 信息：

   **Tag version:**
   ```
   v1.0.0
   ```

   **Release title:**
   ```
   🎉 EH Modern Reader v1.0.0 - 首个正式版本
   ```

   **Description:** (复制以下内容)
   ```markdown
   ## ✨ 核心特性

   - 🎨 **现代化界面** - 全新设计，简洁优雅
   - 🌙 **深色模式** - 完整暗色主题支持
   - ⚡ **智能预加载** - 图片缓存，流畅翻页
   - 💾 **进度记忆** - 自动保存阅读位置
   - ⌨️ **丰富交互** - 键盘/鼠标/滚轮全支持
   - 🛠️ **灵活设置** - 多种显示和对齐选项

   ## 📦 安装方法

   ### Chrome / Edge
   1. 下载 `eh-modern-reader-v1.0.0-chrome.zip`
   2. 解压到本地
   3. 打开 `chrome://extensions/`
   4. 开启"开发者模式"
   5. 点击"加载已解压的扩展程序"

   ### Firefox
   1. 下载 `eh-modern-reader-v1.0.0-firefox.zip`
   2. 打开 `about:debugging#/runtime/this-firefox`
   3. 点击"临时载入附加组件"
   4. 选择 ZIP 文件

   ## 🎯 使用说明

   1. 访问 E-Hentai 画廊页面
   2. 点击 **MPV** 按钮
   3. 🎉 自动启用现代化阅读器

   ### 快捷键
   - `← →` - 翻页
   - `Home / End` - 首页/末页
   - `F` - 切换侧边栏
   - `F11` - 全屏

   ## 📝 详细文档

   - [快速开始](QUICK_START.md)
   - [安装指南](INSTALL.md)
   - [开发文档](DEVELOPMENT.md)

   ## 🐛 已知问题

   - 当前使用缩略图演示，完整图片需要 API 实现
   - ExHentai 需要登录 Cookie
   - Firefox 临时加载重启后失效

   ## 🔮 未来计划

   - 完整 API 图片获取
   - 双页显示模式
   - 图片缩放功能
   - 批量下载支持

   ---

   **完整更新日志：** [RELEASE_NOTES.md](RELEASE_NOTES.md)
   ```

4. 上传文件：
   - 点击 **"Attach binaries"**
   - 上传以下文件：
     - ✅ `dist/eh-modern-reader-v1.0.0-chrome.zip`
     - ✅ `dist/eh-modern-reader-v1.0.0-firefox.zip`
     - ✅ `dist/eh-modern-reader-v1.0.0-source.zip`

5. 勾选 **"Set as the latest release"**

6. 点击 **"Publish release"**

### 方法 B：通过 Git 命令行（可选）

```powershell
# 创建 tag
git tag -a v1.0.0 -m "Release v1.0.0 - EH Modern Reader 首个正式版本"

# 推送 tag
git push origin v1.0.0
```

然后在 GitHub 网页界面完成 Release 创建和文件上传。

---

## 第四步：完善仓库信息

### 1. 添加 Topics

在仓库主页点击右侧 ⚙️ 设置，添加以下 topics：

```
browser-extension
chrome-extension
firefox-addon
e-hentai
manga-reader
dark-mode
vanilla-js
manifest-v3
reader
ui-ux
```

### 2. 更新 About

- **Description:** `现代化的 E-Hentai 阅读器浏览器扩展 - 深色模式、智能预加载、进度记忆`
- **Website:** 留空或填写 demo 地址

### 3. 添加 README 徽章

在 README.md 顶部已经有徽章了：

```markdown
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
```

可以考虑添加更多：

```markdown
![GitHub stars](https://img.shields.io/github/stars/MeiYongAI/eh-modern-reader?style=social)
![GitHub forks](https://img.shields.io/github/forks/MeiYongAI/eh-modern-reader?style=social)
![GitHub issues](https://img.shields.io/github/issues/MeiYongAI/eh-modern-reader)
```

---

## 第五步：提交到浏览器商店（可选）

### Chrome Web Store

1. 访问 [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 支付一次性开发者费用 $5 (如果是首次)
3. 点击 **"New Item"**
4. 上传 `eh-modern-reader-v1.0.0-chrome.zip`
5. 填写商店信息：
   - **Name:** EH Modern Reader
   - **Description:** 使用 README 中的描述
   - **Category:** Productivity
   - **Language:** 中文 (简体)
6. 上传截图和宣传图
7. 提交审核（通常 1-3 天）

### Firefox Add-ons

1. 访问 [Firefox Developer Hub](https://addons.mozilla.org/developers/)
2. 点击 **"Submit a New Add-on"**
3. 上传 `eh-modern-reader-v1.0.0-firefox.zip`
4. 填写信息
5. 提交审核（通常 1-7 天）

---

## 🎉 完成！

你的项目已经成功发布到 GitHub！

### 分享你的项目

- **Reddit:** r/chrome_extensions, r/FirefoxAddons
- **Twitter/X:** 使用标签 #BrowserExtension
- **V2EX:** 程序员/分享创造
- **GitHub Trending:** 如果获得足够 star 可能上榜

### 监控和维护

- 定期查看 Issues
- 回复用户反馈
- 更新版本
- 修复 Bug

---

**祝你的项目获得成功！⭐**
