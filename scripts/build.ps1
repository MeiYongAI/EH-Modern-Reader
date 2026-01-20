# EH Modern Reader - Build Script
# 用于打包浏览器扩展的发布文件

# 强制使用 UTF-8 输出，避免控制台乱码（Windows PowerShell 5.1）
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

Write-Host "EH Modern Reader - Build Script" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# 读取 manifest.json 获取版本号
$manifestPath = Join-Path $PSScriptRoot "..\manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = "v$($manifest.version)"

Write-Host "Version: $version`n" -ForegroundColor Magenta

# 创建 dist 目录
$distDir = Join-Path $PSScriptRoot "..\dist"

if (Test-Path $distDir) {
    Write-Host "Clean old build artifacts..." -ForegroundColor Yellow
    Get-ChildItem $distDir -Filter "*.zip" | Remove-Item -Force
}
else {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}
Write-Host "dist folder ready`n" -ForegroundColor Green

# 定义需要打包的文件和文件夹
$includeItems = @(
    "manifest.json",
    "content.js",
    "gallery.js",
    "background.js",
    "popup.html",
    "popup.js",
    "options.html",
    "options.js",
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

Write-Host "Copy files to temp folder..." -ForegroundColor Yellow

# 复制文件
foreach ($item in $includeItems) {
    $sourcePath = Join-Path $rootDir $item
    if (Test-Path $sourcePath) {
        if (Test-Path $sourcePath -PathType Container) {
            Copy-Item -Path $sourcePath -Destination $tempDir -Recurse -Force
            Write-Host "  + $item/" -ForegroundColor Gray
        } else {
            Copy-Item -Path $sourcePath -Destination $tempDir -Force
            Write-Host "  + $item" -ForegroundColor Gray
        }
    }
}

Write-Host "`nCreate release zip..." -ForegroundColor Yellow

# 统一发布包名称
$releaseZip = Join-Path $distDir "eh-modern-reader-$version.zip"
Write-Host "  Zipping $version ..." -ForegroundColor Cyan
Compress-Archive -Path "$tempDir\*" -DestinationPath $releaseZip -Force
Write-Host "  Created: eh-modern-reader-$version.zip" -ForegroundColor Green

# 清理临时目录
Write-Host "`nClean temp files..." -ForegroundColor Yellow
Remove-Item -Path $tempDir -Recurse -Force
Write-Host "Cleaned" -ForegroundColor Green

# 显示构建结果
Write-Host "`nBuild finished" -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor Cyan

Write-Host "Artifacts:" -ForegroundColor Yellow
$zipFile = Get-Item $releaseZip
$size = [math]::Round($zipFile.Length / 1KB, 2)
Write-Host "  * $($zipFile.Name) - ${size} KB" -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Test install the unpacked extension" -ForegroundColor White
Write-Host "  2. Create GitHub Release and upload the ZIP" -ForegroundColor White
Write-Host "  3. Paste release notes from RELEASE_NOTES.md" -ForegroundColor White

Write-Host "`nBuild complete!" -ForegroundColor Cyan

