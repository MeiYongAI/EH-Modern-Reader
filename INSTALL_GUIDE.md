# 📦 EH Modern Reader v2.3.6 - 安装指南

## 🚀 三种安装方式

### 方式 1️⃣：最简单 - 一键加载脚本（推荐 Windows 用户）

1. **下载项目文件夹**或解压 Release 中的 ZIP 到任意位置
2. **右键点击 `QUICK_LOAD.ps1`** → "使用 PowerShell 运行"
3. Chrome 会自动打开并加载扩展 ✨

> 如果弹出权限提示，选择"是"即可

### 方式 2️⃣：手动解压 + 加载

1. **下载 Release 中的 ZIP 文件**
2. **右键 ZIP** → "提取全部..." → 选择保存位置
3. **打开 Chrome** → 访问 `chrome://extensions/`
4. **启用"开发者模式"**（右上角开关）
5. 点击**"加载未打包的扩展程序"**
6. **选择解压后的文件夹**（包含 `manifest.json` 的文件夹）

### 方式 3️⃣：直接拖放 ZIP（可能需要解压）

> ⚠️ **注意**：直接拖 ZIP 到 Chrome 的兼容性依赖 Chrome 版本
> - 如果遇到路径错误，请使用方式 2 或方式 1

1. **打开 Chrome** → 访问 `chrome://extensions/`
2. 启用"开发者模式"（右上角）
3. **拖动 ZIP 文件**到页面中
4. 如出现错误，改用方式 2

## ✅ 验证安装

安装成功后：

- Chrome 工具栏会显示 📚 图标
- 访问 **E-Hentai 画廊页面**（`/g/` 路径）时，扩展会在右上角显示启动按钮
- 访问 **MPV 页面**（`/mpv/` 路径）时，扩展会自动接管整个页面

## 🎯 快速开始

**MPV 自动启动**
1. 访问任何 MPV 页面：https://e-hentai.org/mpv/123456/
2. 扩展自动接管页面，显示现代读书界面

**Gallery 手动启动**
1. 访问画廊页面：https://e-hentai.org/g/123456/title
2. 点击右上角的"EH Modern Reader"按钮
3. 选择喜欢的阅读模式（单页/横向/纵向等）

## 🔧 故障排查

### 问题：扩展未在工具栏显示
**解决**：
- 确保 manifest.json 在项目根目录
- 检查 `chrome://extensions/` 中是否有加载中的错误信息
- 尝试点击扩展卡片上的"刷新"（🔄）按钮

### 问题：CSS 加载错误
**解决**：
- 使用方式 2（未打包的扩展）而非拖放 ZIP
- 或运行 `QUICK_LOAD.ps1` 脚本

### 问题：Chrome 提示权限错误
**解决**：
- 运行 PowerShell 脚本时选择"是"允许执行
- 或手动在 Windows Terminal 中运行：
  ```powershell
  powershell -ExecutionPolicy Bypass -File QUICK_LOAD.ps1
  ```

## 📂 文件结构

```
eh-modern-reader-v2.3.6/
├── manifest.json          # 扩展配置文件
├── content.js             # 核心读书脚本
├── gallery.js             # 画廊增强脚本
├── background.js          # 后台服务脚本
├── popup.html/js          # 工具栏弹窗
├── options.html/js        # 设置页面
├── welcome.html           # 欢迎页面
├── style/                 # 样式文件
│   ├── reader.css         # 阅读器样式
│   └── gallery.css        # 画廊样式
├── icons/                 # 扩展图标
├── README.md              # 功能说明
└── QUICK_LOAD.ps1         # 快速加载脚本（仅 Windows）
```

## 🌟 新手提示

- **阅读进度自动保存** → 刷新或关闭标签页后仍可续读
- **多种阅读模式** → 右上角扩展菜单可快速切换
- **安全限速** → 不会因为频繁翻页而触发 IP 封禁
- **缩略图同步** → 翻页时缩略图自动定位

## 🆘 需要帮助？

- **GitHub Issues**：https://github.com/MeiYongAI/EH-Modern-Reader/issues
- **完整功能说明**：[RELEASE_NOTES_FULL_v2.3.6.md](RELEASE_NOTES_FULL_v2.3.6.md)
- **更新日志**：[CHANGELOG.md](CHANGELOG.md)

---

**祝你使用愉快！** 📖✨
