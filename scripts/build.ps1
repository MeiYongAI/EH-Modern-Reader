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

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $releaseZip) { Remove-Item $releaseZip -Force }

$zip = [System.IO.Compression.ZipFile]::Open($releaseZip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -Path $tempDir -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Substring($tempDir.Length + 1)
        $entryName = $relativePath -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName) | Out-Null
    }
} finally {
    $zip.Dispose()
}

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
