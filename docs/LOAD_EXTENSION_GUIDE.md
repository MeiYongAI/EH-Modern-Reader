# ⚠️ 重要提示：请直接从源码目录加载扩展

## 🚫 不要使用 ZIP 包

你遇到的问题是因为：
1. ZIP 解压可能产生嵌套目录
2. 解压路径可能不正确
3. 文件权限可能受限

## ✅ 正确的加载方式

### 步骤 1：移除所有旧扩展
1. 打开 `chrome://extensions/`
2. 找到所有名为 **"EH Modern Reader"** 或相关的扩展
3. 全部点击 **"移除"** 删除

### 步骤 2：直接从源码加载
1. 在 `chrome://extensions/` 页面
2. 确保右上角 **"开发者模式"** 已启用
3. 点击 **"加载已解压的扩展程序"**
4. **直接选择这个目录**（不要解压 ZIP）：
   ```
   C:\Users\Dick\Documents\VSCode-Job\eh-reader-extension
   ```
5. 点击 **"选择文件夹"**

### 验证图标文件存在
运行以下命令验证：
```powershell
Test-Path "C:\Users\Dick\Documents\VSCode-Job\eh-reader-extension\icons\icon16.png"
Test-Path "C:\Users\Dick\Documents\VSCode-Job\eh-reader-extension\icons\icon48.png"
Test-Path "C:\Users\Dick\Documents\VSCode-Job\eh-reader-extension\icons\icon128.png"
```
应该全部返回 `True`

## 📁 正确的目录结构

Chrome 应该加载的目录应该直接包含：
```
eh-reader-extension/
├── manifest.json          ← 这个文件必须在根目录
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── js/
├── style/
└── ... 其他文件
```

## ❌ 错误的目录结构

如果你选择的目录是这样的，会出错：
```
某个文件夹/
└── eh-reader-extension/   ← 不要选这一层！
    ├── manifest.json
    └── icons/
```

## 🎯 快速测试

在 PowerShell 中运行：
```powershell
cd "C:\Users\Dick\Documents\VSCode-Job\eh-reader-extension"
Get-ChildItem manifest.json, icons/icon16.png
```

应该能看到这两个文件。

## 💡 为什么不用 ZIP？

- ✅ **源码加载**：可以实时修改和调试
- ✅ **没有解压问题**：避免路径错误
- ✅ **开发模式**：适合开发和测试
- ❌ **ZIP 打包**：仅用于发布到 Chrome Web Store

---

**请按照上述步骤，直接从源码目录加载扩展！** 🚀
