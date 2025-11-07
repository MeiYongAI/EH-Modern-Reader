# EH Modern Reader - Build Script
# 用于打包浏览器扩展的发布文件

Write-Host "🚀 EH Modern Reader - Build Script" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# 创建 dist 目录
$distDir = "dist"
$version = "v1.0.0"

if (Test-Path $distDir) {
    Write-Host "🗑️  清理旧的构建文件..." -ForegroundColor Yellow
    Remove-Item -Path $distDir -Recurse -Force
}

New-Item -ItemType Directory -Path $distDir -Force | Out-Null
Write-Host "✅ 创建 dist 目录`n" -ForegroundColor Green

# 定义需要打包的文件和文件夹
$includeItems = @(
    "manifest.json",
    "content.js",
    "background.js",
    "popup.html",
    "popup.js",
    "welcome.html",
    "README.md",
    "LICENSE",
    "js",
    "style",
    "icons"
)

# 创建临时构建目录
$tempDir = "temp_build"
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "📦 复制文件到临时目录..." -ForegroundColor Yellow

# 复制文件
foreach ($item in $includeItems) {
    if (Test-Path $item) {
        if (Test-Path $item -PathType Container) {
            Copy-Item -Path $item -Destination $tempDir -Recurse -Force
            Write-Host "  ✓ $item/" -ForegroundColor Gray
        } else {
            Copy-Item -Path $item -Destination $tempDir -Force
            Write-Host "  ✓ $item" -ForegroundColor Gray
        }
    }
}

Write-Host "`n📦 创建发布包..." -ForegroundColor Yellow

# 1. Chrome/Edge ZIP 包
$chromeZip = "$distDir/eh-modern-reader-$version-chrome.zip"
Write-Host "  🌐 打包 Chrome/Edge 版本..." -ForegroundColor Cyan
Compress-Archive -Path "$tempDir\*" -DestinationPath $chromeZip -Force
Write-Host "  ✅ 已创建: $chromeZip" -ForegroundColor Green

# 2. Firefox ZIP 包 (需要修改 manifest.json)
Write-Host "  🦊 打包 Firefox 版本..." -ForegroundColor Cyan

# 读取 manifest.json 并修改 background
$manifestPath = "$tempDir\manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

# Firefox 使用不同的 background 配置
if ($manifest.PSObject.Properties.Name -contains "background") {
    $manifest.background = @{
        "scripts" = @("background.js")
    }
}

# 保存修改后的 manifest
$manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8

$firefoxZip = "$distDir/eh-modern-reader-$version-firefox.zip"
Compress-Archive -Path "$tempDir\*" -DestinationPath $firefoxZip -Force
Write-Host "  ✅ 已创建: $firefoxZip" -ForegroundColor Green

# 3. 源代码包 (包含所有文档)
Write-Host "  📄 打包源代码..." -ForegroundColor Cyan

# 恢复原始 manifest
Copy-Item -Path "manifest.json" -Destination $tempDir -Force

# 添加文档文件
$docFiles = @(
    "QUICK_START.md",
    "INSTALL.md",
    "DEVELOPMENT.md",
    "PROJECT_SUMMARY.md",
    "GITHUB_GUIDE.md",
    "DELIVERY_CHECKLIST.md",
    "icon-generator.html"
)

foreach ($doc in $docFiles) {
    if (Test-Path $doc) {
        Copy-Item -Path $doc -Destination $tempDir -Force
    }
}

$sourceZip = "$distDir/eh-modern-reader-$version-source.zip"
Compress-Archive -Path "$tempDir\*" -DestinationPath $sourceZip -Force
Write-Host "  ✅ 已创建: $sourceZip" -ForegroundColor Green

# 清理临时目录
Write-Host "`n🧹 清理临时文件..." -ForegroundColor Yellow
Remove-Item -Path $tempDir -Recurse -Force
Write-Host "✅ 清理完成" -ForegroundColor Green

# 显示构建结果
Write-Host "`n🎉 构建完成！" -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor Cyan

Write-Host "📦 发布文件列表:" -ForegroundColor Yellow
Get-ChildItem -Path $distDir | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "  • $($_.Name) - ${size} KB" -ForegroundColor White
}

Write-Host "`n📝 下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 在 GitHub 上创建新仓库: eh-modern-reader" -ForegroundColor Gray
Write-Host "  2. 推送代码: git push -u origin main" -ForegroundColor Gray
Write-Host "  3. 创建 Release 并上传 dist/ 中的文件" -ForegroundColor Gray
Write-Host "  4. Chrome: 上传 *-chrome.zip 到 Chrome Web Store" -ForegroundColor Gray
Write-Host "  5. Firefox: 上传 *-firefox.zip 到 Firefox Add-ons" -ForegroundColor Gray

Write-Host "`n✨ 祝你发布顺利！" -ForegroundColor Cyan
