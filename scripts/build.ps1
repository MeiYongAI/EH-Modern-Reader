# EH Modern Reader - Build Script
# 用于打包浏览器扩展的发布文件

Write-Host "🚀 EH Modern Reader - Build Script" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# 读取 manifest.json 获取版本号
$manifestPath = Join-Path $PSScriptRoot "..\manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = "v$($manifest.version)"

Write-Host "📌 版本: $version`n" -ForegroundColor Magenta

# 创建 dist 目录
$distDir = Join-Path $PSScriptRoot "..\dist"

if (Test-Path $distDir) {
    Write-Host "🗑️  清理旧的构建文件..." -ForegroundColor Yellow
    Get-ChildItem $distDir -Filter "*.zip" | Remove-Item -Force
}
else {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}
Write-Host "✅ dist 目录准备完成`n" -ForegroundColor Green

# 定义需要打包的文件和文件夹
$includeItems = @(
    "manifest.json",
    "content.js",
    "gallery.js",
    "background.js",
    "popup.html",
    "popup.js",
    "welcome.html",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "style",
    "icons"
)

# 创建临时构建目录
$rootDir = Join-Path $PSScriptRoot ".."
$tempDir = Join-Path $rootDir "temp_build"
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "📦 复制文件到临时目录..." -ForegroundColor Yellow

# 复制文件
foreach ($item in $includeItems) {
    $sourcePath = Join-Path $rootDir $item
    if (Test-Path $sourcePath) {
        if (Test-Path $sourcePath -PathType Container) {
            Copy-Item -Path $sourcePath -Destination $tempDir -Recurse -Force
            Write-Host "  ✓ $item/" -ForegroundColor Gray
        } else {
            Copy-Item -Path $sourcePath -Destination $tempDir -Force
            Write-Host "  ✓ $item" -ForegroundColor Gray
        }
    }
}

Write-Host "`n📦 创建发布包..." -ForegroundColor Yellow

# 统一发布包名称
$releaseZip = Join-Path $distDir "eh-modern-reader-$version.zip"
Write-Host "  📦 打包 $version 版本..." -ForegroundColor Cyan
Compress-Archive -Path "$tempDir\*" -DestinationPath $releaseZip -Force
Write-Host "  ✅ 已创建: eh-modern-reader-$version.zip" -ForegroundColor Green

# 清理临时目录
Write-Host "`n🧹 清理临时文件..." -ForegroundColor Yellow
Remove-Item -Path $tempDir -Recurse -Force
Write-Host "✅ 清理完成" -ForegroundColor Green

# 显示构建结果
Write-Host "`n🎉 构建完成！" -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor Cyan

Write-Host "📦 发布文件:" -ForegroundColor Yellow
$zipFile = Get-Item $releaseZip
$size = [math]::Round($zipFile.Length / 1KB, 2)
Write-Host "  • $($zipFile.Name) - ${size} KB" -ForegroundColor White

Write-Host "`n📝 下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 测试安装扩展包" -ForegroundColor White
Write-Host "  2. 创建 GitHub Release" -ForegroundColor White
Write-Host "  3. 上传发布包并添加 Release Notes" -ForegroundColor White

Write-Host "`n✨ Build complete!" -ForegroundColor Cyan

