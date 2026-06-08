# Gallery Reader - Create GitHub Release Script

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

Write-Host "Gallery Reader - Create Release" -ForegroundColor Cyan
Write-Host "==============================`n" -ForegroundColor Cyan

$rootDir = Join-Path $PSScriptRoot ".."
$manifestPath = Join-Path $rootDir "manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
$tag = "v$version"

$distDir = Join-Path $rootDir "dist"
$zipName = "gallery-reader-$tag.zip"
$zipPath = Join-Path $distDir $zipName

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Host "GitHub CLI (gh) was not found." -ForegroundColor Yellow
  Write-Host "Install it with: winget install GitHub.cli" -ForegroundColor Yellow
  Write-Host "Then run: gh auth login --hostname github.com --web --git-protocol https" -ForegroundColor Yellow
  exit 1
}

gh auth status --hostname github.com | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub CLI is installed but not authenticated." -ForegroundColor Yellow
  Write-Host "Run: gh auth login --hostname github.com --web --git-protocol https" -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path $zipPath)) {
  Write-Host "Build artifact not found, running build first..." -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot "build.ps1") | Out-Host
}

if (-not (Test-Path $zipPath)) {
  Write-Host "Build artifact still not found: $zipName" -ForegroundColor Red
  exit 1
}

$notesFile = New-TemporaryFile
@"
Gallery Reader $tag

- Fixed hitomi.la full-image CDN routing after the latest gg.js route change.
- Limited hitomi.la full-image candidates to the current official AVIF/WebP URLs.
- Reduced eager full-image loading in hitomi.la continuous reading modes and throttled full-image loads in sequence.
- Kept thumbnails on official hitomi.la small-thumbnail URLs with automatic atn / btn fallback.

See README.md for the bilingual changelog.
"@ | Set-Content -Path $notesFile -Encoding UTF8

Push-Location $rootDir

$exists = $false
gh release view $tag 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  $exists = $true
}

if ($exists) {
  Write-Host "Release $tag already exists; uploading asset..." -ForegroundColor Yellow
  gh release delete-asset $tag $zipName -y 2>$null | Out-Null
  gh release upload $tag $zipPath --clobber | Out-Host
  Write-Host "Release asset updated: $zipName" -ForegroundColor Green
} else {
  Write-Host "Creating Release $tag ..." -ForegroundColor Yellow
  gh release create $tag $zipPath -F $notesFile -t "Gallery Reader $tag" --latest | Out-Host
  Write-Host "Release created: $tag" -ForegroundColor Green
}

Pop-Location

Write-Host "`nDone." -ForegroundColor Cyan
