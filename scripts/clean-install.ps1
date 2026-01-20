# 清理 Chrome 扩展缓存并重新打包

Write-Host "=== EH Modern Reader - Clean Install ===" -ForegroundColor Cyan
Write-Host ""

# 1. 验证图标文件
Write-Host "1. Checking icon files..." -ForegroundColor Yellow
$icons = @("icons/icon16.png", "icons/icon48.png", "icons/icon128.png")
$allExist = $true
foreach ($icon in $icons) {
    if (Test-Path $icon) {
        $size = (Get-Item $icon).Length
        Write-Host "  OK $icon ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  ERROR $icon not found!" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host ""
    Write-Host "Generating icons..." -ForegroundColor Yellow
    python generate_icons.py
}

Write-Host ""
Write-Host "2. Creating clean build..." -ForegroundColor Yellow

# 2. 清理并重新构建
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force
    Write-Host "  Cleaned old dist folder" -ForegroundColor Gray
}

if (Test-Path "temp") {
    Remove-Item "temp" -Recurse -Force
    Write-Host "  Cleaned old temp folder" -ForegroundColor Gray
}

# 3. 创建新的构建
New-Item -ItemType Directory -Path "dist" -Force | Out-Null
New-Item -ItemType Directory -Path "temp" -Force | Out-Null

# 4. 复制文件
Write-Host ""
Write-Host "3. Copying files..." -ForegroundColor Yellow
$files = @(
    "manifest.json",
    "content.js",
    "background.js",
    "popup.html",
    "popup.js",
    "welcome.html",
    "README.md",
    "LICENSE"
)

foreach ($file in $files) {
    Copy-Item $file "temp/" -Force
    Write-Host "  $file" -ForegroundColor Gray
}

# 复制目录
Copy-Item "js" "temp/" -Recurse -Force
Copy-Item "style" "temp/" -Recurse -Force
Copy-Item "icons" "temp/" -Recurse -Force

Write-Host "  js/" -ForegroundColor Gray
Write-Host "  style/" -ForegroundColor Gray
Write-Host "  icons/" -ForegroundColor Gray

# 5. 验证图标在 temp 中
Write-Host ""
Write-Host "4. Verifying icons in temp folder..." -ForegroundColor Yellow
foreach ($icon in $icons) {
    $tempIcon = "temp/$icon"
    if (Test-Path $tempIcon) {
        $size = (Get-Item $tempIcon).Length
        Write-Host "  OK $tempIcon ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  ERROR $tempIcon not found!" -ForegroundColor Red
    }
}

# 6. 创建 ZIP
Write-Host ""
Write-Host "5. Creating ZIP package..." -ForegroundColor Yellow
$zipPath = "dist/eh-modern-reader-clean-install.zip"
Compress-Archive -Path "temp/*" -DestinationPath $zipPath -Force
Write-Host "  Created $zipPath" -ForegroundColor Green

$zipSize = [math]::Round((Get-Item $zipPath).Length / 1KB, 2)
Write-Host "  Size: $zipSize KB" -ForegroundColor Gray

# 7. 清理
Remove-Item "temp" -Recurse -Force

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Clean package ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. In Chrome, go to chrome://extensions/" -ForegroundColor Gray
Write-Host "2. REMOVE the old EH Modern Reader extension" -ForegroundColor Gray
Write-Host "3. Extract '$zipPath'" -ForegroundColor Gray
Write-Host "4. Click 'Load unpacked' and select the extracted folder" -ForegroundColor Gray
Write-Host ""
Write-Host "Or test directly from source:" -ForegroundColor Yellow
Write-Host "  Load unpacked: $PWD" -ForegroundColor Gray
Write-Host ""
