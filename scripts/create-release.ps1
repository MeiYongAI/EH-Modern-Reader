# Modern Gallery Reader - Create GitHub Release Script

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

Write-Host "Modern Gallery Reader - Create Release" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

$rootDir = Join-Path $PSScriptRoot ".."
$manifestPath = Join-Path $rootDir "manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
$tag = "v$version"

$distDir = Join-Path $rootDir "dist"
$zipName = "modern-gallery-reader-$tag.zip"
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
Modern Gallery Reader $tag

- Renamed the extension to Modern Gallery Reader.
- Added Chinese/English UI through Chrome i18n.
- Fixed hitomi.la image CDN routing.
- Switched image loading overlay to real network progress.

See README.md for the bilingual changelog.
"@ | Set-Content -Path $notesFile -Encoding UTF8

Push-Location $rootDir

$exists = $false
try {
  gh release view $tag | Out-Null
  $exists = $true
} catch {}

if ($exists) {
  Write-Host "Release $tag already exists; uploading asset..." -ForegroundColor Yellow
  try { gh release delete-asset $tag $zipName -y | Out-Null } catch {}
  gh release upload $tag $zipPath --clobber | Out-Host
  Write-Host "Release asset updated: $zipName" -ForegroundColor Green
} else {
  Write-Host "Creating Release $tag ..." -ForegroundColor Yellow
  gh release create $tag $zipPath -F $notesFile -t "Modern Gallery Reader $tag" --latest | Out-Host
  Write-Host "Release created: $tag" -ForegroundColor Green
}

Pop-Location

Write-Host "`nDone." -ForegroundColor Cyan
