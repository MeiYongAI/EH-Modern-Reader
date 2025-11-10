# 验证扩展目录完整性

Write-Host "=== EH Modern Reader - Directory Verification ===" -ForegroundColor Cyan
Write-Host ""

$basePath = $PWD.Path
Write-Host "Checking directory: $basePath" -ForegroundColor Yellow
Write-Host ""

# 检查必需文件
$requiredFiles = @(
    "manifest.json",
    "content.js",
    "gallery.js",
    "background.js",
    "popup.html",
    "popup.js",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
    "style/reader.css",
    "welcome.html"
)

$allGood = $true

Write-Host "Checking required files:" -ForegroundColor Yellow
foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $basePath $file
    if (Test-Path $fullPath) {
        $size = (Get-Item $fullPath).Length
        Write-Host "  [OK] $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $file" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

if ($allGood) {
    Write-Host "=================================" -ForegroundColor Green
    Write-Host "All files present!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "This directory is ready to load in Chrome:" -ForegroundColor Yellow
    Write-Host "  $basePath" -ForegroundColor White
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor Yellow
    Write-Host "  1. Open chrome://extensions/" -ForegroundColor Gray
    Write-Host "  2. Enable 'Developer mode'" -ForegroundColor Gray
    Write-Host "  3. Click 'Load unpacked'" -ForegroundColor Gray
    Write-Host "  4. Select this directory: $basePath" -ForegroundColor Gray
} else {
    Write-Host "=================================" -ForegroundColor Red
    Write-Host "ERROR: Missing required files!" -ForegroundColor Red
    Write-Host "=================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure you are in the correct directory." -ForegroundColor Yellow
}

Write-Host ""
