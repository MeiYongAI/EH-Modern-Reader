# GitHub 上传指南

## 方法 1: 通过 GitHub Desktop（推荐新手）

### 步骤 1: 安装 GitHub Desktop
1. 访问 https://desktop.github.com/
2. 下载并安装 GitHub Desktop
3. 登录你的 GitHub 账号

### 步骤 2: 创建仓库
1. 点击 "File" → "New repository"
2. 填写信息：
   - **Name**: `eh-modern-reader`
   - **Description**: `现代化的 E-Hentai 阅读器浏览器扩展`
   - **Local path**: 选择项目文件夹的父目录
   - ✓ Initialize with README (取消勾选，我们已有 README)
   - **Git ignore**: None (我们已有 .gitignore)
   - **License**: MIT License (取消勾选，我们已有 LICENSE)

3. 点击 "Create repository"

### 步骤 3: 提交并推送
1. 在 GitHub Desktop 中应该看到所有文件
2. 在左下角填写提交信息：
   - **Summary**: `Initial commit - EH Modern Reader v1.0.0`
   - **Description**: 
     ```
     完整实现：
     - 现代化阅读器界面
     - 深色模式支持
     - 智能预加载
     - 进度记忆
     - 完整文档
     ```
3. 点击 "Commit to main"
4. 点击 "Publish repository"
5. 取消勾选 "Keep this code private"（或保持勾选设为私有）
6. 点击 "Publish repository"

完成！访问你的 GitHub 主页查看新仓库。

---

## 方法 2: 通过 Git 命令行

### 步骤 1: 初始化本地仓库
```powershell
# 进入项目目录
cd C:\Users\Dick\Documents\VSCode-Job\eh-reader-extension

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 查看状态
git status

# 提交
git commit -m "Initial commit - EH Modern Reader v1.0.0"
```

### 步骤 2: 在 GitHub 创建远程仓库
1. 访问 https://github.com/new
2. 填写仓库信息：
   - **Repository name**: `eh-modern-reader`
   - **Description**: `现代化的 E-Hentai 阅读器浏览器扩展`
   - **Public** 或 **Private**
   - **不要**勾选 "Initialize with README"
3. 点击 "Create repository"

### 步骤 3: 连接并推送
```powershell
# 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/eh-modern-reader.git

# 设置主分支
git branch -M main

# 推送到 GitHub
git push -u origin main
```

完成！刷新 GitHub 页面查看。

---

## 方法 3: 通过 VS Code

### 步骤 1: 打开项目
1. 打开 VS Code
2. File → Open Folder
3. 选择 `eh-reader-extension` 文件夹

### 步骤 2: 初始化 Git
1. 点击左侧栏的 "Source Control" 图标（或 Ctrl+Shift+G）
2. 点击 "Initialize Repository"
3. 所有文件会出现在 "Changes" 列表

### 步骤 3: 提交
1. 在顶部输入框输入提交信息：`Initial commit`
2. 点击 ✓ 提交按钮
3. 选择 "Yes" 暂存所有更改并提交

### 步骤 4: 推送到 GitHub
1. 点击 "Publish to GitHub"
2. 选择仓库名称和可见性
3. 确认要推送的文件
4. 点击 "Publish"

完成！VS Code 会自动创建仓库并推送。

---

## 推荐的 README.md 徽章

在 README.md 顶部添加这些徽章：

```markdown
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Chrome](https://img.shields.io/badge/Chrome-88+-yellow)
![Edge](https://img.shields.io/badge/Edge-88+-blue)
![Firefox](https://img.shields.io/badge/Firefox-89+-orange)
```

## 推荐的仓库描述

```
现代化的 E-Hentai 阅读器浏览器扩展 - 深色模式、智能预加载、进度记忆
```

## 推荐的 Topics (标签)

在 GitHub 仓库页面添加这些 topics：
- `browser-extension`
- `chrome-extension`
- `firefox-addon`
- `e-hentai`
- `manga-reader`
- `dark-mode`
- `vanilla-js`
- `manifest-v3`
- `reader`
- `ui-ux`

## 完善仓库信息

### 添加 About
1. 在仓库页面点击右侧的 ⚙️ 设置按钮
2. 填写 Description
3. 添加 Website (如果有 demo 页面)
4. 添加 Topics

### 设置 GitHub Pages (可选)
如果你想展示欢迎页面：
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, folder: / (root)
4. Save

访问 `https://YOUR_USERNAME.github.io/eh-modern-reader/welcome.html`

### 创建 Release
1. 进入仓库的 "Releases" 页面
2. 点击 "Create a new release"
3. 填写信息：
   - **Tag version**: `v1.0.0`
   - **Release title**: `EH Modern Reader v1.0.0`
   - **Description**: 
     ```markdown
     ## 🎉 首个正式版本
     
     ### ✨ 功能特性
     - 现代化阅读器界面
     - 深色模式支持
     - 智能图片预加载
     - 阅读进度记忆
     - 丰富的快捷键
     - 响应式设计
     
     ### 📦 安装方法
     1. 下载 Source code (zip)
     2. 解压到本地
     3. 浏览器加载已解压的扩展
     
     详见 [INSTALL.md](INSTALL.md)
     ```
4. 点击 "Publish release"

## 推荐的 GitHub Actions (自动化)

创建 `.github/workflows/lint.yml`：

```yaml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check manifest.json
        run: |
          cat manifest.json | python -m json.tool
```

## 社交媒体分享

发布后可以在以下平台分享：
- Reddit: r/chrome_extensions, r/FirefoxAddons
- Twitter/X: 使用标签 #BrowserExtension #ChromeExtension
- ProductHunt: 提交产品页面

## 示例 README 结构

确保 README.md 包含：
- [ ] 项目徽章
- [ ] 功能特性列表
- [ ] 截图/动图展示
- [ ] 安装说明
- [ ] 使用说明
- [ ] 快捷键列表
- [ ] 开发指南链接
- [ ] 贡献指南
- [ ] 许可证信息

## 检查清单

上传前确认：
- [ ] 所有代码文件已保存
- [ ] README.md 完整且格式正确
- [ ] LICENSE 文件存在
- [ ] .gitignore 配置正确
- [ ] 没有敏感信息（密钥、个人数据）
- [ ] manifest.json 语法正确
- [ ] 图标文件已添加或说明已更新
- [ ] 所有链接有效

## 后续维护

### 定期更新
```powershell
# 查看状态
git status

# 添加更改
git add .

# 提交
git commit -m "fix: 修复图片加载问题"

# 推送
git push
```

### 版本标签
```powershell
# 创建标签
git tag -a v1.0.1 -m "Bug fixes"

# 推送标签
git push origin v1.0.1
```

### 分支管理
```powershell
# 创建功能分支
git checkout -b feature/new-feature

# 完成后合并
git checkout main
git merge feature/new-feature
```

---

## 🎉 恭喜！

项目已准备好上传到 GitHub！

**下一步建议：**
1. 上传到 GitHub
2. 创建项目图标
3. 截图展示效果
4. 分享给社区
5. 收集反馈改进

**祝你的项目获得 ⭐ Star！**
