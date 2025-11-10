# GitHub 发版指南 - v2.0.0

## 📋 发版清单

### ✅ 已完成准备工作
- [x] manifest.json 版本号：v2.0.0
- [x] welcome.html 版本号和内容更新
- [x] CHANGELOG.md 完整更新日志
- [x] RELEASE_NOTES.md 发版说明
- [x] README.md 版本徽章更新
- [x] 所有文件错误检查通过
- [x] 构建打包成功：`eh-modern-reader-v2.0.0.zip` (57.68 KB)

---

## 🚀 GitHub 发版步骤

### 1. 提交代码到 GitHub

```powershell
cd "c:\Users\Dick\Documents\VSCode-Job\eh-reader-extension"

# 检查状态
git status

# 添加所有更改
git add .

# 提交
git commit -m "Release v2.0.0 - 正式发行版

✨ 新增功能：
- Gallery 模式 - 无需 300 Hath
- 请求节流系统 - 3并发 + 250ms间隔
- 批量懒加载优化

🎨 改进：
- 横向模式 UI 优化
- 项目目录规范化
- 文档完善

🐛 修复：
- Gallery 模式封禁风险
- 菜单切换跳动问题
- 图片间距和填充问题"

# 推送到远程
git push origin main

# 创建标签
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin v2.0.0
```

### 2. 创建 GitHub Release

#### 访问 Release 页面
https://github.com/MeiYongAI/eh-reader-extension/releases/new

#### 填写发版信息

**标签选择**：`v2.0.0`

**发行标题**：
```
🎉 EH Modern Reader v2.0.0 - 正式发行版
```

**发行说明**：
复制 `RELEASE_NOTES.md` 的完整内容

#### 上传文件
1. 点击 "Attach binaries by dropping them here or selecting them"
2. 上传文件：`dist/eh-modern-reader-v2.0.0.zip`

#### 发布选项
- [x] Set as the latest release
- [ ] Set as a pre-release
- [ ] Create a discussion for this release (可选)

### 3. 点击 "Publish release"

---

## 📝 发版说明预览

### 简短版（用于 Git Tag）
```
Release v2.0.0 - 正式发行版

🎨 Gallery 模式 - 无需 300 Hath
🛡️ 请求节流 - 3并发 + 250ms间隔
🏗️ 项目规范化 - 目录重组 + 文档完善
⚡ 性能优化 - 图片填充 + UI改进
```

### 完整版
见 `RELEASE_NOTES.md`

---

## 🔍 发版后验证

### 检查清单
- [ ] GitHub Release 页面正常显示
- [ ] ZIP 文件可以正常下载
- [ ] Release 标记为 "Latest"
- [ ] 标签 v2.0.0 存在
- [ ] README 徽章显示 v2.0.0

### 测试安装
1. 从 GitHub Release 下载 ZIP
2. 解压并加载到浏览器
3. 验证版本号显示为 2.0.0
4. 测试 MPV 模式
5. 测试 Gallery 模式

---

## 📢 发版后推广（可选）

### 更新说明
- 在 README.md 中添加 v2.0.0 下载链接
- 更新徽章指向新版本

### 社区通知
- 在项目 Discussions 发布公告
- 关闭已解决的 Issues 并引用此版本

---

## 🎯 快速命令

```powershell
# 一键提交发版
cd "c:\Users\Dick\Documents\VSCode-Job\eh-reader-extension"
git add .
git commit -m "Release v2.0.0 - 正式发行版"
git push origin main
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin v2.0.0
```

---

## 📁 文件位置

- **发布包**: `dist/eh-modern-reader-v2.0.0.zip`
- **发版说明**: `RELEASE_NOTES.md`
- **更新日志**: `CHANGELOG.md`
- **安装指南**: `docs/INSTALL.md`

---

**准备就绪，可以发布了！** 🚀
