# 构建和工具脚本

此目录包含用于扩展开发、构建和部署的 PowerShell 脚本。

## 脚本说明

### build.ps1
打包扩展为发布版本 zip 文件。

**使用**:
```powershell
.\scripts\build.ps1
```

生成文件：`dist/eh-modern-reader-vX.X.X.zip`

---

### generate-icons.ps1
使用 Python 或 Node.js 生成不同尺寸的扩展图标。

**使用**:
```powershell
.\scripts\generate-icons.ps1
```

---

### clean-install.ps1
清理并重新安装扩展（用于测试）。

---

### sync-changes.ps1
同步更改到测试目录。

---

### verify-extension.ps1
验证扩展文件完整性和配置正确性。

---

## 注意事项

- 所有脚本需要在仓库根目录执行
- 某些脚本可能需要额外依赖（Python、Node.js 等）
