# EH Modern Reader - Build Script
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

Write-Host "EH Modern Reader - Build Script" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

$manifestPath = Join-Path $PSScriptRoot "..\manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = "v$($manifest.version)"

Write-Host "Version: $version`n" -ForegroundColor Magenta

$distDir = Join-Path $PSScriptRoot "..\dist"
if (Test-Path $distDir) {
    Write-Host "Clean old build artifacts..." -ForegroundColor Yellow
    Get-ChildItem $distDir -Filter "*.zip" | Remove-Item -Force
} else {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}
Write-Host "dist folder ready`n" -ForegroundColor Green

$includeItems = @("manifest.json","content.js","gallery.js","background.js","popup.html","popup.js","options.html","options.js","welcome.html","README.md","LICENSE","CHANGELOG.md","style","icons")

$rootDir = Join-Path $PSScriptRoot ".."
$tempDir = Join-Path $rootDir "temp_build"
if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "Copy files to temp folder..." -ForegroundColor Yellow

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

$releaseZip = Join-Path $distDir "eh-modern-reader-$version.zip"
Write-Host "  Zipping $version ..." -ForegroundColor Cyan

# 先使用标准方法创建 ZIP
Compress-Archive -Path "$tempDir\*" -DestinationPath $releaseZip -Force

# 修复 ZIP 内部路径：将反斜杠替换为正斜杠（Chrome 要求）
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$tempZip = Join-Path $distDir "temp.zip"
$sourceZip = [System.IO.Compression.ZipFile]::Open($releaseZip, [System.IO.Compression.ZipArchiveMode]::Read)
$targetZip = [System.IO.Compression.ZipFile]::Open($tempZip, [System.IO.Compression.ZipArchiveMode]::Create)

try {
    foreach ($entry in $sourceZip.Entries) {
        $newName = $entry.FullName -replace '\\', '/'
        $newEntry = $targetZip.CreateEntry($newName)
        $newEntry.LastWriteTime = $entry.LastWriteTime
        
        $sourceStream = $entry.Open()
        $targetStream = $newEntry.Open()
        $sourceStream.CopyTo($targetStream)
        $sourceStream.Close()
        $targetStream.Close()
    }
} finally {
    $sourceZip.Dispose()
    $targetZip.Dispose()
}

Remove-Item $releaseZip -Force
Move-Item $tempZip $releaseZip

Write-Host "  Created: eh-modern-reader-$version.zip (with forward slashes)" -ForegroundColor Green

Write-Host "`nClean temp files..." -ForegroundColor Yellow
Remove-Item -Path $tempDir -Recurse -Force
Write-Host "Cleaned" -ForegroundColor Green

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
